import { NextResponse } from "next/server";
import type { WebhookEvent } from "@line/bot-sdk";
import { prisma } from "@/server/db";
import {
  getThisWeeksEvents,
  formatEventsForLine,
} from "@/server/services/eventQueryService";
import {
  crawlAndGetNewEvents,
  formatCrawlerResultsForLine,
} from "@/server/services/crawlerService";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// LINE Webhook signature verification
function verifySignature(body: string, signature: string): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    console.error("LINE_CHANNEL_SECRET is not set");
    return false;
  }

  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");

  return hash === signature;
}

// Reply to LINE messages
async function replyMessage(replyToken: string, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error("LINE_CHANNEL_ACCESS_TOKEN not set");
    return;
  }

  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  }).catch((error) => {
    console.error("Reply message error:", error);
  });
}

// Parse notification interval from message
function parseNotificationInterval(text: string): number | null {
  const normalizedText = text.replace(/\s/g, "").toLowerCase();

  const patterns = [
    { regex: /通知.*毎日|毎日.*通知|1日/, days: 1 },
    { regex: /通知.*1週間|1週間.*通知|7日/, days: 7 },
    { regex: /通知.*2週間|2週間.*通知|14日/, days: 14 },
    { regex: /通知.*1ヶ月|1ヶ月.*通知|30日|1か月/, days: 30 },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(normalizedText)) {
      return pattern.days;
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-line-signature");
    const body = await request.text();

    console.log("LINE webhook received", {
      hasSignature: !!signature,
      bodyLength: body.length,
      hasChannelSecret: !!process.env.LINE_CHANNEL_SECRET,
    });

    // Verify signature if present
    if (signature && process.env.LINE_CHANNEL_SECRET) {
      if (!verifySignature(body, signature)) {
        console.error("Signature verification failed");
        return new NextResponse("OK", { status: 200 });
      }
      console.log("Signature verified successfully");
    } else {
      console.warn("Signature verification skipped (dev mode)");
    }

    const payload = JSON.parse(body);
    const events: WebhookEvent[] = payload.events || [];

    console.log("Received events:", JSON.stringify(events, null, 2));

    console.log("Processing events", { count: events.length });

    // Process events
    for (const event of events) {
      const source = event.source;

      // 1. User followed the bot (1-on-1)
      if (event.type === "follow" && source.type === "user") {
        const userId = source.userId;
        if (userId) {
          await prisma.lineSubscriber.upsert({
            where: { userId },
            update: {},
            create: { userId },
          });
          console.log("New follower:", userId);

          // Send welcome message with instructions
          if (event.replyToken) {
            await replyMessage(
              event.replyToken,
              "🍺 ビールイベント通知ボットへようこそ！\n\n" +
                "【使い方】\n" +
                "• 「今週のイベント」で今週のイベントを表示\n" +
                "• 「通知 毎日」で毎日通知\n" +
                "• 「通知 1週間」で週1回通知\n" +
                "• 「通知 2週間」で2週間に1回通知\n" +
                "• 「通知 1ヶ月」で月1回通知"
            );
          }
        }
      }

      // 2. User unfollowed the bot (1-on-1)
      else if (event.type === "unfollow" && source.type === "user") {
        const userId = source.userId;
        if (userId) {
          await prisma.lineSubscriber
            .delete({
              where: { userId },
            })
            .catch(() => {
              // Ignore if already deleted
            });
          console.log("Unfollower:", userId);
        }
      }

      // 3. Bot joined a group or room
      else if (event.type === "join") {
        const groupId = source.type === "group" ? source.groupId : undefined;
        const roomId = source.type === "room" ? source.roomId : undefined;
        const id = groupId || roomId;

        if (id) {
          await prisma.lineGroup.upsert({
            where: { id },
            update: {},
            create: {
              id,
              type: source.type,
            },
          });
          console.log("Bot joined group/room:", id, source.type);

          // Send greeting with instructions
          if (event.replyToken) {
            await replyMessage(
              event.replyToken,
              "🍺 ビールイベント通知ボットが参加しました！\n" +
                "新しいイベント情報をこのグループにお届けします。\n\n" +
                "【コマンド】\n" +
                "• 「今週のイベント」で今週のイベントを表示\n" +
                "• 「通知 1週間」などで通知間隔を変更\n" +
                "• 「停止」で通知を停止\n" +
                "• 「開始」で通知を再開"
            );
          }
        }
      }

      // 4. Bot left a group or room
      else if (event.type === "leave") {
        const groupId = source.type === "group" ? source.groupId : undefined;
        const roomId = source.type === "room" ? source.roomId : undefined;
        const id = groupId || roomId;

        if (id) {
          await prisma.lineGroup
            .delete({
              where: { id },
            })
            .catch(() => {
              // Ignore if already deleted
            });
          console.log("Bot left group/room:", id);
        }
      }

      // 5. Text message from user (1-on-1)
      else if (
        event.type === "message" &&
        event.message.type === "text" &&
        source.type === "user"
      ) {
        const text = event.message.text.trim();
        const userId = source.userId;

        if (!userId || !event.replyToken) continue;

        // 最新情報取得
        if (/最新.*情報.*取得|最新情報|情報.*取得/.test(text)) {
          console.log("User requested latest info:", userId);
          await replyMessage(event.replyToken, "🔄 最新情報を取得中です...");

          const { newEvents, summary } = await crawlAndGetNewEvents();
          const message = formatCrawlerResultsForLine(newEvents, summary);

          // Send result as push message (can't use reply token twice)
          const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
          if (token) {
            await fetch("https://api.line.me/v2/bot/message/push", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                to: userId,
                messages: [{ type: "text", text: message }],
              }),
            });
          }
        }
        // 今週のイベント
        else if (/今週.*イベント|イベント.*今週/.test(text)) {
          console.log("User requested this week's events:", userId);
          const events = await getThisWeeksEvents();
          const message = formatEventsForLine(events);
          await replyMessage(event.replyToken, message);
        }
        // 通知間隔の変更
        else {
          const notificationDays = parseNotificationInterval(text);
          if (notificationDays) {
            // DBが初期化されていて follow 済みユーザー行が無い場合に備え upsert にする
            await prisma.lineSubscriber.upsert({
              where: { userId },
              update: { notificationDays },
              create: { userId, notificationDays },
            });

            const intervalText =
              notificationDays === 1
                ? "毎日"
                : notificationDays === 7
                  ? "1週間"
                  : notificationDays === 14
                    ? "2週間"
                    : "1ヶ月";

            await replyMessage(
              event.replyToken,
              `通知間隔を${intervalText}に設定しました。`
            );
            console.log(
              `User ${userId} set notification interval to ${notificationDays} days`
            );
          }
        }
      }

      // 6. Text message in group
      else if (
        event.type === "message" &&
        event.message.type === "text" &&
        (source.type === "group" || source.type === "room")
      ) {
        const text = event.message.text.trim();
        const groupId = source.type === "group" ? source.groupId : undefined;
        const roomId = source.type === "room" ? source.roomId : undefined;
        const id = groupId || roomId;

        if (!id || !event.replyToken) continue;

        // 最新情報取得
        if (/最新.*情報.*取得|最新情報|情報.*取得/.test(text)) {
          console.log("Group requested latest info:", id);
          await replyMessage(event.replyToken, "🔄 最新情報を取得中です...");

          const { newEvents, summary } = await crawlAndGetNewEvents();
          const message = formatCrawlerResultsForLine(newEvents, summary);

          // Send result as push message
          const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
          if (token) {
            await fetch("https://api.line.me/v2/bot/message/push", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                to: id,
                messages: [{ type: "text", text: message }],
              }),
            });
          }
        }
        // 今週のイベント
        else if (/今週.*イベント|イベント.*今週/.test(text)) {
          console.log("Group requested this week's events:", id);
          const events = await getThisWeeksEvents();
          const message = formatEventsForLine(events);
          await replyMessage(event.replyToken, message);
        }
        // 通知間隔の変更
        else {
          const notificationDays = parseNotificationInterval(text);
          if (notificationDays) {
            // グループ行が無い場合にも対応するため upsert にする
            await prisma.lineGroup.upsert({
              where: { id },
              update: { notificationDays },
              create: {
                id,
                type: source.type,
                notificationDays,
              },
            });

            const intervalText =
              notificationDays === 1
                ? "毎日"
                : notificationDays === 7
                  ? "1週間"
                  : notificationDays === 14
                    ? "2週間"
                    : "1ヶ月";

            await replyMessage(
              event.replyToken,
              `通知間隔を${intervalText}に設定しました。`
            );
            console.log(
              `Group ${id} set notification interval to ${notificationDays} days`
            );
          }
        }

        // STOP command - disable notifications
        if (/^(STOP|停止)$/i.test(text)) {
          await prisma.lineGroup
            .delete({
              where: { id },
            })
            .catch(() => {
              // Ignore if already deleted
            });
          await replyMessage(event.replyToken, "このグループへの通知を停止しました。");
          console.log("Group notifications stopped:", id);
        }

        // START command - enable notifications
        else if (/^(START|開始)$/i.test(text)) {
          await prisma.lineGroup.upsert({
            where: { id },
            update: {},
            create: {
              id,
              type: source.type,
            },
          });
          await replyMessage(event.replyToken, "このグループへの通知を再開しました。");
          console.log("Group notifications started:", id);
        }
      }
    }

    // Always return 200 OK to LINE
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("LINE webhook error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    // Return 500 in development to see errors
    if (process.env.NODE_ENV === "development") {
      return new NextResponse(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    // Still return 200 in production to avoid LINE retrying
    return new NextResponse("OK", { status: 200 });
  }
}
