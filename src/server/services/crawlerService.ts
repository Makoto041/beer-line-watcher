import { crawlBeergirl } from "@/server/crawlers/beergirl";
import { crawlWalkerplus } from "@/server/crawlers/walkerplus";
import { upsertEventsAndGetNewOnes } from "@/server/services/eventService";

/**
 * Crawl all sources and get new events
 * Returns summary of crawled and new events
 */
export async function crawlAndGetNewEvents(): Promise<{
  newEvents: Array<{ title: string; url: string; sourceId: string }>;
  summary: {
    beergirl: { total: number; new: number };
    walkerplus: { total: number; new: number };
  };
}> {
  const allNewEvents: Array<{ title: string; url: string; sourceId: string }> =
    [];

  // Crawl Beergirl
  console.log("Crawling beergirl...");
  const beergirlItems = await crawlBeergirl();
  const beergirlNews = await upsertEventsAndGetNewOnes(beergirlItems);
  allNewEvents.push(...beergirlNews);

  // Crawl Walkerplus
  console.log("Crawling walkerplus...");
  const walkerplusItems = await crawlWalkerplus();
  const walkerplusNews = await upsertEventsAndGetNewOnes(walkerplusItems);
  allNewEvents.push(...walkerplusNews);

  return {
    newEvents: allNewEvents,
    summary: {
      beergirl: {
        total: beergirlItems.length,
        new: beergirlNews.length,
      },
      walkerplus: {
        total: walkerplusItems.length,
        new: walkerplusNews.length,
      },
    },
  };
}

/**
 * Format crawler results as LINE message
 */
export function formatCrawlerResultsForLine(
  newEvents: Array<{ title: string; url: string; sourceId: string }>,
  summary: {
    beergirl: { total: number; new: number };
    walkerplus: { total: number; new: number };
  }
): string {
  const lines = ["🔄 最新情報を取得しました\n"];

  // Summary
  lines.push("【取得結果】");
  lines.push(
    `🍺 ビール女子: ${summary.beergirl.total}件中${summary.beergirl.new}件が新規`
  );
  lines.push(
    `🍷 ウォーカープラス: ${summary.walkerplus.total}件中${summary.walkerplus.new}件が新規\n`
  );

  // Show new events (max 10)
  if (newEvents.length === 0) {
    lines.push("新しいイベントはありませんでした。");
  } else {
    lines.push(`【新着イベント（${newEvents.length}件）】\n`);

    const displayEvents = newEvents.slice(0, 10);
    displayEvents.forEach((event, index) => {
      const sourceName =
        event.sourceId === "beergirl-calendar"
          ? "ビール女子"
          : "ウォーカープラス";
      lines.push(`${index + 1}. [${sourceName}] ${event.title}`);
      lines.push(`   ${event.url}\n`);
    });

    if (newEvents.length > 10) {
      lines.push(`...他${newEvents.length - 10}件`);
    }
  }

  return lines.join("\n");
}
