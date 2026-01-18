-- Update default value for notificationDays from 1 to 7 (weekly notification)
ALTER TABLE "LineSubscriber" ALTER COLUMN "notificationDays" SET DEFAULT 7;
ALTER TABLE "LineGroup" ALTER COLUMN "notificationDays" SET DEFAULT 7;
