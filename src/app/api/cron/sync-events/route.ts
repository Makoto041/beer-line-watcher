import { NextResponse } from "next/server";
import { crawlBeergirlCalendar } from "@/server/crawlers/beergirlCalendar";
import { crawlWalkerplus } from "@/server/crawlers/walkerplus";
import { upsertEventsAndGetNewOnes } from "@/server/services/eventService";
import { sendLineBroadcast } from "@/server/services/lineService";

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
    const allNewMessages: string[] = [];

    // 1. ビール女子カレンダー（Googleカレンダー）
    console.log("Crawling beergirl calendar...");
    const beergirlCalendarItems = await crawlBeergirlCalendar();
    console.log(`Beergirl calendar found ${beergirlCalendarItems.length} items`);

    const beergirlCalendarNews = await upsertEventsAndGetNewOnes(beergirlCalendarItems);
    console.log(`Beergirl calendar new events: ${beergirlCalendarNews.length}`);

    if (beergirlCalendarNews.length) {
      beergirlCalendarNews.forEach((n) =>
        allNewMessages.push(`🍺[ビール女子] ${n.title}\n${n.url}`)
      );
    }

    // 2. Walkerplus
    console.log("Crawling walkerplus...");
    const walkerplusItems = await crawlWalkerplus();
    console.log(`Walkerplus found ${walkerplusItems.length} items`);

    const walkerplusNews = await upsertEventsAndGetNewOnes(walkerplusItems);
    console.log(`Walkerplus new events: ${walkerplusNews.length}`);

    if (walkerplusNews.length) {
      walkerplusNews.forEach((n) =>
        allNewMessages.push(`🍷[Walkerplus] ${n.title}\n${n.url}`)
      );
    }

    if (allNewMessages.length) {
      console.log(`Sending ${allNewMessages.length} new events to LINE...`);
      const text = allNewMessages.join("\n\n");
      await sendLineBroadcast(text);
      console.log("LINE broadcast sent successfully");
    } else {
      console.log("No new events to send");
    }

    return NextResponse.json({
      success: true,
      newCount: allNewMessages.length,
      crawled: {
        beergirlCalendar: beergirlCalendarItems.length,
        walkerplus: walkerplusItems.length,
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
