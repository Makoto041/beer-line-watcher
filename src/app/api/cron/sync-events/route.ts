import { NextResponse } from "next/server";
import { crawlBeergirlCalendar } from "@/server/crawlers/beergirlCalendar";
import { crawlAlwaysLoveBeerCalendar } from "@/server/crawlers/alwaysLoveBeerCalendar";
import { crawlWalkerplus } from "@/server/crawlers/walkerplus";
import { crawlBeerfestival } from "@/server/crawlers/beerfestival";
import { upsertEventsAndGetNewOnes } from "@/server/services/eventService";
import { sendLineNotifications } from "@/server/services/lineService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 簡易認証（Vercel Cron からのみ叩く想定）
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (!token || token !== process.env.CRON_SECRET) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    console.log("Starting cron job...");
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

    // Calculate total new events from this crawl
    const totalNewEvents =
      beergirlResult.newEvents.length +
      alwayslovebeerResult.newEvents.length +
      walkerplusResult.newEvents.length +
      beerfestivalResult.newEvents.length;

    console.log(`Crawl complete. Total new events: ${totalNewEvents}`);

    // Send LINE notifications to eligible recipients
    // Each recipient gets events created after their lastNotifiedAt
    console.log("Sending LINE notifications...");
    const notificationResult = await sendLineNotifications();

    if (notificationResult.sent) {
      console.log(
        `LINE notifications sent: ${notificationResult.userCount} users, ${notificationResult.groupCount} groups, up to ${notificationResult.totalEvents} events`
      );
    } else {
      console.log("No LINE notifications sent (no eligible recipients or no new events)");
    }

    return NextResponse.json({
      success: true,
      newCount: totalNewEvents,
      crawled: crawledCounts,
      notifications: {
        sent: notificationResult.sent,
        userCount: notificationResult.userCount,
        groupCount: notificationResult.groupCount,
        maxEvents: notificationResult.totalEvents,
      },
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
