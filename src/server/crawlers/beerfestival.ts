import type { CrawledItem } from "./types";
import { extractDateFromText } from "../utils/dateExtractor";
import { fetchOgImagesForUrls } from "../utils/ogImageFetcher";

const SOURCE_ID = "beerfestival-info";
const BASE_URL = "https://www.beerfestival.info/";

/**
 * Parse a date range string from the event-schedule widget.
 * Examples: "6月13日（土）〜6月14日（日）", "9月4日（金）〜9月6日（日）", "6月19日（金）".
 * `year` comes from the section's month heading (e.g. "2026年11月のイベント").
 */
function parseDateRange(
  text: string,
  year: number | null
): { start?: Date; end?: Date } {
  const parts = text
    .split(/[〜～~]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const startStr = parts[0];
  let endStr = parts[1];

  // End sometimes omits the month (e.g. "6月13日〜14日"); borrow it from start.
  if (endStr && !/月/.test(endStr)) {
    const mm = startStr?.match(/(\d{1,2})月/);
    if (mm) endStr = `${mm[1]}月${endStr}`;
  }

  const withYear = (s: string) => (year ? `${year}年${s}` : s);
  const start = startStr ? extractDateFromText(withYear(startStr)) : null;
  let end = endStr ? extractDateFromText(withYear(endStr)) : null;

  // A range that ends before it starts crossed into the next year.
  if (start && end && end < start) {
    end = new Date(end.getFullYear() + 1, end.getMonth(), end.getDate());
  }

  return { start: start || undefined, end: end || undefined };
}

/**
 * Crawler for beerfestival.info
 * The site (東京ビールフェス＆イベント情報) lists upcoming Tokyo-area beer
 * events in a WordPress "event schedule" widget, grouped by month:
 *
 *   <h3 class="ftn-es-month-heading">2026年11月のイベント</h3>
 *   <li class="ftn-es-item">
 *     <span class="ftn-es-date">11月6日（金）〜11月7日（土）</span>
 *     <a class="ftn-es-name" href="...">ウイスキーフェスティバル2026 in 東京</a>
 *   </li>
 */
export async function crawlBeerfestival(): Promise<CrawledItem[]> {
  const items: CrawledItem[] = [];

  try {
    const res = await fetch(BASE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BeerEventBot/1.0; +https://github.com/Makoto041/beer-line-watcher)",
      },
    });

    if (!res.ok) {
      console.error("beerfestival.info fetch error", res.status);
      return items;
    }

    const html = await res.text();

    // Month headings give the year context for the items that follow them.
    const headings: Array<{ index: number; year: number }> = [];
    const headingRegex =
      /<h3[^>]*class="ftn-es-month-heading"[^>]*>(\d{4})年(\d{1,2})月/gi;
    let hMatch: RegExpExecArray | null;
    while ((hMatch = headingRegex.exec(html)) !== null) {
      headings.push({ index: hMatch.index, year: parseInt(hMatch[1]!) });
    }
    const yearForIndex = (idx: number): number | null => {
      let year: number | null = null;
      for (const h of headings) {
        if (h.index < idx) year = h.year;
        else break;
      }
      return year;
    };

    // Each event item: date span + named link.
    const itemRegex =
      /<li[^>]*class="ftn-es-item"[\s\S]*?<span[^>]*class="ftn-es-date"[^>]*>([^<]+)<\/span>\s*<a[^>]*class="ftn-es-name"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(html)) !== null) {
      const dateText = match[1]!.trim();
      const url = match[2]!.trim();
      const title = match[3]!.trim();

      if (!url || url.includes("javascript:") || title.length < 3) continue;

      const absoluteUrl = url.startsWith("http")
        ? url
        : new URL(url, BASE_URL).toString();

      const { start, end } = parseDateRange(dateText, yearForIndex(match.index));

      items.push({
        externalId: absoluteUrl,
        title,
        url: absoluteUrl,
        sourceId: SOURCE_ID,
        eventDate: start,
        eventEndDate: end,
      });
    }

    if (items.length === 0) {
      console.warn(
        "beerfestival.info: parsed 0 events — site markup may have changed"
      );
    }
  } catch (error) {
    console.error("beerfestival.info crawl error:", error);
  }

  const dedupedItems = dedupe(items);

  // 詳細ページからOGP画像を取得
  try {
    const urls = dedupedItems.map((item) => item.url);
    const ogImages = await fetchOgImagesForUrls(urls, 3);

    for (const item of dedupedItems) {
      const ogImage = ogImages.get(item.url);
      if (ogImage) {
        item.imageUrl = ogImage;
      }
    }
  } catch (error) {
    console.error("beerfestival.info OG image fetch error:", error);
  }

  return dedupedItems;
}

function dedupe(items: CrawledItem[]): CrawledItem[] {
  const set = new Set<string>();
  return items.filter((i) => {
    if (set.has(i.externalId)) return false;
    set.add(i.externalId);
    return true;
  });
}
