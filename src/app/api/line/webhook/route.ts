import { NextResponse } from "next/server";
import type { WebhookEvent } from "@line/bot-sdk";
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

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-line-signature");
    if (!signature) {
      return new NextResponse("No signature", { status: 400 });
    }

    const body = await request.text();

    // Verify signature
    if (!verifySignature(body, signature)) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(body);
    const events: WebhookEvent[] = payload.events || [];

    // Process events
    for (const event of events) {
      if (event.type === "follow") {
        // User followed the bot - add to subscribers
        const userId = event.source.userId;
        if (userId) {
          // TODO: Add to database
          console.log("New follower:", userId);
        }
      } else if (event.type === "unfollow") {
        // User unfollowed - remove from subscribers
        const userId = event.source.userId;
        if (userId) {
          // TODO: Remove from database
          console.log("Unfollower:", userId);
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
