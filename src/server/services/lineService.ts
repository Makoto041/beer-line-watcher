import "server-only";
import { prisma } from "@/server/db";
import { EVENTS_PAGE_URL } from "@/server/constants";
import { getShortEventUrl } from "@/server/services/eventQueryService";

const LINE_MULTICAST_ENDPOINT = "https://api.line.me/v2/bot/message/multicast";
const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";

// LINE message character limit
const MAX_LINE_CHARS = 5000;

// Source display configuration
const SOURCE_EMOJIS: Record<string, string> = {
  "beergirl-calendar": "🍺",
  "alwayslovebeer-calendar": "🗓️",
  "walkerplus": "🍷",
  "beerfestival": "🎪",
};
const SOURCE_LABELS: Record<string, string> = {
  "beergirl-calendar": "ビール女子",
  "alwayslovebeer-calendar": "全国ビールイベント",
  "walkerplus": "Walkerplus",
  "beerfestival": "ビアフェス情報",
};

interface EventForNotification {
  id: string;
  title: string;
  sourceId: string;
  createdAt: Date;
  source: { name: string };
}

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
 * Build LINE message from events with character limit enforcement
 */
function buildLineMessage(
  events: EventForNotification[],
  overflowUrlSuffix: string
): string {
  if (events.length === 0) return "";

  const header = "🍺 新着ビールイベント\n\n";
  const separator = "\n\n";

  const items = events.map((e) => {
    const emoji = SOURCE_EMOJIS[e.sourceId] || "📅";
    const label = SOURCE_LABELS[e.sourceId] || e.source.name;
    return `${emoji}[${label}] ${e.title}\n${getShortEventUrl(e.id)}`;
  });

  // First, try to include all items without overflow suffix
  let fullMessage = header;
  for (let i = 0; i < items.length; i++) {
    fullMessage += (i === 0 ? "" : separator) + items[i];
  }

  // If everything fits, return as-is
  if (fullMessage.length <= MAX_LINE_CHARS) {
    return fullMessage;
  }

  // Otherwise, we need to truncate and add overflow suffix
  let result = header;
  let includedCount = 0;

  for (const item of items) {
    const nextAddition = (includedCount === 0 ? "" : separator) + item;
    const potentialLength = result.length + nextAddition.length;

    const remainingIfBreak = items.length - includedCount;
    const suffixIfBreak = `\n\n…他${remainingIfBreak}件あります。\n詳しくはこちら: ${overflowUrlSuffix}`;

    if (potentialLength + suffixIfBreak.length > MAX_LINE_CHARS) {
      break;
    }

    result += nextAddition;
    includedCount++;
  }

  const remainingCount = items.length - includedCount;
  if (remainingCount > 0) {
    result += `\n\n…他${remainingCount}件あります。\n詳しくはこちら: ${overflowUrlSuffix}`;
  }

  if (result.length > MAX_LINE_CHARS) {
    result = result.slice(0, MAX_LINE_CHARS - 3) + "...";
  }

  return result;
}

/**
 * Get events created after the given date (for notification)
 * Only includes events created within last 7 days to avoid notifying very old events
 */
async function getEventsForRecipient(
  lastNotifiedAt: Date | null
): Promise<EventForNotification[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // If never notified, get events from last 7 days
  // Otherwise, get events created after lastNotifiedAt (but still within 7 days)
  const createdAfter = lastNotifiedAt && lastNotifiedAt > sevenDaysAgo
    ? lastNotifiedAt
    : sevenDaysAgo;

  return prisma.event.findMany({
    where: {
      createdAt: { gt: createdAfter },
    },
    include: { source: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Send LINE notifications to all eligible recipients
 * Each recipient gets events created after their lastNotifiedAt
 * @returns Object containing success status and counts
 */
export async function sendLineNotifications(): Promise<{
  sent: boolean;
  userCount: number;
  groupCount: number;
  totalEvents: number;
}> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN not set");
    return { sent: false, userCount: 0, groupCount: 0, totalEvents: 0 };
  }

  const now = new Date();

  // Get all subscribers and groups with their notification settings
  const subscribers = await prisma.lineSubscriber.findMany({
    select: { userId: true, notificationDays: true, lastNotifiedAt: true },
  });

  const groups = await prisma.lineGroup.findMany({
    select: { id: true, type: true, notificationDays: true, lastNotifiedAt: true },
  });

  // Filter based on notification interval
  const eligibleSubscribers = subscribers.filter((s) =>
    shouldNotify(s.lastNotifiedAt, s.notificationDays)
  );
  const eligibleGroups = groups.filter((g) =>
    shouldNotify(g.lastNotifiedAt, g.notificationDays)
  );

  console.log(
    `Notification eligibility: ${eligibleSubscribers.length}/${subscribers.length} users, ${eligibleGroups.length}/${groups.length} groups/rooms`
  );

  if (eligibleSubscribers.length === 0 && eligibleGroups.length === 0) {
    console.log("No recipients to send message to (all filtered by notification interval)");
    return { sent: false, userCount: 0, groupCount: 0, totalEvents: 0 };
  }

  const successfulUserIds: string[] = [];
  const successfulGroupIds: string[] = [];
  let maxEventsNotified = 0;

  // Group subscribers by lastNotifiedAt to minimize event queries
  // For simplicity, we'll query events for each unique lastNotifiedAt value
  const usersByLastNotified = new Map<string, typeof eligibleSubscribers>();
  for (const sub of eligibleSubscribers) {
    const key = sub.lastNotifiedAt?.toISOString() ?? "null";
    if (!usersByLastNotified.has(key)) {
      usersByLastNotified.set(key, []);
    }
    usersByLastNotified.get(key)!.push(sub);
  }

  // Process users grouped by lastNotifiedAt
  for (const [, subs] of usersByLastNotified) {
    const lastNotifiedAt = subs[0]!.lastNotifiedAt;
    const events = await getEventsForRecipient(lastNotifiedAt);

    if (events.length === 0) {
      console.log(`No new events for users with lastNotifiedAt=${lastNotifiedAt?.toISOString() ?? "null"}`);
      continue;
    }

    maxEventsNotified = Math.max(maxEventsNotified, events.length);
    const message = buildLineMessage(events, EVENTS_PAGE_URL);
    const userIds = subs.map((s) => s.userId);

    console.log(`Sending ${events.length} events to ${userIds.length} users (lastNotifiedAt=${lastNotifiedAt?.toISOString() ?? "null"})`);

    // LINE multicast API has a limit of 500 recipients per request
    const batchSize = 500;
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
        console.log(`Sent to user batch ${Math.floor(i / batchSize) + 1} successfully`);
        successfulUserIds.push(...batch);
      }
    }
  }

  // Process groups individually (each may have different lastNotifiedAt)
  for (const group of eligibleGroups) {
    const events = await getEventsForRecipient(group.lastNotifiedAt);

    if (events.length === 0) {
      console.log(`No new events for ${group.type} ${group.id}`);
      continue;
    }

    maxEventsNotified = Math.max(maxEventsNotified, events.length);
    const message = buildLineMessage(events, EVENTS_PAGE_URL);

    console.log(`Sending ${events.length} events to ${group.type} ${group.id}`);

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

  const anySent = successfulUserIds.length > 0 || successfulGroupIds.length > 0;

  // Update lastNotifiedAt for successful recipients
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

  return {
    sent: anySent,
    userCount: successfulUserIds.length,
    groupCount: successfulGroupIds.length,
    totalEvents: maxEventsNotified,
  };
}

// Keep the old function for backwards compatibility with other code paths
// (e.g., LINE webhook commands that send immediate messages)
export async function sendLineBroadcast(message: string): Promise<{ sent: boolean; recipientCount: number }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN not set");
    return { sent: false, recipientCount: 0 };
  }

  const now = new Date();

  const subscribers = await prisma.lineSubscriber.findMany({
    select: { userId: true, notificationDays: true, lastNotifiedAt: true },
  });

  const eligibleSubscribers = subscribers.filter((s) =>
    shouldNotify(s.lastNotifiedAt, s.notificationDays)
  );
  const userIds = eligibleSubscribers.map((s) => s.userId);

  const groups = await prisma.lineGroup.findMany({
    select: { id: true, type: true, notificationDays: true, lastNotifiedAt: true },
  });

  const eligibleGroups = groups.filter((g) =>
    shouldNotify(g.lastNotifiedAt, g.notificationDays)
  );

  if (userIds.length === 0 && eligibleGroups.length === 0) {
    return { sent: false, recipientCount: 0 };
  }

  const batchSize = 500;
  const successfulUserIds: string[] = [];
  const successfulGroupIds: string[] = [];

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

    if (res.ok) {
      successfulUserIds.push(...batch);
    }
  }

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

    if (res.ok) {
      successfulGroupIds.push(group.id);
    }
  }

  const totalSuccessful = successfulUserIds.length + successfulGroupIds.length;

  if (successfulUserIds.length > 0) {
    await prisma.lineSubscriber.updateMany({
      where: { userId: { in: successfulUserIds } },
      data: { lastNotifiedAt: now },
    });
  }

  if (successfulGroupIds.length > 0) {
    await prisma.lineGroup.updateMany({
      where: { id: { in: successfulGroupIds } },
      data: { lastNotifiedAt: now },
    });
  }

  return { sent: totalSuccessful > 0, recipientCount: totalSuccessful };
}
