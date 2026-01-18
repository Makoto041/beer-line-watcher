import { prisma } from "@/server/db";
import { EVENTS_PAGE_URL } from "@/server/constants";

/**
 * Get upcoming events (events with eventDate in the future or within last 30 days)
 */
export async function getUpcomingEvents(
  daysAhead: number = 30
): Promise<Array<{ title: string; url: string; sourceName: string }>> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const future = new Date();
  future.setDate(now.getDate() + daysAhead);

  const events = await prisma.event.findMany({
    where: {
      OR: [
        // Events with future eventDate
        {
          eventDate: {
            // eventDate は 0:00 固定で入るため、当日分も拾うよう「今日の開始時刻」基準で比較
            gte: startOfToday,
            lte: future,
          },
        },
        // Recent events without eventDate (fallback)
        {
          eventDate: null,
          createdAt: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      ],
    },
    include: {
      source: true,
    },
    orderBy: [
      {
        eventDate: { sort: "asc", nulls: "last" }, // Events with dates first, sorted by date
      },
      {
        createdAt: "desc", // Then by creation date
      },
    ],
    take: 20,
  });

  return events.map((event) => ({
    title: event.title,
    url: event.url,
    sourceName: event.source.name,
  }));
}

/**
 * Get latest N events from database
 */
export async function getLatestEvents(
  limit: number = 20
): Promise<Array<{ title: string; url: string; sourceName: string }>> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const events = await prisma.event.findMany({
    where: {
      OR: [
        // Future events
        {
          eventDate: {
            gte: startOfToday,
          },
        },
        // Recent events without date
        {
          eventDate: null,
        },
      ],
    },
    include: {
      source: true,
    },
    orderBy: [
      {
        eventDate: { sort: "asc", nulls: "last" },
      },
      {
        createdAt: "desc",
      },
    ],
    take: limit,
  });

  return events.map((event) => ({
    title: event.title,
    url: event.url,
    sourceName: event.source.name,
  }));
}

/**
 * Get this week's events (upcoming events within 7 days)
 * Only from Beergirl calendar, sorted by event date, max 5 items
 */
export async function getThisWeeksEvents(): Promise<
  Array<{ title: string; url: string; sourceName: string; eventDate?: Date }>
> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const oneWeekLater = new Date();
  oneWeekLater.setDate(now.getDate() + 7);

  const events = await prisma.event.findMany({
    where: {
      sourceId: "beergirl-calendar", // Only Beergirl calendar events
      eventDate: {
        gte: startOfToday,
        lte: oneWeekLater,
      },
    },
    include: {
      source: true,
    },
    orderBy: {
      eventDate: "asc", // Sort by event date
    },
    take: 5, // Max 5 events
  });

  return events.map((event) => ({
    title: event.title,
    url: event.url,
    sourceName: event.source.name,
    eventDate: event.eventDate || undefined,
  }));
}

/**
 * Get recent events for "イベント" command (recent 5 events)
 */
export async function getRecentEvents(
  limit: number = 5
): Promise<
  Array<{ title: string; url: string; sourceName: string; eventDate?: Date }>
> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const events = await prisma.event.findMany({
    where: {
      OR: [
        // Future events
        {
          eventDate: {
            gte: startOfToday,
          },
        },
        // Recent events without date (created within last 7 days)
        {
          eventDate: null,
          createdAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      ],
    },
    include: {
      source: true,
    },
    orderBy: [
      {
        eventDate: { sort: "asc", nulls: "last" },
      },
      {
        createdAt: "desc",
      },
    ],
    take: limit,
  });

  return events.map((event) => ({
    title: event.title,
    url: event.url,
    sourceName: event.source.name,
    eventDate: event.eventDate || undefined,
  }));
}

/**
 * Format events as LINE message text
 */
export function formatEventsForLine(
  events: Array<{ title: string; url: string; sourceName: string; eventDate?: Date }>
): string {
  if (events.length === 0) {
    return "今週のイベントが見つかりませんでした。";
  }

  const lines = ["📋 今週のイベント情報（開催日順）\n"];

  events.forEach((event, index) => {
    const dateStr = event.eventDate
      ? `${event.eventDate.getMonth() + 1}/${event.eventDate.getDate()}`
      : "日付未定";
    lines.push(`${index + 1}. [${dateStr}] ${event.title}`);
    lines.push(`   ${event.url}\n`);
  });

  if (events.length === 5) {
    lines.push("※表示は最大5件です。");
    lines.push("詳しくはこちら:");
    lines.push(EVENTS_PAGE_URL);
  }

  return lines.join("\n");
}

/**
 * Format recent events for "イベント" command
 */
export function formatRecentEventsForLine(
  events: Array<{ title: string; url: string; sourceName: string; eventDate?: Date }>
): string {
  if (events.length === 0) {
    return "現在登録されているイベントがありません。";
  }

  const lines = ["🍺 直近のイベント情報\n"];

  events.forEach((event, index) => {
    const dateStr = event.eventDate
      ? `${event.eventDate.getMonth() + 1}/${event.eventDate.getDate()}`
      : "日程未定";
    const sourceEmoji = event.sourceName.includes("ビール女子") ? "🍺" : "🍷";
    lines.push(`${index + 1}. ${sourceEmoji} [${dateStr}] ${event.title}`);
    lines.push(`   ${event.url}\n`);
  });

  lines.push("━━━━━━━━━━━━━━━━━━━━");
  lines.push("📱 すべてのイベントを見る:");
  lines.push(EVENTS_PAGE_URL);

  return lines.join("\n");
}
