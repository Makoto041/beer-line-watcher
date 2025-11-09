import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create Sources
  await prisma.source.upsert({
    where: { id: "beergirl-calendar" },
    update: {},
    create: {
      id: "beergirl-calendar",
      name: "ビール女子",
      url: "https://beergirl.net/beer-event-matome-2017_e/",
      description: "ビール女子のイベントまとめページ",
    },
  });

  await prisma.source.upsert({
    where: { id: "walkerplus-liquor-kanto" },
    update: {},
    create: {
      id: "walkerplus-liquor-kanto",
      name: "ウォーカープラス",
      url: "https://www.walkerplus.com/search/liquor/ar0300/",
      description: "ウォーカープラス お酒イベント（関東）",
    },
  });

  console.log("Sources seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
