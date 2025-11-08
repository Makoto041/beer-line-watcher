import { prisma } from "@/server/db";
import type { CrawledItem } from "../crawlers/types";
import { createHash } from "crypto";

export async function upsertEventsAndGetNewOnes(items: CrawledItem[]) {
  const newOnes: { title: string; url: string; sourceId: string }[] = [];

  for (const item of items) {
    const id = makeEventId(item);

    const exists = await prisma.event.findUnique({ where: { id } });
    if (exists) continue;

    await prisma.event.create({
      data: {
        id,
        sourceId: item.sourceId,
        title: item.title,
        url: item.url,
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
