-- Add optional eventDate to Event for scraped dates
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "eventDate" TIMESTAMP(3);
