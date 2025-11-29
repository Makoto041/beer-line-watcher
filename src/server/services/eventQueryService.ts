import { prisma } from "@/server/db";

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
        eventDate: "asc", // Events with dates first, sorted by date
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
        eventDate: "asc",
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
 */
export async function getThisWeeksEvents(): Promise<
  Array<{ title: string; url: string; sourceName: string }>
> {
  return getUpcomingEvents(7);
}

/**
 * Format events as LINE message text
 */
export function formatEventsForLine(
  events: Array<{ title: string; url: string; sourceName: string }>
): string {
  if (events.length === 0) {
    return "イベントが見つかりませんでした。";
  }

  const lines = ["📋 最新のイベント情報\n"];

  events.forEach((event, index) => {
    lines.push(`${index + 1}. [${event.sourceName}] ${event.title}`);
    lines.push(`   ${event.url}\n`);
  });

  return lines.join("\n");
}
