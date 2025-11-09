import "server-only";
import { prisma } from "@/server/db";

const LINE_MULTICAST_ENDPOINT = "https://api.line.me/v2/bot/message/multicast";

export async function sendLineBroadcast(message: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN not set");
    return;
  }

  // Get all subscribers (users)
  const subscribers = await prisma.lineSubscriber.findMany();
  const userIds = subscribers.map((s) => s.userId);

  // Get all groups
  const groups = await prisma.lineGroup.findMany();
  const groupIds = groups.map((g) => g.id);

  // Combine all recipients
  const allRecipients = [...userIds, ...groupIds];

  if (allRecipients.length === 0) {
    console.log("No recipients to send message to");
    return;
  }

  console.log(`Sending to ${allRecipients.length} recipients (${userIds.length} users, ${groupIds.length} groups)`);

  // LINE multicast API has a limit of 500 recipients per request
  // Split into batches if needed
  const batchSize = 500;
  for (let i = 0; i < allRecipients.length; i += batchSize) {
    const batch = allRecipients.slice(i, i + batchSize);

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
      console.log(`Sent batch ${i / batchSize + 1} successfully`);
    }
  }
}
