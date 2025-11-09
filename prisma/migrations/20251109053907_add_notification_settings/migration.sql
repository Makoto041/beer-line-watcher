-- AlterTable
ALTER TABLE "LineSubscriber" ADD COLUMN     "lastNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "notificationDays" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "LineGroup" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "notificationDays" INTEGER NOT NULL DEFAULT 1,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineGroup_pkey" PRIMARY KEY ("id")
);
