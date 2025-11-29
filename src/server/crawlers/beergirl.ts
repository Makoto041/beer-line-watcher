import type { CrawledItem } from "./types";

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
    if (!/beer|ビール|イベント|フェス/i.test(title)) continue;

    const url = hrefRaw.startsWith("http")
      ? hrefRaw
      : new URL(hrefRaw, BASE_URL).toString();

    const externalId = url;
    items.push({
      externalId,
      title,
      url,
      sourceId: SOURCE_ID,
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
