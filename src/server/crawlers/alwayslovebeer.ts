import type { CrawledItem } from "./types";
import { extractDateFromText } from "../utils/dateExtractor";

const SOURCE_ID = "alwayslovebeer";
const BASE_URL = "https://www.alwayslovebeer.com/latest-beer-event-infomation/";

/**
 * Crawler for alwayslovebeer.com event page
 * This site provides regularly updated beer event information
 */
export async function crawlAlwaysLoveBeer(): Promise<CrawledItem[]> {
  const items: CrawledItem[] = [];

  try {
    const res = await fetch(BASE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BeerEventBot/1.0; +https://github.com/Makoto041/beer-line-watcher)",
      },
    });

    if (!res.ok) {
      console.error("alwayslovebeer.com fetch error", res.status);
      return items;
    }

    const html = await res.text();

    // Extract h3 headings with event info
    // Pattern: 【date】prefecture：event name or similar
    // Example: 【1/17[土]】静岡：貯蔵クラフトビール開封フェス
    const h3Regex = /<h3[^>]*>([^<]+)<\/h3>/gi;
    let match: RegExpExecArray | null;

    // Track position to find associated links
    const headings: Array<{ text: string; index: number }> = [];
    while ((match = h3Regex.exec(html)) !== null) {
      const text = match[1];
      if (text) {
        headings.push({ text: text.trim(), index: match.index });
      }
    }

    // For each heading, find the next link
    const linkRegex = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>/gi;
    const links: Array<{ url: string; index: number }> = [];
    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1];
      if (!url) continue;
      // Skip social media and internal links
      if (
        url.includes("twitter.com") ||
        url.includes("facebook.com") ||
        url.includes("instagram.com") ||
        url.includes("alwayslovebeer.com")
      ) {
        continue;
      }
      links.push({ url, index: match.index });
    }

    // Match headings with their associated links
    for (const heading of headings) {
      // Check if heading looks like an event
      const eventPattern = /【.*】|^\d{1,2}\/\d{1,2}|月.*日|フェス|祭|イベント|ビール/;
      if (!eventPattern.test(heading.text)) continue;

      // Find the closest link after this heading
      const nextLink = links.find(
        (l) => l.index > heading.index && l.index < heading.index + 2000
      );

      if (nextLink) {
        // Clean up the title
        let title = heading.text
          .replace(/\s+/g, " ")
          .replace(/^【[^】]*】\s*/, "")
          .trim();

        // If title is too short, skip
        if (title.length < 5) continue;

        // Extract date from the original heading
        const eventDate = extractDateFromText(heading.text);

        items.push({
          externalId: nextLink.url,
          title: title,
          url: nextLink.url,
          sourceId: SOURCE_ID,
          eventDate: eventDate || undefined,
        });
      }
    }

    // Also extract from structured article links
    const articleRegex =
      /<article[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([^<]+)<\/h[23]>/gi;
    while ((match = articleRegex.exec(html)) !== null) {
      const url = match[1];
      const titleRaw = match[2];

      if (!url || !titleRaw) continue;
      const title = titleRaw.trim();
      if (title.length < 5) continue;
      if (!url.startsWith("http")) continue;
      if (items.some((i) => i.externalId === url)) continue;

      const eventDate = extractDateFromText(title);

      items.push({
        externalId: url,
        title: title,
        url: url,
        sourceId: SOURCE_ID,
        eventDate: eventDate || undefined,
      });
    }
  } catch (error) {
    console.error("alwayslovebeer.com crawl error:", error);
  }

  return dedupe(items);
}

function dedupe(items: CrawledItem[]): CrawledItem[] {
  const set = new Set<string>();
  return items.filter((i) => {
    if (set.has(i.externalId)) return false;
    set.add(i.externalId);
    return true;
  });
}
