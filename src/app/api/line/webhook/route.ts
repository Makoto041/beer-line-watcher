import { NextResponse } from "next/server";
import type { WebhookEvent } from "@line/bot-sdk";
import { prisma } from "@/server/db";
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

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-line-signature");
    const body = await request.text();

    console.log("LINE webhook received", {
      hasSignature: !!signature,
      bodyLength: body.length,
      hasChannelSecret: !!process.env.LINE_CHANNEL_SECRET,
    });

    // If no signature or channel secret, log but return 200
    if (!signature) {
      console.warn("No x-line-signature header");
      return new NextResponse("OK", { status: 200 });
    }

    if (!process.env.LINE_CHANNEL_SECRET) {
      console.error("LINE_CHANNEL_SECRET not configured");
      return new NextResponse("OK", { status: 200 });
    }

    // Verify signature
    if (!verifySignature(body, signature)) {
      console.error("Signature verification failed");
      return new NextResponse("OK", { status: 200 });
    }

    const payload = JSON.parse(body);
    const events: WebhookEvent[] = payload.events || [];

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

          // Send greeting
          if (event.replyToken) {
            await replyMessage(
              event.replyToken,
              "🍺 ビールイベント通知ボットが参加しました！\n新しいイベント情報をこのグループにお届けします。"
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

      // 5. Message in group (optional commands)
      else if (
        event.type === "message" &&
        event.message.type === "text" &&
        (source.type === "group" || source.type === "room")
      ) {
        const text = event.message.text.trim().toUpperCase();
        const groupId = source.type === "group" ? source.groupId : undefined;
        const roomId = source.type === "room" ? source.roomId : undefined;
        const id = groupId || roomId;

        if (!id) continue;

        // STOP command - disable notifications
        if (text === "STOP" || text === "停止") {
          await prisma.lineGroup
            .delete({
              where: { id },
            })
            .catch(() => {
              // Ignore if already deleted
            });
          if (event.replyToken) {
            await replyMessage(
              event.replyToken,
              "このグループへの通知を停止しました。"
            );
          }
          console.log("Group notifications stopped:", id);
        }

        // START command - enable notifications
        else if (text === "START" || text === "開始") {
          await prisma.lineGroup.upsert({
            where: { id },
            update: {},
            create: {
              id,
              type: source.type,
            },
          });
          if (event.replyToken) {
            await replyMessage(
              event.replyToken,
              "このグループへの通知を再開しました。"
            );
          }
          console.log("Group notifications started:", id);
        }
      }
    }

    // Always return 200 OK to LINE
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("LINE webhook error:", error);
    // Still return 200 to avoid LINE retrying
    return new NextResponse("OK", { status: 200 });
  }
}
