# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager: **pnpm** (see `pnpm-lock.yaml`, `pnpm-workspace.yaml`).

```bash
pnpm dev          # Next.js dev server with Turbopack (http://localhost:3000)
pnpm build        # prisma generate && next build
pnpm start        # production server
pnpm lint         # next lint (ESLint flat config in eslint.config.mjs)

pnpm db:migrate   # prisma migrate dev
pnpm db:seed      # runs tsx prisma/seed.ts (inserts dummy videos)
pnpm db:studio    # Prisma Studio at http://localhost:5555
pnpm db:reset     # destructive: prisma migrate reset --force

pnpm scrape       # tsx scripts/scrape.ts — one-shot scrape job
pnpm rank         # tsx scripts/ranking.ts — print top videos
pnpm recommend    # tsx scripts/recommend.ts — regenerate recommendation cache
```

Standalone `tsx` scripts auto-load `.env` via a conditional `require("dotenv").config()` inside `src/lib/env.ts` (guarded by `NEXT_RUNTIME` check). Next.js handles env loading itself in dev/build/runtime — do not duplicate.

DB: PostgreSQL via Supabase. The current `.env` points `DATABASE_URL` at the Supabase pooler (port 6543, `pgbouncer=true&connection_limit=1`) and `DIRECT_URL` at the direct connection (port 5432) which Prisma uses for migrations.

## Architecture

Next.js 16 App Router + Prisma (Postgres) + Tailwind v4 + shadcn/ui. Single-tenant MVP for one TikTok channel, with manual brand-campaign workflows bolted on. Comments in `src/lib/*` are Indonesian — keep that style when editing.

### Data model (prisma/schema.prisma)

Two parallel domains share one DB:

1. **Analytics pipeline** — `Video` (static metadata, `tiktokId` unique) + `VideoSnapshot` (time-series, composite PK `(videoId, capturedAt)`, **INSERT-only, never overwrite**) + `Recommendation` (cached insight payloads keyed by `kind`) + `ScrapeJob` (run log for cron debugging) + `DailyMetric` (channel-level totals imported from TikTok Studio CSV, unique by date).
2. **Brand workflow** — `Brief` (inquiry pipeline, status enum `INQUIRY → NEGOTIATING → CONFIRMED → ACTIVE → DONE → ARCHIVED`) → optional 1:1 link to `Campaign` (via `Brief.campaignId`) → `CampaignVideo[]` (manually entered per-video metrics for client report). `ChannelConfig` holds manual demographic/branding data used for PDF reports.

All metric columns are `BigInt`. Convert with `serializeBigInts()` / `bigintToNumber()` from `src/lib/serialize.ts` before passing Prisma results to Client Components, or `JSON.stringify` will throw.

### Scrape pipeline (`src/lib/scrape.ts`)

`runScrape()` is the single entry point used by `pnpm scrape`, the cron route, and the manual refresh route. Flow:

1. Insert `ScrapeJob` with `status: "running"`.
2. `createProvider()` (`src/lib/scraper/factory.ts`) picks `mock` | `tikapi` | `csv` from `env.SCRAPER_PROVIDER`. All providers return the normalized `ScrapedVideo` shape from `src/lib/scraper/provider.ts` — add a new source by implementing that interface and wiring the factory.
3. Wrapped in `retry()` (`src/lib/retry.ts`) with 3 attempts + exponential backoff.
4. Per-video transaction: upsert `Video` by `tiktokId`, then `videoSnapshot.upsert` keyed on `(videoId, capturedAt)`. `capturedAt` is rounded to the second so two runs within the same second dedupe. **A single video's failure does not kill the job** — errors are logged and the loop continues.
5. Job row updated to `success`/`failed` with counts and `durationMs`.

### Ranking & recommendations

`getTopVideos()` in `src/lib/ranking.ts` uses raw SQL (`DISTINCT ON (video_id) … ORDER BY video_id, captured_at DESC`) to pick the latest snapshot per video, then computes `relevance_score` inline from weights in `RANKING_WEIGHTS`. Postgres returns NUMERIC as string — every raw query result is parsed through a Zod schema before mapping. Follow that pattern when adding new raw queries.

`src/lib/recommendations.ts` runs four independent Postgres aggregations (posting time, hashtag, duration bucket, caption regex) in `Promise.all`. `generateAndSaveRecommendations()` writes each result as a `Recommendation` row keyed by `kind` for caching. The dashboard currently calls `getAllRecommendations()` (compute-on-demand) instead of reading the cache — both code paths exist.

### Routes

- `src/app/dashboard/` — server components (`export const dynamic = "force-dynamic"`, `revalidate = 0`). Shared `Sidebar` lives in `src/components/sidebar.tsx`; nav badge for active briefs is fetched client-side from `/api/briefs/stats`.
- `src/app/api/cron/route.ts` — Vercel Cron entry. `vercel.json` schedules it at `0 19 * * *`. Requires `Authorization: Bearer ${CRON_SECRET}`. Calls `runScrape()` then `generateAndSaveRecommendations()`. `maxDuration = 60`.
- `src/app/api/refresh/route.ts` — manual UI trigger. In-memory rate limit (60s, module-scoped `lastRefreshAt`); this only works because we're single-instance — switch to Redis if scaling.
- `src/app/api/briefs/[id]/convert-to-campaign/route.ts` — atomic transaction that creates a `Campaign` from a `Brief` and flips status to `ACTIVE`. Requires `campaignName`, `startDate`, `endDate` populated on the brief first.
- `src/app/api/campaigns/[id]/report/route.ts` and `src/app/api/briefs/[id]/proposal/route.ts` — render PDFs server-side with `@react-pdf/renderer` (`renderToStream`) and stream as `application/pdf`. PDF components are in `src/components/pdf/`.
- `src/app/api/import-overview/route.ts` — accepts TikTok Studio Overview.csv. Parser in `src/lib/csv-overview-import.ts` infers years by walking the row list backward from `endDate` (TikTok exports `"May 13"` without a year).

### Prisma client singleton

`src/lib/prisma.ts` stashes the client on `globalThis.prisma` in non-prod to survive Next.js HMR. Always import `{ prisma }` from there.

### Logging

`createLogger({ module: "..." })` from `src/lib/logger.ts` (pino, pretty-printed in dev). Use it instead of `console.*` so module tags stay consistent across the scraper, cron, and API routes.

### Env validation

`src/lib/env.ts` parses `process.env` with Zod at import time and throws on failure. `CRON_SECRET` and `REFRESH_SECRET` must be ≥32 chars. Add new env vars to the schema there — referencing `process.env.X` directly elsewhere bypasses validation.

## Project conventions worth keeping

- BigInt: serialize before crossing the server/client boundary.
- Scrape providers: implement `ScraperProvider`, wire in `factory.ts`, do not modify `runScrape()`.
- Raw SQL results: validate with Zod (`z.coerce.number()`, `z.bigint()`) before mapping.
- Snapshots are append-only — never `UPDATE` or `DELETE` `video_snapshots` rows.
- Comments throughout `src/lib/*` are written in Indonesian (mixed with English technical terms). The README is also Indonesian. Match the surrounding style.
