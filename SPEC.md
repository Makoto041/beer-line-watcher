# Beer Line Watcher – Implementation Spec

## Overview
- Next.js 15 (App Router) + React 19 app that aggregates beer/liquor event listings, stores them in Postgres via Prisma, and surfaces them on a simple UI and via LINE Bot pushes.
- Event sources are scraped/crawled on demand (LINE command) and via a scheduled cron job; new events are deduped and broadcast to subscribers.
- LINE webhook supports follow/join lifecycle events and text commands for fetching/scheduling notifications.

## Runtime & Dependencies
- Next.js 15 with app directory; Tailwind CSS v4 (minimal global styles).
- Data: Postgres + Prisma Client (output to `generated/prisma`); seeds in `prisma/seed.ts`.
- Messaging: LINE Messaging API (`@line/bot-sdk` types only; direct HTTP requests).
- Utilities: `@t3-oss/env-nextjs` for env validation, `zod` schemas; fetch-based crawlers.

## Data Model (Prisma)
- `Source`: event origin metadata (`id`, `name`, `url`, optional `description`).
- `Event`: hashed `id` of `sourceId + externalId`, `title`, `url`, optional `eventDate`, timestamps.
- `LineSubscriber`: 1:1 user subscriptions with `notificationDays`, `lastNotifiedAt`.
- `LineGroup`: group/room subscriptions with same interval fields as subscribers.

## Crawling & Event Upsert
- Crawlers in `src/server/crawlers/`:
  - `beergirl.ts`: scrapes https://beergirl.net/beer-event-matome-2017_e/, filters titles with event keywords, excludes editorial content, derives `eventDate` via `extractDateFromText`.
  - `walkerplus.ts`: paginates the Walkerplus liquor search pages (Kanto), extracts event links/titles, filters by event keywords, parses dates.
- `extractDateFromText` supports `YYYY年MM月DD日`, `MM月DD日`, `YYYY/MM/DD`, `MM/DD`; fills year rollover for past dates.
- `upsertEventsAndGetNewOnes` hashes each item to a stable `Event` id, ensures `Source` exists, updates `eventDate` if newly discovered, and returns newly inserted/updated events for notifications.

## Scheduled Job
- Endpoint: `GET /api/cron/sync-events?token=CRON_SECRET`.
- Flow: validate `CRON_SECRET` query param → crawl Beergirl & Walkerplus → upsert events → aggregate newly discovered items → broadcast via LINE (`sendLineBroadcast`) to all `LineSubscriber` users and `LineGroup` ids (chunked for multicast).
- Deployment: configured in `vercel.json` cron (`0 0 * * *`); ensure `CRON_SECRET` env matches the query token.

## LINE Webhook
- Endpoint: `POST /api/line/webhook`; optional signature verification when `LINE_CHANNEL_SECRET` set.
- Lifecycle:
  - `follow` (user): upsert `LineSubscriber`, reply with usage instructions.
  - `unfollow` (user): delete `LineSubscriber`.
  - `join` (group/room): upsert `LineGroup`, send greeting; `leave`: delete row.
- Text commands (user or group):
  - “最新情報取得” variants: crawl both sources immediately, upsert, push results (not reply) to requester.
  - “今週のイベント”: fetch upcoming events within 7 days via `getThisWeeksEvents`, reply with formatted list.
  - “通知 毎日/1週間/2週間/1ヶ月”: parse and set `notificationDays` via upsert on subscriber or group.
  - Group-only: `STOP`/`停止` deletes the group row (disable), `START`/`開始` recreates (enable).
- Replies use LINE reply API; follow-up pushes use channel access token.

## Web UI
- `src/app/page.tsx`: server component querying Prisma for up to 100 events with optional `source` and `q` (title substring) filters; renders card grid with source badge and timestamps.
- Styling: gradient dark background, simple search form; dynamic rendering forced for fresh data (`export const dynamic = "force-dynamic"`).

## Environment
- Validated in `src/env.js`: `DATABASE_URL`, `NODE_ENV`, optional `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`, `CRON_SECRET`.
- `.env.example` shows expected variables (replace placeholders/secrets before deployment).
- `next.config.js` imports env validation; skip via `SKIP_ENV_VALIDATION=1` for builds.

## Local Development
- Install deps (`pnpm i` recommended; packageManager `pnpm@9`).
- Start Postgres: `cp .env.example .env` → adjust `DATABASE_URL` → `./start-database.sh` (Docker/Podman helper).
- Generate Prisma Client (postinstall) and seed sources: `pnpm db:seed`.
- Run app: `pnpm dev` (Next.js with turbo). Build: `pnpm build`; start: `pnpm start`.

## Operational Notes
- Vercel cron triggers daily sync; ensure `CRON_SECRET` stays aligned between env and `vercel.json`.
- LINE broadcast splits recipients into batches of 500; push used for groups.
- No tRPC routers are defined yet; API surface is via Next.js routes above.
