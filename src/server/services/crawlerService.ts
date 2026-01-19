import { crawlBeergirlCalendar } from "@/server/crawlers/beergirlCalendar";
import { crawlAlwaysLoveBeerCalendar } from "@/server/crawlers/alwaysLoveBeerCalendar";
import { crawlWalkerplus } from "@/server/crawlers/walkerplus";
import { crawlBeerfestival } from "@/server/crawlers/beerfestival";
import { upsertEventsAndGetNewOnes } from "@/server/services/eventService";
import { EVENTS_PAGE_URL } from "@/server/constants";

interface SourceSummary {
  total: number;
  new: number;
  updated: number;
  skippedDuplicates: number;
  skippedExisting: number;
}

/**
 * Crawl all sources and get new events
 * Returns summary of crawled and new events
 */
export async function crawlAndGetNewEvents(): Promise<{
  newEvents: Array<{ title: string; url: string; sourceId: string }>;
  summary: {
    beergirlCalendar: SourceSummary;
    alwayslovebeerCalendar: SourceSummary;
    walkerplus: SourceSummary;
    beerfestival: SourceSummary;
  };
}> {
  const allNewEvents: Array<{ title: string; url: string; sourceId: string }> = [];

  // Crawl Beergirl Google Calendar
  console.log("Crawling beergirl calendar...");
  const beergirlCalendarItems = await crawlBeergirlCalendar();
  const beergirlCalendarResult = await upsertEventsAndGetNewOnes(beergirlCalendarItems);
  allNewEvents.push(...beergirlCalendarResult.newEvents);
  console.log(`  → ${beergirlCalendarItems.length}件取得, ${beergirlCalendarResult.newEvents.length}件新規, ${beergirlCalendarResult.updatedEvents.length}件更新, ${beergirlCalendarResult.skippedExisting}件既存, ${beergirlCalendarResult.skippedDuplicates}件重複スキップ`);

  // Crawl Always Love Beer Google Calendar (全国ビールイベントカレンダー)
  console.log("Crawling Always Love Beer calendar...");
  const alwayslovebeerCalendarItems = await crawlAlwaysLoveBeerCalendar();
  const alwayslovebeerCalendarResult = await upsertEventsAndGetNewOnes(alwayslovebeerCalendarItems);
  allNewEvents.push(...alwayslovebeerCalendarResult.newEvents);
  console.log(`  → ${alwayslovebeerCalendarItems.length}件取得, ${alwayslovebeerCalendarResult.newEvents.length}件新規, ${alwayslovebeerCalendarResult.updatedEvents.length}件更新, ${alwayslovebeerCalendarResult.skippedExisting}件既存, ${alwayslovebeerCalendarResult.skippedDuplicates}件重複スキップ`);

  // Crawl Walkerplus
  console.log("Crawling walkerplus...");
  const walkerplusItems = await crawlWalkerplus();
  const walkerplusResult = await upsertEventsAndGetNewOnes(walkerplusItems);
  allNewEvents.push(...walkerplusResult.newEvents);
  console.log(`  → ${walkerplusItems.length}件取得, ${walkerplusResult.newEvents.length}件新規, ${walkerplusResult.updatedEvents.length}件更新, ${walkerplusResult.skippedExisting}件既存, ${walkerplusResult.skippedDuplicates}件重複スキップ`);

  // Crawl beerfestival.info
  console.log("Crawling beerfestival.info...");
  const beerfestivalItems = await crawlBeerfestival();
  const beerfestivalResult = await upsertEventsAndGetNewOnes(beerfestivalItems);
  allNewEvents.push(...beerfestivalResult.newEvents);
  console.log(`  → ${beerfestivalItems.length}件取得, ${beerfestivalResult.newEvents.length}件新規, ${beerfestivalResult.updatedEvents.length}件更新, ${beerfestivalResult.skippedExisting}件既存, ${beerfestivalResult.skippedDuplicates}件重複スキップ`);

  return {
    newEvents: allNewEvents,
    summary: {
      beergirlCalendar: {
        total: beergirlCalendarItems.length,
        new: beergirlCalendarResult.newEvents.length,
        updated: beergirlCalendarResult.updatedEvents.length,
        skippedDuplicates: beergirlCalendarResult.skippedDuplicates,
        skippedExisting: beergirlCalendarResult.skippedExisting,
      },
      alwayslovebeerCalendar: {
        total: alwayslovebeerCalendarItems.length,
        new: alwayslovebeerCalendarResult.newEvents.length,
        updated: alwayslovebeerCalendarResult.updatedEvents.length,
        skippedDuplicates: alwayslovebeerCalendarResult.skippedDuplicates,
        skippedExisting: alwayslovebeerCalendarResult.skippedExisting,
      },
      walkerplus: {
        total: walkerplusItems.length,
        new: walkerplusResult.newEvents.length,
        updated: walkerplusResult.updatedEvents.length,
        skippedDuplicates: walkerplusResult.skippedDuplicates,
        skippedExisting: walkerplusResult.skippedExisting,
      },
      beerfestival: {
        total: beerfestivalItems.length,
        new: beerfestivalResult.newEvents.length,
        updated: beerfestivalResult.updatedEvents.length,
        skippedDuplicates: beerfestivalResult.skippedDuplicates,
        skippedExisting: beerfestivalResult.skippedExisting,
      },
    },
  };
}

/**
 * Get source display name
 */
function getSourceDisplayName(sourceId: string): string {
  const names: Record<string, string> = {
    "beergirl-calendar": "ビール女子",
    "alwayslovebeer-calendar": "全国ビールイベントカレンダー",
    "walkerplus-liquor-kanto": "ウォーカープラス",
    "beerfestival-info": "ビアフェス情報",
  };
  return names[sourceId] || sourceId;
}

/**
 * Format crawler results as LINE message
 */
export function formatCrawlerResultsForLine(
  newEvents: Array<{ title: string; url: string; sourceId: string }>,
  summary: {
    beergirlCalendar: SourceSummary;
    alwayslovebeerCalendar: SourceSummary;
    walkerplus: SourceSummary;
    beerfestival: SourceSummary;
  }
): string {
  const lines = ["🔄 最新情報を取得しました\n"];

  // Summary with detailed breakdown
  const formatSourceSummary = (emoji: string, name: string, s: SourceSummary) => {
    const parts = [`${emoji} ${name}: ${s.total}件取得`];
    if (s.new > 0) parts.push(`${s.new}件新規`);
    if (s.updated > 0) parts.push(`${s.updated}件更新`);
    if (s.skippedDuplicates > 0) parts.push(`${s.skippedDuplicates}件重複`);
    return parts.join(', ');
  };

  lines.push("【取得結果】");
  lines.push(formatSourceSummary("🍺", "ビール女子", summary.beergirlCalendar));
  lines.push(formatSourceSummary("🗓️", "全国ビールイベント", summary.alwayslovebeerCalendar));
  lines.push(formatSourceSummary("🍷", "ウォーカープラス", summary.walkerplus));
  lines.push(formatSourceSummary("🎪", "ビアフェス情報", summary.beerfestival) + "\n");

  // Show new events (max 3 for new items)
  if (newEvents.length === 0) {
    lines.push("新しいイベントはありませんでした。");
  } else {
    lines.push(`【新着イベント】\n`);

    const displayEvents = newEvents.slice(0, 3);
    displayEvents.forEach((event, index) => {
      const sourceName = getSourceDisplayName(event.sourceId);
      lines.push(`${index + 1}. [${sourceName}] ${event.title}`);
      // URLは独立した行に配置（先頭に空白なし）
      lines.push(event.url);
      lines.push("");
    });

    if (newEvents.length > 3) {
      lines.push(`他${newEvents.length - 3}件の新着イベントがあります。`);
      lines.push("詳しくはこちら↓");
      lines.push(EVENTS_PAGE_URL);
    }
  }

  return lines.join("\n");
}
