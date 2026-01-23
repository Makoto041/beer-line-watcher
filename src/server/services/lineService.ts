import "server-only";
import { prisma } from "@/server/db";

const LINE_MULTICAST_ENDPOINT = "https://api.line.me/v2/bot/message/multicast";
const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";

/**
 * 通知間隔（notificationDays）に基づいて通知対象かどうかを判定
 * @param lastNotifiedAt 最後に通知した日時
 * @param notificationDays 通知間隔（日数）
 * @returns 通知すべきならtrue
 */
function shouldNotify(
  lastNotifiedAt: Date | null,
  notificationDays: number
): boolean {
  if (!lastNotifiedAt) {
    // 一度も通知していない場合は通知する
    return true;
  }

  const now = new Date();
  const daysSinceLastNotification = Math.floor(
    (now.getTime() - lastNotifiedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceLastNotification >= notificationDays;
}

/**
 * Send LINE broadcast with event notification tracking
 * @param message The message to send
 * @param eventIds List of event IDs included in this notification (to mark as notified on success)
 * @returns Object containing success status and whether any recipients were notified
 */
export async function sendLineBroadcast(
  message: string,
  eventIds?: string[]
): Promise<{ sent: boolean; recipientCount: number }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN not set");
    return { sent: false, recipientCount: 0 };
  }

  const now = new Date();

  // Get all subscribers (users) with their notification settings
  const subscribers = await prisma.lineSubscriber.findMany({
    select: { userId: true, notificationDays: true, lastNotifiedAt: true },
  });

  // Filter subscribers based on notification interval
  const eligibleSubscribers = subscribers.filter((s) =>
    shouldNotify(s.lastNotifiedAt, s.notificationDays)
  );
  const userIds = eligibleSubscribers.map((s) => s.userId);

  // Get all groups with their notification settings
  const groups = await prisma.lineGroup.findMany({
    select: { id: true, type: true, notificationDays: true, lastNotifiedAt: true },
  });

  // Filter groups based on notification interval
  const eligibleGroups = groups.filter((g) =>
    shouldNotify(g.lastNotifiedAt, g.notificationDays)
  );

  console.log(
    `Notification eligibility: ${userIds.length}/${subscribers.length} users, ${eligibleGroups.length}/${groups.length} groups/rooms`
  );

  if (userIds.length === 0 && eligibleGroups.length === 0) {
    console.log("No recipients to send message to (all filtered by notification interval)");
    return { sent: false, recipientCount: 0 };
  }

  console.log(
    `Sending to ${userIds.length + eligibleGroups.length} recipients (${userIds.length} users, ${eligibleGroups.length} groups/rooms)`
  );

  // LINE multicast API has a limit of 500 recipients per request
  // Split into batches if needed
  const batchSize = 500;
  const successfulUserIds: string[] = [];
  const successfulGroupIds: string[] = [];

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
      successfulUserIds.push(...batch);
    }
  }

  // 2) Send to groups/rooms via push API (multicast does not accept group IDs)
  for (const group of eligibleGroups) {
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
      successfulGroupIds.push(group.id);
    }
  }

  const totalSuccessful = successfulUserIds.length + successfulGroupIds.length;
  const anySent = totalSuccessful > 0;

  // 3) Update lastNotifiedAt for successful recipients
  if (successfulUserIds.length > 0) {
    await prisma.lineSubscriber.updateMany({
      where: { userId: { in: successfulUserIds } },
      data: { lastNotifiedAt: now },
    });
    console.log(`Updated lastNotifiedAt for ${successfulUserIds.length} users`);
  }

  if (successfulGroupIds.length > 0) {
    await prisma.lineGroup.updateMany({
      where: { id: { in: successfulGroupIds } },
      data: { lastNotifiedAt: now },
    });
    console.log(`Updated lastNotifiedAt for ${successfulGroupIds.length} groups`);
  }

  // 4) Mark events as notified if any recipients were successfully notified
  if (anySent && eventIds && eventIds.length > 0) {
    await prisma.event.updateMany({
      where: { id: { in: eventIds } },
      data: { notifiedAt: now },
    });
    console.log(`Marked ${eventIds.length} events as notified`);
  }

  return { sent: anySent, recipientCount: totalSuccessful };
}
