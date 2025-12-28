---
name: beer-line-watcher
description: Playbook for the Beer Line Watcher repo (Next.js + Prisma + LINE bot for beer event crawling/notifications). Use when updating crawlers, cron/LINE API routes, Prisma models, or running the app locally/deploying.
---

# Beer Line Watcher

## Overview
- Knowledge pack for `/beer-line-watcher`: beer/liquor event aggregator with LINE push + cron-based crawling.
- Covers where key logic lives, how to run/seed, how cron + webhook flows work, and how to extend crawlers.
- See `SPEC.md` (repo root) for the full implementation spec; this skill surfaces the day-to-day runbook.

## Quick Start (local)
- Copy env: `cp .env.example .env` then set secrets (`DATABASE_URL`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`, `CRON_SECRET`).
- Start DB: `./start-database.sh` (Docker/Podman) or provide your own Postgres per `DATABASE_URL`.
- Install deps with `pnpm i` (pkg manager pinned to `pnpm@9`), generate Prisma client (postinstall), seed sources: `pnpm db:seed`.
- Run app: `pnpm dev` (Next.js turbo). Build: `pnpm build`; start: `pnpm start`.

## Core Components (paths)
- Crawlers: `src/server/crawlers/{beergirl,walkerplus}.ts` (+ `types.ts`), date parser `src/server/utils/dateExtractor.ts`.
- Event persistence: `src/server/services/eventService.ts` (hash IDs, upsert + new detection).
- Queries/formatting: `src/server/services/eventQueryService.ts`.
- LINE delivery: `src/server/services/lineService.ts`.
- APIs: cron `src/app/api/cron/sync-events/route.ts`; webhook `src/app/api/line/webhook/route.ts`.
- UI: `src/app/page.tsx` (filterable list), layout/styles in `src/app/layout.tsx`, `src/app/globals.css`.
- Env schema: `src/env.js`; Prisma schema `prisma/schema.prisma`.

## Workflows
- **Cron sync**: `GET /api/cron/sync-events?token=CRON_SECRET` → crawl Beergirl + Walkerplus → `upsertEventsAndGetNewOnes` → broadcast via `sendLineBroadcast` (splits 500 recipients). Token must match `CRON_SECRET`; Vercel cron schedule lives in `vercel.json`.
- **LINE webhook** (`POST /api/line/webhook`): verifies signature when `LINE_CHANNEL_SECRET` set; handles follow/unfollow/join/leave + text commands:
  - "最新情報取得" variants → crawl both sources now, push results to requester.
  - "今週のイベント" → `getThisWeeksEvents` (7 days window) → reply list.
  - "通知 毎日/1週間/2週間/1ヶ月" → set `notificationDays` via upsert on subscriber/group.
  - Group only: `STOP`/`停止` deletes group row (disable); `START`/`開始` recreates (enable).
- **UI query**: `src/app/page.tsx` fetches up to 100 events with `source` + `q` query params (title contains), sorts by `createdAt` desc, shows source badge and timestamp.

## Data Model Notes
- Prisma models: `Source`, `Event`, `LineSubscriber`, `LineGroup` (see `SPEC.md` or `prisma/schema.prisma` for fields).
- Event ID = SHA-256 hash of `sourceId::externalId` truncated to 32 chars; allows dedupe across crawls.
- `eventDate` may be updated on existing rows if newly parsed later.

## Extending Crawlers
- Mirror existing pattern: fetch HTML → regex extract links/titles → filter with `eventKeywords`/`excludeKeywords` → derive absolute URL + `externalId` → optional `eventDate` via `extractDateFromText` → return `CrawledItem[]`.
- Keep `sourceId` stable and seed it in `prisma/seed.ts`; `upsertEventsAndGetNewOnes` auto-creates sources too.
- Add new crawler to `crawlAndGetNewEvents` and cron route if you want it in scheduled runs.

## Operations & Checks
- Manual cron test: `curl "http://localhost:3000/api/cron/sync-events?token=$CRON_SECRET"` after app + DB are up; expect JSON with counts and optional LINE broadcast.
- Manual crawler run in code: `crawlAndGetNewEvents()` returns new events + source totals; `formatCrawlerResultsForLine` produces LINE message text.
- Upcoming events helper: `getThisWeeksEvents()` (7-day window) or `getUpcomingEvents(daysAhead)`.
- No tRPC routers are defined yet; API surface is via Next.js routes above.

## References
- `SPEC.md` (repo root): full implementation spec/architecture.
- `references/runbook.md`: step-by-step ops for local/dev, cron tests, DB maintenance, and LINE webhook checks.
