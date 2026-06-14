import "server-only";
import { prisma } from "@/server/db";
import { EVENTS_PAGE_URL } from "@/server/constants";
import { getShortEventUrl } from "@/server/services/eventQueryService";

const LINE_MULTICAST_ENDPOINT = "https://api.line.me/v2/bot/message/multicast";
const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";

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
  url: string;
  imageUrl: string | null;
  eventDate: Date | null;
  eventEndDate: Date | null;
  source: { name: string };
}

// LINE message shapes used by the notification senders
export type LineMessage =
  | { type: "text"; text: string }
  | { type: "flex"; altText: string; contents: unknown };

/**
 * Canonical input for a single carousel card. All LINE event deliveries
 * (cron notifications and webhook replies) build cards from this shape.
 */
export interface LineEventCard {
  id: string;
  title: string;
  sourceId: string;
  sourceName: string;
  url: string;
  imageUrl: string | null;
  eventDate: Date | null;
  eventEndDate: Date | null;
}

// Flex carousel constraints
const MAX_CAROUSEL_BUBBLES = 12; // LINE hard limit
const MAX_EVENT_CARDS = MAX_CAROUSEL_BUBBLES - 1; // reserve 1 for the "see all" card
const MAX_ALT_TEXT_CHARS = 400; // LINE altText limit
// Accent color for CTA buttons (beer amber)
const ACCENT_COLOR = "#C8741E";
const SUBTLE_COLOR = "#999999";
const TEXT_COLOR = "#333333";

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

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * Format an event date range as "6/20(土)" or "6/20(土)〜6/22(月)".
 * Uses the same getMonth()/getDate() convention as the rest of the app
 * (eventDate is stored at 0:00) so display stays consistent.
 */
function formatEventDate(start: Date | null, end: Date | null): string | null {
  if (!start) return null;
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_JA[d.getDay()]})`;
  if (end && end.getTime() !== start.getTime()) {
    return `${fmt(start)}〜${fmt(end)}`;
  }
  return fmt(start);
}

// LINE Flex image requirements: HTTPS, JPEG/PNG, URL <= 2000 chars.
const LINE_FLEX_IMAGE_MAX_URL = 2000;

/**
 * Whether a scraped imageUrl is safe to use as a Flex hero image.
 * LINE rejects an unsupported image URL with a 400 for the ENTIRE
 * multicast/push, so one bad og:image would block the whole batch.
 * We only accept HTTPS JPEG/PNG and fall back to the text card otherwise.
 */
function isLineFlexImageUrl(imageUrl: string | null): imageUrl is string {
  if (typeof imageUrl !== "string") return false;
  if (!imageUrl.startsWith("https://")) return false;
  if (imageUrl.length > LINE_FLEX_IMAGE_MAX_URL) return false;
  let pathname: string;
  try {
    pathname = new URL(imageUrl).pathname.toLowerCase();
  } catch {
    return false;
  }
  return /\.(jpe?g|png)$/.test(pathname);
}

/**
 * Build the carousel altText (shown in the notification banner / talk list
 * and as a fallback on clients that cannot render Flex messages).
 */
function buildAltText(events: LineEventCard[]): string {
  const head = `🍺 新着ビールイベントが${events.length}件届きました`;
  const firstTitle = events[0]?.title;
  const text = firstTitle ? `${head}\n・${firstTitle} ほか` : head;
  return clampAltText(text);
}

/** Clamp arbitrary altText to LINE's limit. */
function clampAltText(text: string): string {
  return text.length > MAX_ALT_TEXT_CHARS
    ? text.slice(0, MAX_ALT_TEXT_CHARS - 1) + "…"
    : text;
}

/**
 * Build a single event bubble. Image-rich (hero) when imageUrl is a valid
 * HTTPS image, otherwise a text-only card with a thin separator (hybrid).
 */
function buildEventBubble(event: LineEventCard): unknown {
  const emoji = SOURCE_EMOJIS[event.sourceId] || "📅";
  const label = SOURCE_LABELS[event.sourceId] || event.sourceName;
  const detailUrl = getShortEventUrl(event.id);
  const dateStr = formatEventDate(event.eventDate, event.eventEndDate);
  // Only use the hero image when it meets LINE's Flex image requirements
  // (HTTPS JPEG/PNG); otherwise fall back to the text card.
  const hasImage = isLineFlexImageUrl(event.imageUrl);

  const bodyContents: unknown[] = [
    {
      type: "text",
      text: `${emoji} ${label}`,
      size: "xs",
      color: SUBTLE_COLOR,
      weight: "bold",
    },
  ];

  // Text-only card gets a thin separator under the source label.
  if (!hasImage) {
    bodyContents.push({ type: "separator", margin: "sm" });
  }

  bodyContents.push({
    type: "text",
    text: event.title,
    weight: "bold",
    size: "md",
    color: TEXT_COLOR,
    wrap: true,
    maxLines: 3,
    margin: "md",
  });

  if (dateStr) {
    bodyContents.push({
      type: "text",
      text: `📅 ${dateStr}`,
      size: "sm",
      color: "#666666",
      wrap: true,
      margin: "sm",
    });
  }

  return {
    type: "bubble",
    size: "kilo",
    ...(hasImage
      ? {
          hero: {
            type: "image",
            url: event.imageUrl,
            size: "full",
            aspectRatio: "20:13",
            aspectMode: "cover",
            action: { type: "uri", uri: detailUrl },
          },
        }
      : {}),
    body: {
      type: "box",
      layout: "vertical",
      spacing: "none",
      contents: bodyContents,
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "sm",
          color: ACCENT_COLOR,
          action: { type: "uri", label: "詳細を見る", uri: detailUrl },
        },
      ],
    },
  };
}

/**
 * Build the trailing "see all" bubble. Shows "他N件" when some events were
 * not included in the carousel.
 */
function buildSeeAllBubble(remaining: number, overflowUrl: string): unknown {
  const contents: unknown[] = [];
  if (remaining > 0) {
    contents.push({
      type: "text",
      text: `他 ${remaining} 件`,
      weight: "bold",
      size: "xl",
      align: "center",
      color: TEXT_COLOR,
    });
  }
  contents.push({
    type: "text",
    text: "すべてのイベントを見る",
    size: "sm",
    color: SUBTLE_COLOR,
    align: "center",
    wrap: true,
  });

  return {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      justifyContent: "center",
      spacing: "md",
      contents,
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "sm",
          color: TEXT_COLOR,
          action: { type: "uri", label: "一覧を見る", uri: overflowUrl },
        },
      ],
    },
  };
}

/** Map a DB notification event to the canonical card shape. */
function toLineEventCard(event: EventForNotification): LineEventCard {
  return {
    id: event.id,
    title: event.title,
    sourceId: event.sourceId,
    sourceName: event.source.name,
    url: event.url,
    imageUrl: event.imageUrl,
    eventDate: event.eventDate,
    eventEndDate: event.eventEndDate,
  };
}

/**
 * Build a LINE Flex carousel message from events (horizontal swipe).
 * Shows up to MAX_EVENT_CARDS event cards plus a trailing "see all" card.
 * Pass `altText` to override the default notification-preview text
 * (used by webhook replies such as 今週のイベント / イベント).
 */
export function buildLineFlexMessage(
  events: LineEventCard[],
  overflowUrl: string,
  options?: { altText?: string }
): LineMessage {
  const shown = events.slice(0, MAX_EVENT_CARDS);
  const remaining = events.length - shown.length;

  const bubbles: unknown[] = shown.map(buildEventBubble);
  bubbles.push(buildSeeAllBubble(remaining, overflowUrl));

  return {
    type: "flex",
    altText: options?.altText ? clampAltText(options.altText) : buildAltText(events),
    contents: { type: "carousel", contents: bubbles },
  };
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

  // Track successful recipients and their newest event createdAt
  // We use the newest createdAt instead of `now` to avoid skipping events
  // created during the notification window
  const successfulUsers: Array<{ userId: string; newestEventCreatedAt: Date }> = [];
  const successfulGroups: Array<{ groupId: string; newestEventCreatedAt: Date }> = [];
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

    // Get the newest createdAt from the events (events are sorted desc by createdAt)
    const newestEventCreatedAt = events[0]!.createdAt;

    maxEventsNotified = Math.max(maxEventsNotified, events.length);
    const message = buildLineFlexMessage(events.map(toLineEventCard), EVENTS_PAGE_URL);
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
          messages: [message],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error("LINE multicast error", res.status, body);
      } else {
        console.log(`Sent to user batch ${Math.floor(i / batchSize) + 1} successfully`);
        batch.forEach((userId) => {
          successfulUsers.push({ userId, newestEventCreatedAt });
        });
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

    // Get the newest createdAt from the events (events are sorted desc by createdAt)
    const newestEventCreatedAt = events[0]!.createdAt;

    maxEventsNotified = Math.max(maxEventsNotified, events.length);
    const message = buildLineFlexMessage(events.map(toLineEventCard), EVENTS_PAGE_URL);

    console.log(`Sending ${events.length} events to ${group.type} ${group.id}`);

    const res = await fetch(LINE_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: group.id,
        messages: [message],
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
      successfulGroups.push({ groupId: group.id, newestEventCreatedAt });
    }
  }

  const anySent = successfulUsers.length > 0 || successfulGroups.length > 0;

  // Update lastNotifiedAt for successful recipients
  // Use the newest event createdAt instead of `now` to avoid skipping events
  // created during the notification window
  for (const { userId, newestEventCreatedAt } of successfulUsers) {
    await prisma.lineSubscriber.update({
      where: { userId },
      data: { lastNotifiedAt: newestEventCreatedAt },
    });
  }
  if (successfulUsers.length > 0) {
    console.log(`Updated lastNotifiedAt for ${successfulUsers.length} users`);
  }

  for (const { groupId, newestEventCreatedAt } of successfulGroups) {
    await prisma.lineGroup.update({
      where: { id: groupId },
      data: { lastNotifiedAt: newestEventCreatedAt },
    });
  }
  if (successfulGroups.length > 0) {
    console.log(`Updated lastNotifiedAt for ${successfulGroups.length} groups`);
  }

  return {
    sent: anySent,
    userCount: successfulUsers.length,
    groupCount: successfulGroups.length,
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
