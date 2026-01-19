import type { CrawledItem } from "./types";
import { extractDateFromText } from "../utils/dateExtractor";
import { fetchOgImagesForUrls } from "../utils/ogImageFetcher";

const SOURCE_ID = "beerfestival-info";
const BASE_URL = "https://www.beerfestival.info/";

/**
 * Crawler for beerfestival.info
 * This site lists beer festivals and events across Japan
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

    // Extract event links with titles and dates
    // Pattern: dates followed by event link
    // Example: 1月28日（水）〜2月1日（日） <a href="...">Event Name</a>
    const eventRegex =
      /(\d{1,2}月\d{1,2}日[^<]*?)<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = eventRegex.exec(html)) !== null) {
      const dateTextRaw = match[1];
      const url = match[2];
      const titleRaw = match[3];

      // Skip navigation links and non-event links
      if (!dateTextRaw || !url || !titleRaw) continue;

      const dateText = dateTextRaw.trim();
      const title = titleRaw.trim();

      if (
        url.includes("#") ||
        url.includes("javascript:") ||
        title.length < 5
      ) {
        continue;
      }

      // Skip archive links (year pages)
      if (/^\d{4}$/.test(title)) continue;

      // Skip city/region navigation links
      if (/^(東京|大阪|名古屋|福岡|札幌|横浜|神戸|京都|全国)$/.test(title))
        continue;

      // Build absolute URL
      const absoluteUrl = url.startsWith("http")
        ? url
        : new URL(url, BASE_URL).toString();

      // Extract event date
      const eventDate = extractDateFromText(dateText) || extractDateFromText(title);

      items.push({
        externalId: absoluteUrl,
        title: title,
        url: absoluteUrl,
        sourceId: SOURCE_ID,
        eventDate: eventDate || undefined,
      });
    }

    // Also try to match simple list items without date prefix
    const simpleLinkRegex =
      /<li[^>]*><a[^>]+href="([^"]+)"[^>]*>([^<]{10,100})<\/a><\/li>/gi;
    while ((match = simpleLinkRegex.exec(html)) !== null) {
      const url = match[1];
      const titleRaw = match[2];

      if (!url || !titleRaw) continue;
      const title = titleRaw.trim();

      if (
        url.includes("#") ||
        url.includes("javascript:")
      ) {
        continue;
      }

      // Skip if already added
      const absoluteUrl = url.startsWith("http")
        ? url
        : new URL(url, BASE_URL).toString();

      if (items.some((i) => i.externalId === absoluteUrl)) continue;

      // Check for event-related keywords
      const eventKeywords =
        /フェス|祭|イベント|開催|ビアガーデン|マルシェ|フェア|オクトーバー|beer|fest/i;
      if (!eventKeywords.test(title)) continue;

      const eventDate = extractDateFromText(title);

      items.push({
        externalId: absoluteUrl,
        title: title,
        url: absoluteUrl,
        sourceId: SOURCE_ID,
        eventDate: eventDate || undefined,
      });
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
