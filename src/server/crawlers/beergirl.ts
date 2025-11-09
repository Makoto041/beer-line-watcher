import type { CrawledItem } from "./types";
import { extractDateFromText } from "../utils/dateExtractor";

const SOURCE_ID = "beergirl-calendar";
const BASE_URL = "https://beergirl.net/beer-event-matome-2017_e/";

export async function crawlBeergirl(): Promise<CrawledItem[]> {
  const res = await fetch(BASE_URL);
  if (!res.ok) {
    console.error("beergirl fetch error", res.status);
    return [];
  }

  const html = await res.text();
  const items: CrawledItem[] = [];

  const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]{4,120})<\/a>/g;
  let m: RegExpExecArray | null;

  while ((m = linkRegex.exec(html)) !== null) {
    const hrefRaw = m[1];
    const titleRaw = m[2];

    if (!hrefRaw || !titleRaw) continue;

    const title = titleRaw.trim();

    if (!hrefRaw.includes("beergirl.net")) continue;

    // イベント関連のキーワードでフィルタリング（厳しめ）
    const eventKeywords = /フェス|祭|イベント|開催|ビアガーデン|beer\s*festival|beer\s*event/i;
    const excludeKeywords = /コラム|まとめ|ランキング|特集|取材|インタビュー|レビュー|紹介|おすすめ|とは/i;

    if (!eventKeywords.test(title)) continue;
    if (excludeKeywords.test(title)) continue;

    const url = hrefRaw.startsWith("http")
      ? hrefRaw
      : new URL(hrefRaw, BASE_URL).toString();

    const externalId = url;

    // Try to extract event date from title
    const eventDate = extractDateFromText(title);

    items.push({
      externalId,
      title,
      url,
      sourceId: SOURCE_ID,
      eventDate: eventDate || undefined,
    });
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
