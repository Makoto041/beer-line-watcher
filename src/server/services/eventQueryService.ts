import { prisma } from "@/server/db";

/**
 * Get events within a date range
 */
export async function getEventsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Array<{ title: string; url: string; sourceName: string }>> {
  const events = await prisma.event.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      source: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20, // Limit to 20 events
  });

  return events.map((event) => ({
    title: event.title,
    url: event.url,
    sourceName: event.source.name,
  }));
}

/**
 * Get this week's events (from today to 7 days from now)
 */
export async function getThisWeeksEvents(): Promise<
  Array<{ title: string; url: string; sourceName: string }>
> {
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);

  return getEventsByDateRange(now, nextWeek);
}

/**
 * Format events as LINE message text
 */
export function formatEventsForLine(
  events: Array<{ title: string; url: string; sourceName: string }>
): string {
  if (events.length === 0) {
    return "今週のイベントは見つかりませんでした。";
  }

  const lines = ["📅 今週のイベント\n"];

  events.forEach((event, index) => {
    lines.push(`${index + 1}. [${event.sourceName}] ${event.title}`);
    lines.push(`   ${event.url}\n`);
  });

  return lines.join("\n");
}
