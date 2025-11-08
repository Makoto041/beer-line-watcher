import { NextResponse } from "next/server";
import { crawlBeergirl } from "@/server/crawlers/beergirl";
import { crawlWalkerplus } from "@/server/crawlers/walkerplus";
import { upsertEventsAndGetNewOnes } from "@/server/services/eventService";
import { sendLineBroadcast } from "@/server/services/lineService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // 簡易認証（Vercel Cron からのみ叩く想定）
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token || token !== process.env.CRON_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const allNewMessages: string[] = [];

  // 1. ビール女子
  {
    const items = await crawlBeergirl();
    const news = await upsertEventsAndGetNewOnes(items);
    if (news.length) {
      news.forEach((n) =>
        allNewMessages.push(`🍺[ビール女子] ${n.title}\n${n.url}`)
      );
    }
  }

  // 2. Walkerplus
  {
    const items = await crawlWalkerplus();
    const news = await upsertEventsAndGetNewOnes(items);
    if (news.length) {
      news.forEach((n) =>
        allNewMessages.push(`🍷[Walkerplus] ${n.title}\n${n.url}`)
      );
    }
  }

  if (allNewMessages.length) {
    const text = allNewMessages.join("\n\n");
    await sendLineBroadcast(text);
  }

  return NextResponse.json({
    newCount: allNewMessages.length,
  });
}
