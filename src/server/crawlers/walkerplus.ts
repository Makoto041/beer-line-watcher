import type { CrawledItem } from "./types";
import { extractDateFromText } from "../utils/dateExtractor";

const SOURCE_ID = "walkerplus-liquor-kanto";
const BASE = "https://www.walkerplus.com/search/liquor/ar0300/";

export async function crawlWalkerplus(): Promise<CrawledItem[]> {
  const maxPages = 3;
  const items: CrawledItem[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? BASE : `${BASE}${page}.html`;
    const res = await fetch(url);
    if (!res.ok) {
      if (page === 1) console.error("walkerplus fetch error", url, res.status);
      break;
    }

    const html = await res.text();
    const linkRegex = /<a[^>]+href="(\/event\/[^"]+)"[^>]*>([^<]{4,160})<\/a>/g;
    let m: RegExpExecArray | null;

    while ((m = linkRegex.exec(html)) !== null) {
      const href = m[1];
      const titleRaw = m[2];

      if (!href || !titleRaw) continue;

      const title = titleRaw.trim();
      const absolute = new URL(href, "https://www.walkerplus.com").toString();

      // イベント関連のキーワードでフィルタリング（厳しめ）
      const eventKeywords = /フェス|祭|イベント|開催|ビアガーデン|マルシェ|beer\s*festival|beer\s*event/i;
      const excludeKeywords = /コラム|まとめ|ランキング|特集|取材|インタビュー|レビュー|紹介|おすすめ|とは|ニュース/i;

      if (!eventKeywords.test(title)) continue;
      if (excludeKeywords.test(title)) continue;

      // Try to extract event date from title
      const eventDate = extractDateFromText(title);

      items.push({
        externalId: absolute,
        title,
        url: absolute,
        sourceId: SOURCE_ID,
        eventDate: eventDate || undefined,
      });
    }
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
