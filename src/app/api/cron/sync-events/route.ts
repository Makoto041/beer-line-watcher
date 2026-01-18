import { NextResponse } from "next/server";
import { crawlBeergirlCalendar } from "@/server/crawlers/beergirlCalendar";
import { crawlAlwaysLoveBeerCalendar } from "@/server/crawlers/alwaysLoveBeerCalendar";
import { crawlWalkerplus } from "@/server/crawlers/walkerplus";
import { crawlBeerfestival } from "@/server/crawlers/beerfestival";
import { upsertEventsAndGetNewOnes } from "@/server/services/eventService";
import { sendLineBroadcast } from "@/server/services/lineService";
import { EVENTS_PAGE_URL } from "@/server/constants";

export const dynamic = "force-dynamic";

// LINE message character limit
const MAX_LINE_CHARS = 5000;

/**
 * Build LINE message from event items with character limit enforcement
 */
function buildLineMessage(
  header: string,
  items: string[],
  overflowUrlSuffix: string
): string {
  if (items.length === 0) return "";

  const separator = "\n\n";

  // First, try to include all items without overflow suffix
  let fullMessage = header;
  for (let i = 0; i < items.length; i++) {
    fullMessage += (i === 0 ? "" : separator) + items[i];
  }

  // If everything fits, return as-is
  if (fullMessage.length <= MAX_LINE_CHARS) {
    return fullMessage;
  }

  // Otherwise, we need to truncate and add overflow suffix
  // Build message item by item, reserving space for suffix
  let result = header;
  let includedCount = 0;

  for (const item of items) {
    const nextAddition = (includedCount === 0 ? "" : separator) + item;
    const potentialLength = result.length + nextAddition.length;

    // Calculate suffix for remaining items if we DON'T include this item (i.e., break now)
    const remainingIfBreak = items.length - includedCount;
    const suffixIfBreak = `\n\n…他${remainingIfBreak}件あります。\n詳しくはこちら: ${overflowUrlSuffix}`;

    // Check if adding this item would exceed limit
    // If it does, we'll break and use suffixIfBreak
    if (potentialLength + suffixIfBreak.length > MAX_LINE_CHARS) {
      break;
    }

    result += nextAddition;
    includedCount++;
  }

  // Add overflow suffix if not all items were included
  const remainingCount = items.length - includedCount;
  if (remainingCount > 0) {
    result += `\n\n…他${remainingCount}件あります。\n詳しくはこちら: ${overflowUrlSuffix}`;
  }

  // Final safety check - truncate if somehow still over limit
  if (result.length > MAX_LINE_CHARS) {
    result = result.slice(0, MAX_LINE_CHARS - 3) + "...";
  }

  return result;
}

export async function GET(request: Request) {
  try {
    // 簡易認証（Vercel Cron からのみ叩く想定）
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (!token || token !== process.env.CRON_SECRET) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    console.log("Starting cron job...");
    const allNewMessages: string[] = [];
    const crawledCounts: Record<string, number> = {};

    // 1. ビール女子カレンダー（Googleカレンダー）
    console.log("Crawling beergirl calendar...");
    const beergirlCalendarItems = await crawlBeergirlCalendar();
    crawledCounts.beergirlCalendar = beergirlCalendarItems.length;
    console.log(`Beergirl calendar found ${beergirlCalendarItems.length} items`);

    const beergirlCalendarNews = await upsertEventsAndGetNewOnes(beergirlCalendarItems);
    console.log(`Beergirl calendar new events: ${beergirlCalendarNews.length}`);

    if (beergirlCalendarNews.length) {
      beergirlCalendarNews.forEach((n) =>
        allNewMessages.push(`🍺[ビール女子] ${n.title}\n${n.url}`)
      );
    }

    // 2. 全国ビールイベントカレンダー（Googleカレンダー）
    console.log("Crawling Always Love Beer calendar...");
    const alwayslovebeerCalendarItems = await crawlAlwaysLoveBeerCalendar();
    crawledCounts.alwayslovebeerCalendar = alwayslovebeerCalendarItems.length;
    console.log(`Always Love Beer calendar found ${alwayslovebeerCalendarItems.length} items`);

    const alwayslovebeerCalendarNews = await upsertEventsAndGetNewOnes(alwayslovebeerCalendarItems);
    console.log(`Always Love Beer calendar new events: ${alwayslovebeerCalendarNews.length}`);

    if (alwayslovebeerCalendarNews.length) {
      alwayslovebeerCalendarNews.forEach((n) =>
        allNewMessages.push(`🗓️[全国ビールイベント] ${n.title}\n${n.url}`)
      );
    }

    // 3. Walkerplus
    console.log("Crawling walkerplus...");
    const walkerplusItems = await crawlWalkerplus();
    crawledCounts.walkerplus = walkerplusItems.length;
    console.log(`Walkerplus found ${walkerplusItems.length} items`);

    const walkerplusNews = await upsertEventsAndGetNewOnes(walkerplusItems);
    console.log(`Walkerplus new events: ${walkerplusNews.length}`);

    if (walkerplusNews.length) {
      walkerplusNews.forEach((n) =>
        allNewMessages.push(`🍷[Walkerplus] ${n.title}\n${n.url}`)
      );
    }

    // 4. beerfestival.info
    console.log("Crawling beerfestival.info...");
    const beerfestivalItems = await crawlBeerfestival();
    crawledCounts.beerfestival = beerfestivalItems.length;
    console.log(`Beerfestival found ${beerfestivalItems.length} items`);

    const beerfestivalNews = await upsertEventsAndGetNewOnes(beerfestivalItems);
    console.log(`Beerfestival new events: ${beerfestivalNews.length}`);

    if (beerfestivalNews.length) {
      beerfestivalNews.forEach((n) =>
        allNewMessages.push(`🎪[ビアフェス情報] ${n.title}\n${n.url}`)
      );
    }

    if (allNewMessages.length) {
      console.log(`Sending ${allNewMessages.length} new events to LINE...`);
      const text = buildLineMessage(
        "🍺 今週の新着ビールイベント\n\n",
        allNewMessages,
        EVENTS_PAGE_URL
      );
      console.log(`Message length: ${text.length} characters`);
      await sendLineBroadcast(text);
      console.log("LINE broadcast sent successfully");
    } else {
      console.log("No new events to send");
    }

    return NextResponse.json({
      success: true,
      newCount: allNewMessages.length,
      crawled: crawledCounts,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
