import type { CrawledItem } from "./types";

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

      // ビールに絞るならコメントアウト解除
      // if (!/ビール|beer|クラフト/i.test(title)) continue;

      items.push({
        externalId: absolute,
        title,
        url: absolute,
        sourceId: SOURCE_ID,
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
