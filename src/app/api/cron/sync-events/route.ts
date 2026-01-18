import { NextResponse } from "next/server";
import { crawlBeergirlCalendar } from "@/server/crawlers/beergirlCalendar";
import { crawlWalkerplus } from "@/server/crawlers/walkerplus";
import { crawlBeerfestival } from "@/server/crawlers/beerfestival";
import { crawlAlwaysLoveBeer } from "@/server/crawlers/alwayslovebeer";
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

    // 2. Walkerplus
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

    // 3. beerfestival.info
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

    // 4. alwayslovebeer.com
    console.log("Crawling alwayslovebeer.com...");
    const alwayslovebeerItems = await crawlAlwaysLoveBeer();
    crawledCounts.alwayslovebeer = alwayslovebeerItems.length;
    console.log(`AlwaysLoveBeer found ${alwayslovebeerItems.length} items`);

    const alwayslovebeerNews = await upsertEventsAndGetNewOnes(alwayslovebeerItems);
    console.log(`AlwaysLoveBeer new events: ${alwayslovebeerNews.length}`);

    if (alwayslovebeerNews.length) {
      alwayslovebeerNews.forEach((n) =>
        allNewMessages.push(`🍻[Always Love Beer] ${n.title}\n${n.url}`)
      );
    }

    if (allNewMessages.length) {
      console.log(`Sending ${allNewMessages.length} new events to LINE...`);
      // Limit message length for LINE (max 5000 characters)
      let text = "🍺 今週の新着ビールイベント\n\n" + allNewMessages.slice(0, 5).join("\n\n");
      if (allNewMessages.length > 5) {
        const webPageUrl = process.env.NEXT_PUBLIC_APP_URL + "/events";
        text += `\n\n他${allNewMessages.length - 5}件あります。\n詳しくはこちら: ${webPageUrl}`;
      }
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
