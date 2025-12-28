# Beer Line Watcher 実装仕様

## 全体像
- Next.js 15（App Router）＋ React 19 で動く、ビール／酒イベントの集約アプリ。Prisma 経由で Postgres に保存し、UI と LINE Bot で配信。
- イベントは cron と LINE コマンドでスクレイピング取得し、重複排除後に購読者へ通知。
- LINE Webhook はフォロー／参加イベントとテキストコマンドを処理し、通知設定を更新。

## ランタイムと主要依存
- Next.js 15 + Tailwind CSS v4（最小スタイル）。
- データ：Postgres + Prisma Client（生成先 `generated/prisma`、シード `prisma/seed.ts`）。
- 通知：LINE Messaging API（SDK型のみ、HTTP 直叩き）。
- 環境変数検証：`@t3-oss/env-nextjs` + `zod`。クローラは fetch ベース。

## データモデル（Prisma）
- `Source`: 取得元メタデータ（`id`, `name`, `url`, `description?`）。
- `Event`: `sourceId + externalId` のハッシュ ID、`title`, `url`, `eventDate?`, `createdAt`。
- `LineSubscriber`: 1:1 ユーザー購読（`notificationDays`, `lastNotifiedAt`）。
- `LineGroup`: グループ／ルーム購読（同じ設定項目）。

## クローラと保存
- 位置：`src/server/crawlers/`
  - `beergirl.ts`: https://beergirl.net/beer-event-matome-2017_e/ をクロール。イベント系キーワードのみ採用し、`extractDateFromText` で日付推定。
  - `walkerplus.ts`: Walkerplus 関東酒イベント検索をページング取得。同様にフィルタ＋日付抽出。
- `extractDateFromText`: `YYYY年MM月DD日`, `MM月DD日`, `YYYY/MM/DD`, `MM/DD` に対応。今日より過去なら翌年扱いで補正。
- `upsertEventsAndGetNewOnes`: 安定ハッシュで Event ID 作成 → Source を upsert → 既存でも `eventDate` が新規取得なら更新 → 新規/更新分を返却。

## 定期実行（cron）
- エンドポイント: `GET /api/cron/sync-events?token=CRON_SECRET`
- フロー: `CRON_SECRET` 照合 → Beergirl/Wakerplus をクロール → upsert → 新規のみ集約 → `sendLineBroadcast` で購読者＋グループへ一括送信（500件で分割）。
- Vercel 設定: `vercel.json` に `0 0 * * *` で登録。環境の `CRON_SECRET` と URL トークンを一致させる。

## LINE Webhook
- エンドポイント: `POST /api/line/webhook`（`LINE_CHANNEL_SECRET` があれば署名検証）。
- ライフサイクル:
  - `follow`（user）: `LineSubscriber` upsert、使い方を返信。
  - `unfollow`（user）: 購読削除。
  - `join`（group/room）: `LineGroup` upsert、挨拶返信。`leave` で削除。
- テキストコマンド:
  - 「最新情報取得」系: その場で両ソースをクロールし push で返信。
  - 「今週のイベント」: 7日以内を `getThisWeeksEvents` で取得し返信。
  - 「通知 毎日/1週間/2週間/1ヶ月」: `notificationDays` を upsert で更新。
  - グループ専用: `STOP`/`停止` で無効化（削除）、`START`/`開始` で再有効化。
- 返信は reply API、後続送信は push/multicast。

## Web UI
- `src/app/page.tsx`: サーバーコンポーネント。`source` / `q`（タイトル部分一致）で最大100件取得、作成日時降順でカード表示。
- 見た目: ダークグラデ背景＋簡易検索フォーム。`export const dynamic = "force-dynamic"` で毎回 fresh データ取得。

## 環境変数
- `src/env.js` で検証: `DATABASE_URL`, `NODE_ENV`, `LINE_CHANNEL_ACCESS_TOKEN?`, `LINE_CHANNEL_SECRET?`, `CRON_SECRET?`
- `.env.example` に想定値。ビルド時に検証を飛ばす場合は `SKIP_ENV_VALIDATION=1`。
- `next.config.js` が env 読み込み。

## ローカル開発手順
- 依存インストール: `pnpm i`（packageManager: `pnpm@9`）。
- DB 起動: `.env` を用意 → `./start-database.sh`（Docker/Podman）または自前の Postgres。
- Prisma Client 生成（postinstall）後、`pnpm db:seed` でソース初期投入。
- 実行: `pnpm dev`（turbo）。ビルド: `pnpm build`、本番起動: `pnpm start`。

## 運用メモ
- Vercel cron で日次同期。`CRON_SECRET` を `vercel.json` と環境で揃える。
- LINE 送信は 500 件ごとに分割、グループは push API。
- tRPC ルーターは未定義。API は Next.js route handler（cron/webhook）のみ。
