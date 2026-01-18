import { crawlBeergirlCalendar } from "@/server/crawlers/beergirlCalendar";
import { crawlWalkerplus } from "@/server/crawlers/walkerplus";
import { crawlBeerfestival } from "@/server/crawlers/beerfestival";
import { crawlAlwaysLoveBeer } from "@/server/crawlers/alwayslovebeer";
import { upsertEventsAndGetNewOnes } from "@/server/services/eventService";

interface SourceSummary {
  total: number;
  new: number;
}

/**
 * Crawl all sources and get new events
 * Returns summary of crawled and new events
 */
export async function crawlAndGetNewEvents(): Promise<{
  newEvents: Array<{ title: string; url: string; sourceId: string }>;
  summary: {
    beergirlCalendar: SourceSummary;
    walkerplus: SourceSummary;
    beerfestival: SourceSummary;
    alwayslovebeer: SourceSummary;
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

  // Crawl beerfestival.info
  console.log("Crawling beerfestival.info...");
  const beerfestivalItems = await crawlBeerfestival();
  const beerfestivalNews = await upsertEventsAndGetNewOnes(beerfestivalItems);
  allNewEvents.push(...beerfestivalNews);

  // Crawl alwayslovebeer.com
  console.log("Crawling alwayslovebeer.com...");
  const alwayslovebeerItems = await crawlAlwaysLoveBeer();
  const alwayslovebeerNews = await upsertEventsAndGetNewOnes(alwayslovebeerItems);
  allNewEvents.push(...alwayslovebeerNews);

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
      beerfestival: {
        total: beerfestivalItems.length,
        new: beerfestivalNews.length,
      },
      alwayslovebeer: {
        total: alwayslovebeerItems.length,
        new: alwayslovebeerNews.length,
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
    "walkerplus-liquor-kanto": "ウォーカープラス",
    "beerfestival-info": "ビアフェス情報",
    alwayslovebeer: "Always Love Beer",
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
    walkerplus: SourceSummary;
    beerfestival: SourceSummary;
    alwayslovebeer: SourceSummary;
  }
): string {
  const lines = ["🔄 最新情報を取得しました\n"];

  // Summary
  lines.push("【取得結果】");
  lines.push(
    `🍺 ビール女子: ${summary.beergirlCalendar.total}件中${summary.beergirlCalendar.new}件が新規`
  );
  lines.push(
    `🍷 ウォーカープラス: ${summary.walkerplus.total}件中${summary.walkerplus.new}件が新規`
  );
  lines.push(
    `🎪 ビアフェス情報: ${summary.beerfestival.total}件中${summary.beerfestival.new}件が新規`
  );
  lines.push(
    `🍻 Always Love Beer: ${summary.alwayslovebeer.total}件中${summary.alwayslovebeer.new}件が新規\n`
  );

  // Show new events (max 3 for new items)
  if (newEvents.length === 0) {
    lines.push("新しいイベントはありませんでした。");
  } else {
    lines.push(`【新着イベント】\n`);

    const displayEvents = newEvents.slice(0, 3);
    displayEvents.forEach((event, index) => {
      const sourceName = getSourceDisplayName(event.sourceId);
      lines.push(`${index + 1}. [${sourceName}] ${event.title}`);
      lines.push(`   ${event.url}\n`);
    });

    if (newEvents.length > 3) {
      const webPageUrl = process.env.NEXT_PUBLIC_APP_URL + "/events";
      lines.push(`他${newEvents.length - 3}件の新着イベントがあります。`);
      lines.push(`詳しくはこちら: ${webPageUrl}`);
    }
  }

  return lines.join("\n");
}
