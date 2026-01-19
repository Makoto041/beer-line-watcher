/**
 * イベント詳細ページからOGP画像を取得するユーティリティ
 */

const USER_AGENT =
  "Mozilla/5.0 (compatible; BeerEventBot/1.0; +https://github.com/Makoto041/beer-line-watcher)";

/**
 * URLからOGP画像を取得
 * @param url イベント詳細ページのURL
 * @returns OGP画像URL（取得できない場合はundefined）
 */
export async function fetchOgImage(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return undefined;

    const html = await res.text();

    // og:image メタタグを抽出
    const ogImageMatch = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    ) || html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
    );

    if (ogImageMatch?.[1]) {
      const imageUrl = ogImageMatch[1];
      // 相対URLを絶対URLに変換
      if (imageUrl.startsWith('//')) {
        return `https:${imageUrl}`;
      }
      if (imageUrl.startsWith('/')) {
        const origin = new URL(url).origin;
        return `${origin}${imageUrl}`;
      }
      return imageUrl;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * 複数のイベントURLからOGP画像を一括取得
 * レート制限を考慮して並列数を制限
 */
export async function fetchOgImagesForUrls(
  urls: string[],
  concurrency = 3
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // 並列数を制限して実行
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const promises = batch.map(async (url) => {
      const imageUrl = await fetchOgImage(url);
      if (imageUrl) {
        results.set(url, imageUrl);
      }
    });
    await Promise.all(promises);

    // バッチ間で少し待機（レート制限対策）
    if (i + concurrency < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}
