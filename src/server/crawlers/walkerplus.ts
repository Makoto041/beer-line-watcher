import type { CrawledItem } from "./types";
import { extractDateFromText } from "../utils/dateExtractor";

const SOURCE_ID = "walkerplus-liquor-kanto";
const BASE = "https://www.walkerplus.com/search/liquor/ar0300/";

// イベントIDから画像URLを抽出するためのマップ
type EventImageMap = Map<string, string>;

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

    // 画像URLを抽出（イベントIDをキーとして）
    const imageMap = extractImageMap(html);

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

      // イベントIDから画像URLを取得
      const eventIdMatch = href.match(/\/event\/([^/]+)/);
      const eventId = eventIdMatch?.[1];
      const imageUrl = eventId ? imageMap.get(eventId) : undefined;

      items.push({
        externalId: absolute,
        title,
        url: absolute,
        sourceId: SOURCE_ID,
        imageUrl,
        eventDate: eventDate || undefined,
      });
    }
  }

  return dedupe(items);
}

/**
 * HTMLから画像URLをイベントIDごとに抽出
 * パターン: /event/ar0313e579596/ と ms-cache.walkerplus.com/.../579596.jpg
 */
function extractImageMap(html: string): EventImageMap {
  const map: EventImageMap = new Map();

  // 画像URLパターン: ms-cache.walkerplus.com/walkertouch/wtd/event/XX/l/XXXXXX.jpg または XXXXXX_X.jpg
  const imgRegex = /<img[^>]+src="([^"]*ms-cache\.walkerplus\.com[^"]+\.jpg)"[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(html)) !== null) {
    const imgSrc = match[1];
    if (!imgSrc) continue;

    // 画像URLからイベント番号を抽出（例: 579596.jpg または 171125_6.jpg）
    const imgIdMatch = imgSrc.match(/\/l\/(\d+)(?:_\d+)?\.jpg/);
    if (imgIdMatch?.[1]) {
      const imgId = imgIdMatch[1];
      // イベントリンクパターン: /event/ar0313e579596/
      // ページ内でこのIDを持つイベントリンクを探す
      const eventLinkRegex = new RegExp(`/event/[^/]*e${imgId}[^"]*`, 'i');
      const eventLinkMatch = html.match(eventLinkRegex);
      if (eventLinkMatch) {
        const eventPath = eventLinkMatch[0];
        const eventIdMatch = eventPath.match(/\/event\/([^/]+)/);
        if (eventIdMatch?.[1]) {
          // プロトコルを追加
          const fullImgUrl = imgSrc.startsWith('//') ? `https:${imgSrc}` : imgSrc;
          map.set(eventIdMatch[1], fullImgUrl);
        }
      }
    }
  }

  return map;
}

function dedupe(items: CrawledItem[]): CrawledItem[] {
  const set = new Set<string>();
  return items.filter((i) => {
    if (set.has(i.externalId)) return false;
    set.add(i.externalId);
    return true;
  });
}
