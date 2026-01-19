import { prisma } from "@/server/db";
import type { CrawledItem } from "../crawlers/types";
import { createHash } from "crypto";
import { calculateDuplicateScore } from "../utils/duplicateDetector";

// Threshold for duplicate detection (0.6 = 60% similarity)
const DUPLICATE_THRESHOLD = 0.6;

export interface UpsertResult {
  newEvents: Array<{ title: string; url: string; sourceId: string }>;
  updatedEvents: Array<{ title: string; url: string; sourceId: string }>;
  skippedDuplicates: number;
  skippedExisting: number;
}

export async function upsertEventsAndGetNewOnes(items: CrawledItem[]): Promise<UpsertResult> {
  const newEvents: { title: string; url: string; sourceId: string }[] = [];
  const updatedEvents: { title: string; url: string; sourceId: string }[] = [];
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
    const isDuplicate = checkForDuplicate(item, existingEvents);
    if (isDuplicate) {
      skippedDuplicates++;
      continue;
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
    });

    newEvents.push({
      title: item.title,
      url: item.url,
      sourceId: item.sourceId,
    });
    console.log(`New event: "${item.title}"`);
  }

  return { newEvents, updatedEvents, skippedDuplicates, skippedExisting };
}

/**
 * Check if an item is a duplicate of any existing event
 */
function checkForDuplicate(
  item: CrawledItem,
  existingEvents: Array<{
    id: string;
    title: string;
    url: string;
    sourceId: string;
    eventDate: Date | null;
    eventEndDate: Date | null;
  }>
): boolean {
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

    if (score >= DUPLICATE_THRESHOLD) {
      console.log(
        `Duplicate detected (${(score * 100).toFixed(1)}%): "${item.title}" ≈ "${existing.title}"`
      );
      return true;
    }
  }
  return false;
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
