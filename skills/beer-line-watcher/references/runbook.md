# Beer Line Watcher Runbook

## Local Setup Checklist
- `cp .env.example .env` → set real secrets (`DATABASE_URL`, LINE tokens, `CRON_SECRET`).
- Start Postgres: `./start-database.sh` or your own instance that matches `DATABASE_URL`.
- Install deps: `pnpm i` (uses pnpm@9); Prisma client is generated on postinstall.
- Seed base sources: `pnpm db:seed` (adds Beergirl + Walkerplus).
- Dev server: `pnpm dev`; build: `pnpm build`; start: `pnpm start`.

## Database Ops
- Apply migrations: `pnpm db:migrate` (deploy) or `pnpm db:generate` (dev migrate).
- Schema push (unsafe for prod): `pnpm db:push`.
- Inspect data: `pnpm db:studio`.
- Seed: `pnpm db:seed`.

## Manual Crawl / Cron Test
- Run app + DB, then hit cron endpoint:
  ```bash
  curl "http://localhost:3000/api/cron/sync-events?token=$CRON_SECRET"
  ```
  Expect JSON with `newCount` and per-source totals; if new events exist, LINE broadcast is triggered.
- Direct crawl helper (Node REPL/tsx):
  ```bash
  pnpm tsx -e "import { crawlAndGetNewEvents } from './src/server/services/crawlerService';
  crawlAndGetNewEvents().then(console.log).catch(console.error);"
  ```

## LINE Webhook Checks
- Endpoint: `POST /api/line/webhook`; signature verification uses `LINE_CHANNEL_SECRET`.
- In dev without LINE callbacks, you can post a dummy payload:
  ```bash
  curl -X POST http://localhost:3000/api/line/webhook \
    -H "Content-Type: application/json" \
    -d '{"events":[]}'
  ```
  (Skip signature header in dev; handler logs actions.)
- To test real events locally, expose via `ngrok http 3000` and set LINE webhook URL; ensure `LINE_CHANNEL_ACCESS_TOKEN`/`LINE_CHANNEL_SECRET` are valid.
- Commands:
  - "最新情報取得" → triggers crawl + push to sender.
  - "今週のイベント" → returns events within 7 days.
  - "通知 毎日|1週間|2週間|1ヶ月" → sets interval on subscriber/group.
  - Group only: `STOP`/`停止` disable, `START`/`開始` enable.

## Adding/Updating a Crawler
- Create `src/server/crawlers/<name>.ts` returning `CrawledItem[]` (see existing files).
- Add keyword filters to exclude non-event content; use `extractDateFromText` for dates.
- Seed the source in `prisma/seed.ts` (or rely on automatic upsert in `upsertEventsAndGetNewOnes`).
- Register crawler in `crawlAndGetNewEvents` and, if needed, in cron route aggregation.

## Troubleshooting
- Env validation fails: set `SKIP_ENV_VALIDATION=1` to bypass temporarily, but fix `.env` to match `src/env.js`.
- Cron 401: confirm `CRON_SECRET` matches `vercel.json` token and the query string.
- Empty UI list: check DB connection and that `prisma event` table has records (use Studio); ensure filters `source`/`q` aren’t over-restrictive.
