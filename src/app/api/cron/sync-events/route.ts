import { NextResponse } from "next/server";
import { crawlBeergirlCalendar } from "@/server/crawlers/beergirlCalendar";
import { crawlAlwaysLoveBeerCalendar } from "@/server/crawlers/alwaysLoveBeerCalendar";
import { crawlWalkerplus } from "@/server/crawlers/walkerplus";
import { crawlBeerfestival } from "@/server/crawlers/beerfestival";
import { upsertEventsAndGetNewOnes } from "@/server/services/eventService";
import { sendLineBroadcast } from "@/server/services/lineService";
import { EVENTS_PAGE_URL } from "@/server/constants";
import { getShortEventUrl } from "@/server/services/eventQueryService";
import { prisma } from "@/server/db";

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
    const crawledCounts: Record<string, { total: number; new: number; updated: number; skippedDuplicates: number; skippedExisting: number }> = {};

    // Helper to log upsert result
    const logResult = (name: string, total: number, result: { newEvents: { title: string; url: string; sourceId: string }[]; updatedEvents: { title: string; url: string; sourceId: string }[]; skippedDuplicates: number; skippedExisting: number }) => {
      console.log(`${name}: ${total}件取得 → ${result.newEvents.length}件新規, ${result.updatedEvents.length}件更新, ${result.skippedExisting}件既存, ${result.skippedDuplicates}件重複スキップ`);
    };

    // 1. ビール女子カレンダー（Googleカレンダー）
    console.log("Crawling beergirl calendar...");
    const beergirlCalendarItems = await crawlBeergirlCalendar();
    const beergirlResult = await upsertEventsAndGetNewOnes(beergirlCalendarItems);
    crawledCounts.beergirlCalendar = {
      total: beergirlCalendarItems.length,
      new: beergirlResult.newEvents.length,
      updated: beergirlResult.updatedEvents.length,
      skippedDuplicates: beergirlResult.skippedDuplicates,
      skippedExisting: beergirlResult.skippedExisting,
    };
    logResult("ビール女子", beergirlCalendarItems.length, beergirlResult);

    if (beergirlResult.newEvents.length) {
      beergirlResult.newEvents.forEach((n) =>
        allNewMessages.push(`🍺[ビール女子] ${n.title}\n${getShortEventUrl(n.id)}`)
      );
    }

    // 2. 全国ビールイベントカレンダー（Googleカレンダー）
    console.log("Crawling Always Love Beer calendar...");
    const alwayslovebeerCalendarItems = await crawlAlwaysLoveBeerCalendar();
    const alwayslovebeerResult = await upsertEventsAndGetNewOnes(alwayslovebeerCalendarItems);
    crawledCounts.alwayslovebeerCalendar = {
      total: alwayslovebeerCalendarItems.length,
      new: alwayslovebeerResult.newEvents.length,
      updated: alwayslovebeerResult.updatedEvents.length,
      skippedDuplicates: alwayslovebeerResult.skippedDuplicates,
      skippedExisting: alwayslovebeerResult.skippedExisting,
    };
    logResult("全国ビールイベント", alwayslovebeerCalendarItems.length, alwayslovebeerResult);

    if (alwayslovebeerResult.newEvents.length) {
      alwayslovebeerResult.newEvents.forEach((n) =>
        allNewMessages.push(`🗓️[全国ビールイベント] ${n.title}\n${getShortEventUrl(n.id)}`)
      );
    }

    // 3. Walkerplus
    console.log("Crawling walkerplus...");
    const walkerplusItems = await crawlWalkerplus();
    const walkerplusResult = await upsertEventsAndGetNewOnes(walkerplusItems);
    crawledCounts.walkerplus = {
      total: walkerplusItems.length,
      new: walkerplusResult.newEvents.length,
      updated: walkerplusResult.updatedEvents.length,
      skippedDuplicates: walkerplusResult.skippedDuplicates,
      skippedExisting: walkerplusResult.skippedExisting,
    };
    logResult("Walkerplus", walkerplusItems.length, walkerplusResult);

    if (walkerplusResult.newEvents.length) {
      walkerplusResult.newEvents.forEach((n) =>
        allNewMessages.push(`🍷[Walkerplus] ${n.title}\n${getShortEventUrl(n.id)}`)
      );
    }

    // 4. beerfestival.info
    console.log("Crawling beerfestival.info...");
    const beerfestivalItems = await crawlBeerfestival();
    const beerfestivalResult = await upsertEventsAndGetNewOnes(beerfestivalItems);
    crawledCounts.beerfestival = {
      total: beerfestivalItems.length,
      new: beerfestivalResult.newEvents.length,
      updated: beerfestivalResult.updatedEvents.length,
      skippedDuplicates: beerfestivalResult.skippedDuplicates,
      skippedExisting: beerfestivalResult.skippedExisting,
    };
    logResult("ビアフェス情報", beerfestivalItems.length, beerfestivalResult);

    if (beerfestivalResult.newEvents.length) {
      beerfestivalResult.newEvents.forEach((n) =>
        allNewMessages.push(`🎪[ビアフェス情報] ${n.title}\n${getShortEventUrl(n.id)}`)
      );
    }

    // Get all unnotified events (notifiedAt is null) including any from previous runs
    // that weren't notified because no recipients were eligible at that time
    const unnotifiedEvents = await prisma.event.findMany({
      where: {
        notifiedAt: null,
        // Only include events created within last 7 days to avoid notifying very old events
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: { source: true },
      orderBy: { createdAt: "desc" },
    });

    console.log(`Found ${unnotifiedEvents.length} unnotified events (including ${allNewMessages.length} from this crawl)`);

    // Build messages from all unnotified events
    const sourceEmojis: Record<string, string> = {
      "beergirl-calendar": "🍺",
      "alwayslovebeer-calendar": "🗓️",
      "walkerplus": "🍷",
      "beerfestival": "🎪",
    };
    const sourceLabels: Record<string, string> = {
      "beergirl-calendar": "ビール女子",
      "alwayslovebeer-calendar": "全国ビールイベント",
      "walkerplus": "Walkerplus",
      "beerfestival": "ビアフェス情報",
    };

    const allMessages = unnotifiedEvents.map((e) => {
      const emoji = sourceEmojis[e.sourceId] || "📅";
      const label = sourceLabels[e.sourceId] || e.source.name;
      return `${emoji}[${label}] ${e.title}\n${getShortEventUrl(e.id)}`;
    });

    const eventIds = unnotifiedEvents.map((e) => e.id);

    if (allMessages.length > 0) {
      console.log(`Sending ${allMessages.length} unnotified events to LINE...`);
      const text = buildLineMessage(
        "🍺 新着ビールイベント\n\n",
        allMessages,
        EVENTS_PAGE_URL
      );
      console.log(`Message length: ${text.length} characters`);
      const result = await sendLineBroadcast(text, eventIds);
      if (result.sent) {
        console.log(`LINE broadcast sent successfully to ${result.recipientCount} recipients`);
      } else {
        console.log("No recipients were eligible for notification (events will be carried over to next run)");
      }
    } else {
      console.log("No unnotified events to send");
    }

    return NextResponse.json({
      success: true,
      newCount: allNewMessages.length,
      unnotifiedCount: unnotifiedEvents.length,
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
