import { prisma } from "@/server/db";
import type { CrawledItem } from "../crawlers/types";
import { createHash } from "crypto";
import { calculateDuplicateScore } from "../utils/duplicateDetector";

// Threshold for duplicate detection (0.6 = 60% similarity)
const DUPLICATE_THRESHOLD = 0.6;

// Source priority (lower index = higher priority). Mirrors removeDuplicates()
// in duplicateDetector so the preferred source "owns" a shared event.
const SOURCE_PRIORITY = [
  "beergirl-calendar",
  "walkerplus-liquor-kanto",
  "beerfestival-info",
  "alwayslovebeer-calendar",
];
function sourceRank(sourceId: string): number {
  const i = SOURCE_PRIORITY.indexOf(sourceId);
  return i === -1 ? 999 : i;
}

export interface UpsertResult {
  newEvents: Array<{ id: string; title: string; url: string; sourceId: string }>;
  updatedEvents: Array<{ id: string; title: string; url: string; sourceId: string }>;
  skippedDuplicates: number;
  skippedExisting: number;
}

export async function upsertEventsAndGetNewOnes(items: CrawledItem[]): Promise<UpsertResult> {
  const newEvents: { id: string; title: string; url: string; sourceId: string }[] = [];
  const updatedEvents: { id: string; title: string; url: string; sourceId: string }[] = [];
  let skippedDuplicates = 0;
  let skippedExisting = 0;

  // Get existing events from the last 60 days for duplicate checking
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const existingEvents = await prisma.event.findMany({
    where: {
      createdAt: { gte: sixtyDaysAgo },
    },
    select: {
      id: true,
      title: true,
      url: true,
      sourceId: true,
      eventDate: true,
      eventEndDate: true,
      createdAt: true,
    },
  });

  for (const item of items) {
    // Ensure Source exists (auto-create if missing)
    const origin = new URL(item.url).origin;
    await prisma.source.upsert({
      where: { id: item.sourceId },
      update: {},
      create: {
        id: item.sourceId,
        name: getSourceDisplayName(item.sourceId),
        url: origin,
      },
    });

    // Check if Event already exists by ID
    const id = makeEventId(item);
    const exists = await prisma.event.findUnique({
      where: { id },
      select: { eventDate: true, eventEndDate: true, imageUrl: true },
    });

    // 既存イベントでも、スクレイピングで新たに eventDate/eventEndDate/imageUrl を取得できたら更新する
    if (exists) {
      const needsUpdate =
        (item.eventDate && (!exists.eventDate || exists.eventDate.getTime() !== item.eventDate.getTime())) ||
        (item.eventEndDate && (!exists.eventEndDate || exists.eventEndDate.getTime() !== item.eventEndDate.getTime())) ||
        (item.imageUrl && !exists.imageUrl);

      if (needsUpdate) {
        await prisma.event.update({
          where: { id },
          data: {
            eventDate: item.eventDate,
            eventEndDate: item.eventEndDate,
            imageUrl: item.imageUrl || exists.imageUrl,
          },
        });
        updatedEvents.push({
          id,
          title: item.title,
          url: item.url,
          sourceId: item.sourceId,
        });
        console.log(`Updated event: "${item.title}" (date/image info updated)`);
      } else {
        skippedExisting++;
      }
      continue;
    }

    // Check for duplicate events from other sources
    const dupMatch = findDuplicateMatch(item, existingEvents);
    let createdAtOverride: Date | undefined;
    if (dupMatch) {
      if (sourceRank(dupMatch.existing.sourceId) <= sourceRank(item.sourceId)) {
        // Existing event is from an equal/higher-priority source → skip.
        skippedDuplicates++;
        continue;
      }
      // Incoming source is preferred (e.g. beergirl over alwayslovebeer):
      // store it so the preferred source owns the event, but inherit the
      // existing row's createdAt so subscribers aren't re-notified.
      createdAtOverride = dupMatch.existing.createdAt;
      console.log(
        `Preferred-source duplicate kept: "${item.title}" (${item.sourceId} > ${dupMatch.existing.sourceId})`
      );
    }

    // Create new Event
    await prisma.event.create({
      data: {
        id,
        sourceId: item.sourceId,
        title: item.title,
        url: item.url,
        imageUrl: item.imageUrl,
        eventDate: item.eventDate,
        eventEndDate: item.eventEndDate,
        ...(createdAtOverride ? { createdAt: createdAtOverride } : {}),
      },
    });

    // Add to existing events for further duplicate checking
    existingEvents.push({
      id,
      title: item.title,
      url: item.url,
      sourceId: item.sourceId,
      eventDate: item.eventDate || null,
      eventEndDate: item.eventEndDate || null,
      createdAt: createdAtOverride ?? new Date(),
    });

    newEvents.push({
      id,
      title: item.title,
      url: item.url,
      sourceId: item.sourceId,
    });
    console.log(`New event: "${item.title}"`);
  }

  return { newEvents, updatedEvents, skippedDuplicates, skippedExisting };
}

type ExistingEvent = {
  id: string;
  title: string;
  url: string;
  sourceId: string;
  eventDate: Date | null;
  eventEndDate: Date | null;
  createdAt: Date;
};

/**
 * Find the best cross-source duplicate of an item among existing events.
 * Returns the highest-scoring match (>= threshold) from a different source,
 * or null. The caller decides whether to skip based on source priority.
 */
function findDuplicateMatch(
  item: CrawledItem,
  existingEvents: ExistingEvent[]
): { existing: ExistingEvent; score: number } | null {
  let best: { existing: ExistingEvent; score: number } | null = null;

  for (const existing of existingEvents) {
    // Skip same source (already handled by ID dedup)
    if (item.sourceId === existing.sourceId) continue;

    const score = calculateDuplicateScore(
      {
        title: item.title,
        url: item.url,
        eventDate: item.eventDate,
        sourceId: item.sourceId,
      },
      {
        title: existing.title,
        url: existing.url,
        eventDate: existing.eventDate || undefined,
        sourceId: existing.sourceId,
      }
    );

    if (score >= DUPLICATE_THRESHOLD && (!best || score > best.score)) {
      best = { existing, score };
    }
  }

  return best;
}

/**
 * Get display name for source
 */
function getSourceDisplayName(sourceId: string): string {
  const names: Record<string, string> = {
    "beergirl-calendar": "ビール女子カレンダー",
    "alwayslovebeer-calendar": "全国ビールイベントカレンダー",
    "walkerplus-liquor-kanto": "ウォーカープラス",
    "beerfestival-info": "ビアフェス情報",
  };
  return names[sourceId] || sourceId;
}

function makeEventId(item: CrawledItem): string {
  return createHash("sha256")
    .update(item.sourceId + "::" + item.externalId)
    .digest("hex")
    .slice(0, 32);
}
