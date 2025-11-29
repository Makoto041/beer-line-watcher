import { prisma } from "@/server/db";
import type { CrawledItem } from "../crawlers/types";
import { createHash } from "crypto";

export async function upsertEventsAndGetNewOnes(items: CrawledItem[]) {
  const newOnes: { title: string; url: string; sourceId: string }[] = [];

  for (const item of items) {
    // Ensure Source exists (auto-create if missing)
    const origin = new URL(item.url).origin;
    await prisma.source.upsert({
      where: { id: item.sourceId },
      update: {},
      create: {
        id: item.sourceId,
        name: item.sourceId,
        url: origin,
      },
    });

    // Check if Event already exists
    const id = makeEventId(item);
    const exists = await prisma.event.findUnique({ where: { id } });

    // 既存イベントでも、スクレイピングで新たに eventDate を取得できたら更新する
    if (exists) {
      if (item.eventDate && (!exists.eventDate || exists.eventDate.getTime() !== item.eventDate.getTime())) {
        await prisma.event.update({
          where: { id },
          data: { eventDate: item.eventDate },
        });
        newOnes.push({
          title: item.title,
          url: item.url,
          sourceId: item.sourceId,
        });
      }
      continue;
    }

    // Create new Event
    await prisma.event.create({
      data: {
        id,
        sourceId: item.sourceId,
        title: item.title,
        url: item.url,
        eventDate: item.eventDate,
      },
    });

    newOnes.push({
      title: item.title,
      url: item.url,
      sourceId: item.sourceId,
    });
  }

  return newOnes;
}

function makeEventId(item: CrawledItem): string {
  return createHash("sha256")
    .update(item.sourceId + "::" + item.externalId)
    .digest("hex")
    .slice(0, 32);
}
