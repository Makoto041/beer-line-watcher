import { crawlBeergirl } from "@/server/crawlers/beergirl";
import { crawlBeergirlCalendar } from "@/server/crawlers/beergirlCalendar";
import { crawlWalkerplus } from "@/server/crawlers/walkerplus";
import { upsertEventsAndGetNewOnes } from "@/server/services/eventService";

/**
 * Crawl all sources and get new events
 * Returns summary of crawled and new events
 */
export async function crawlAndGetNewEvents(): Promise<{
  newEvents: Array<{ title: string; url: string; sourceId: string }>;
  summary: {
    beergirlCalendar: { total: number; new: number };
    walkerplus: { total: number; new: number };
  };
}> {
  const allNewEvents: Array<{ title: string; url: string; sourceId: string }> =
    [];

  // Crawl Beergirl Google Calendar (primary source with event dates)
  console.log("Crawling beergirl calendar...");
  const beergirlCalendarItems = await crawlBeergirlCalendar();
  const beergirlCalendarNews = await upsertEventsAndGetNewOnes(beergirlCalendarItems);
  allNewEvents.push(...beergirlCalendarNews);

  // Crawl Walkerplus
  console.log("Crawling walkerplus...");
  const walkerplusItems = await crawlWalkerplus();
  const walkerplusNews = await upsertEventsAndGetNewOnes(walkerplusItems);
  allNewEvents.push(...walkerplusNews);

  return {
    newEvents: allNewEvents,
    summary: {
      beergirlCalendar: {
        total: beergirlCalendarItems.length,
        new: beergirlCalendarNews.length,
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
    beergirlCalendar: { total: number; new: number };
    walkerplus: { total: number; new: number };
  }
): string {
  const lines = ["🔄 最新情報を取得しました\n"];

  // Summary
  lines.push("【取得結果】");
  lines.push(
    `🍺 ビール女子カレンダー: ${summary.beergirlCalendar.total}件中${summary.beergirlCalendar.new}件が新規`
  );
  lines.push(
    `🍷 ウォーカープラス: ${summary.walkerplus.total}件中${summary.walkerplus.new}件が新規\n`
  );

  // Show new events (max 3 for new items)
  if (newEvents.length === 0) {
    lines.push("新しいイベントはありませんでした。");
  } else {
    lines.push(`【新着イベント】\n`);

    const displayEvents = newEvents.slice(0, 3);
    displayEvents.forEach((event, index) => {
      const sourceName =
        event.sourceId === "beergirl-calendar"
          ? "ビール女子"
          : "ウォーカープラス";
      lines.push(`${index + 1}. [${sourceName}] ${event.title}`);
      lines.push(`   ${event.url}\n`);
    });

    if (newEvents.length > 3) {
      lines.push(`他${newEvents.length - 3}件の新着イベントがあります。`);
      lines.push(`詳しくはこちら: https://beergirl.net/beer-event-matome-2017_e/`);
    }
  }

  return lines.join("\n");
}
