import "server-only";
import { prisma } from "@/server/db";

const LINE_MULTICAST_ENDPOINT = "https://api.line.me/v2/bot/message/multicast";
const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";

export async function sendLineBroadcast(message: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN not set");
    return;
  }

  // Get all subscribers (users)
  const subscribers = await prisma.lineSubscriber.findMany({
    select: { userId: true },
  });
  const userIds = subscribers.map((s) => s.userId);

  // Get all groups
  const groups = await prisma.lineGroup.findMany({
    select: { id: true, type: true },
  });

  if (userIds.length === 0 && groups.length === 0) {
    console.log("No recipients to send message to");
    return;
  }

  console.log(
    `Sending to ${userIds.length + groups.length} recipients (${userIds.length} users, ${groups.length} groups/rooms)`
  );

  // LINE multicast API has a limit of 500 recipients per request
  // Split into batches if needed
  const batchSize = 500;

  // 1) Send to individual users via multicast
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);

    const res = await fetch(LINE_MULTICAST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: batch,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("LINE multicast error", res.status, body);
    } else {
      console.log(`Sent user batch ${i / batchSize + 1} successfully`);
    }
  }

  // 2) Send to groups/rooms via push API (multicast does not accept group IDs)
  for (const group of groups) {
    const res = await fetch(LINE_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: group.id,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(
        `LINE push error for ${group.type} ${group.id}`,
        res.status,
        body
      );
    } else {
      console.log(`Sent message to ${group.type} ${group.id}`);
    }
  }
}
