# TikTok Dashboard — Project Overview

Single-tenant dashboard untuk mengelola satu channel TikTok: analytics (time-series snapshot), rekomendasi konten otomatis, dan workflow brand-deal manual (brief → campaign → laporan PDF).

**Production:** https://tiktok-dashboard-three.vercel.app
**Repository:** https://github.com/salmankecedarilahir/tiktok-dashboard

---

## 1. Tech Stack

| Layer            | Tools                                                        |
| ---------------- | ------------------------------------------------------------ |
| Framework        | Next.js **16.2.6** (App Router, Turbopack), React **19.2.4** |
| Bahasa           | TypeScript 5                                                 |
| Styling          | Tailwind CSS **v4**, shadcn/ui, Radix UI, `lucide-react`     |
| Database         | PostgreSQL (Supabase), Prisma **6.19.3**                     |
| Validation       | Zod 4                                                        |
| PDF              | `@react-pdf/renderer`                                        |
| Logging          | Pino (pretty di dev)                                         |
| Error monitoring | `@sentry/nextjs` (optional, di-disable kalau DSN kosong)     |
| Package manager  | **pnpm** 10                                                  |
| Hosting          | Vercel (cron + serverless functions)                         |

---

## 2. Struktur Folder

```
tiktok-dashboard/
├── prisma/
│   ├── schema.prisma          # 9 model + 1 enum
│   ├── migrations/            # 3 migrasi (init, campaign tables, briefs)
│   └── seed.ts                # dummy data injector (tsx)
│
├── scripts/                   # standalone tsx runners
│   ├── scrape.ts              # `pnpm scrape`   — one-shot scrape job
│   ├── ranking.ts             # `pnpm rank`     — cetak top videos
│   └── recommend.ts           # `pnpm recommend`— regenerate cache rekomendasi
│
├── src/
│   ├── app/
│   │   ├── api/               # 14 route handlers (lihat §5)
│   │   ├── dashboard/         # 9 server-rendered pages
│   │   ├── layout.tsx         # root layout
│   │   └── page.tsx           # landing redirect
│   │
│   ├── components/
│   │   ├── dashboard/         # client widgets (refresh button, tables)
│   │   ├── pdf/               # CampaignReport, ProposalReport (server-rendered)
│   │   ├── ui/                # shadcn primitives (button, card, table, …)
│   │   └── sidebar.tsx        # navigasi utama
│   │
│   └── lib/
│       ├── env.ts             # Zod env schema (throws di import time)
│       ├── prisma.ts          # PrismaClient singleton (HMR-safe)
│       ├── logger.ts          # Pino factory `createLogger({module})`
│       ├── scrape.ts          # `runScrape()` — entry point pipeline
│       ├── scraper/           # provider abstraction (mock/tikapi/csv)
│       ├── ranking.ts         # `getTopVideos()` — raw SQL, weighted score
│       ├── recommendations.ts # 4 agregasi paralel
│       ├── csv-overview-import.ts # parser CSV TikTok Studio Overview
│       ├── retry.ts           # exponential backoff
│       ├── serialize.ts       # BigInt → number/string sanitizer
│       └── utils.ts           # `cn()` helper
│
├── public/                    # static assets
├── CLAUDE.md                  # panduan untuk Claude Code
├── vercel.json                # cron schedule (`0 19 * * *`)
└── package.json
```

---

## 3. Fitur Utama

### 3.1 Analytics Pipeline
- **Scrape otomatis** harian via Vercel Cron (`0 19 * * *` UTC).
- **Append-only time-series**: setiap scrape menambah baris `VideoSnapshot` baru (composite PK `(videoId, capturedAt)`). Tidak pernah `UPDATE`/`DELETE`.
- **Manual refresh** via tombol UI (rate-limited 60 detik).
- **Provider abstraction**: `mock` (untuk dev), `tikapi` (API resmi), `csv` (manual upload). Pilih via env `SCRAPER_PROVIDER`.
- **Hardening**: per-video failure tidak crash seluruh job; retry 3x dengan exponential backoff; job log lengkap di `ScrapeJob`.

### 3.2 Ranking & Rekomendasi
- **Top videos**: dipilih dari snapshot terbaru per video (`DISTINCT ON (video_id) … ORDER BY captured_at DESC`), di-rank pakai `relevance_score` (weighted views/likes/comments/shares/saves).
- **4 jenis rekomendasi** (dijalankan paralel via `Promise.all`):
  1. **Posting time** — slot waktu optimal berdasarkan engagement rata-rata.
  2. **Hashtag combo** — kombinasi hashtag yang paling sering muncul di top videos.
  3. **Duration bucket** — bucket durasi (0–15s, 15–30s, …) dengan engagement tertinggi.
  4. **Caption pattern** — regex pattern di caption (question, CTA, dll) yang trigger lebih banyak views.
- Hasil di-cache di tabel `Recommendation` keyed by `kind` (regen tiap cron run).

### 3.3 Brand Workflow
- **Inquiry → Done pipeline**: Brief masuk dengan status `INQUIRY`, ditrack lewat `NEGOTIATING` → `CONFIRMED` → `ACTIVE` → `DONE` (atau `ARCHIVED`).
- **Convert to Campaign**: atomic transaction yang flip status ke `ACTIVE` + buat row Campaign + link via `Brief.campaignId`.
- **Manual metric entry**: `CampaignVideo` per brand campaign (views, likes, watchtime, dll) — bukan dari scraper, tapi manual karena angka resmi dari TikTok Studio.
- **PDF generation** (server-side streaming):
  - `ProposalReport.tsx` — kirim ke brand saat `INQUIRY`/`NEGOTIATING`.
  - `CampaignReport.tsx` — laporan akhir setelah campaign selesai.

### 3.4 Channel Config & Import
- **ChannelConfig**: data demografi follower + branding (warna, tagline, top locations) — di-input manual, dipakai di PDF.
- **TikTok Studio CSV import**: parser di `csv-overview-import.ts` yang infer tahun (TikTok export format `"May 13"` tanpa tahun) dengan walk backward dari `endDate`.

---

## 4. Database Schema

9 model + 1 enum. Semua kolom metrik pakai `BigInt`.

### 4.1 Domain Analytics

```
Video (videos)
├─ id          uuid PK
├─ tiktokId    string UNIQUE
├─ caption     text?
├─ postedAt    timestamp
├─ durationSeconds, thumbnailUrl, videoUrl
├─ hashtags    string[]
└─ snapshots   → VideoSnapshot[]

VideoSnapshot (video_snapshots)          ← INSERT-only
├─ (videoId, capturedAt)  composite PK
├─ views, likes, commentsCount,
│  shares, saves            BigInt
└─ video → Video (CASCADE)

Recommendation (video_recommendations)   ← cache
├─ id, kind, payload (Json), generatedAt
└─ INDEX: (kind, generatedAt DESC)

ScrapeJob (scrape_jobs)                  ← run log
├─ id, startedAt, finishedAt, status,
│  provider, videosFound, videosNew,
│  snapshotsAdded, errorMessage, durationMs

DailyMetric (daily_metrics)              ← TikTok Studio CSV
├─ id, date UNIQUE, videoViews,
│  profileViews, likes, comments, shares,
│  importedAt

ChannelConfig (channel_config)           ← manual input
├─ id, channelName, channelHandle,
│  totalFollowers,
│  femalePercent, malePercent,
│  age18_24Percent, age25_34Percent,
│  age35plusPercent, topLocations (Json),
│  brandColor, tagline, updatedAt
```

### 4.2 Domain Brand Workflow

```
Brief (briefs)
├─ id, brandName, brandContact, inquiryDate,
│  source, status (BriefStatus enum),
│  campaignName, description, packageType,
│  customPrice, deliverables, startDate, endDate,
│  viewsGuarantee, requirements,
│  assignedTo, internalNotes, brandNotes,
│  campaignId UNIQUE → Campaign?
└─ status flow: INQUIRY → NEGOTIATING → CONFIRMED
                                       → ACTIVE → DONE → ARCHIVED

Campaign (campaigns)
├─ id, brandName, brandLogoUrl, campaignName,
│  packageType, startDate, endDate, notes
├─ videos → CampaignVideo[]
└─ brief  → Brief? (1:1 reverse)

CampaignVideo (campaign_videos)          ← manual input per video
├─ id, campaignId → Campaign (CASCADE)
├─ videoTitle, videoUrl, postedAt, durationSeconds
└─ views, likes, comments, shares, saves,
   watchTimeAvgSec, notes
```

### 4.3 Index Strategy
- `videos`: `postedAt DESC`, `createdAt DESC` — untuk listing terbaru.
- `video_snapshots`: `capturedAt DESC` — untuk DISTINCT ON query.
- `video_recommendations`: `(kind, generatedAt DESC)` — ambil latest per kind.
- `scrape_jobs`: `startedAt DESC`, `(status, startedAt DESC)` — debugging cron failures.
- `briefs`: `status`, `createdAt` — filter pipeline view.

---

## 5. API Endpoints

Semua di bawah `src/app/api/`. Server Components akses Prisma langsung — jadi route handlers cuma untuk client mutations & integrasi eksternal.

### 5.1 System
| Method | Path                 | Auth                    | Fungsi                                                       |
| ------ | -------------------- | ----------------------- | ------------------------------------------------------------ |
| GET    | `/api/cron`          | `Bearer ${CRON_SECRET}` | Vercel Cron entry. Run `runScrape()` + regenerate recs. `maxDuration=60`. |
| POST   | `/api/refresh`       | (in-memory rate limit)  | Manual trigger scrape dari UI. 60s cooldown (module-scoped). |
| POST   | `/api/import-overview` | session implicit       | Upload TikTok Studio Overview.csv → `DailyMetric`.           |

### 5.2 Brief Pipeline
| Method | Path                                      | Fungsi                                              |
| ------ | ----------------------------------------- | --------------------------------------------------- |
| GET    | `/api/briefs?status=…`                    | List brief (filter by status).                      |
| POST   | `/api/briefs`                             | Buat brief baru (status default `INQUIRY`).         |
| GET    | `/api/briefs/stats`                       | Hitung jumlah brief aktif (nav badge).              |
| GET    | `/api/briefs/[id]`                        | Detail brief + linked campaign.                     |
| PATCH  | `/api/briefs/[id]`                        | Update field brief (termasuk status transition).    |
| DELETE | `/api/briefs/[id]`                        | Hapus brief.                                        |
| POST   | `/api/briefs/[id]/convert-to-campaign`    | Atomic: create Campaign + flip ke `ACTIVE`. Butuh `campaignName`, `startDate`, `endDate` terisi. |
| GET    | `/api/briefs/[id]/proposal`               | Stream PDF proposal (`application/pdf`).            |

### 5.3 Campaign
| Method | Path                                  | Fungsi                                            |
| ------ | ------------------------------------- | ------------------------------------------------- |
| GET    | `/api/campaigns`                      | List semua campaign.                              |
| POST   | `/api/campaigns`                      | Buat campaign manual (tanpa brief).               |
| GET    | `/api/campaigns/[id]`                 | Detail + videos.                                  |
| DELETE | `/api/campaigns/[id]`                 | Hapus campaign (CASCADE ke CampaignVideo).        |
| POST   | `/api/campaigns/[id]/videos`          | Tambah video metric ke campaign.                  |
| DELETE | `/api/campaign-videos/[videoId]`      | Hapus satu CampaignVideo row.                     |
| GET    | `/api/campaigns/[id]/report`          | Stream PDF laporan akhir.                         |

### 5.4 Channel
| Method | Path                   | Fungsi                                          |
| ------ | ---------------------- | ----------------------------------------------- |
| GET    | `/api/channel-config`  | Ambil config (1 row, atau null).                |
| POST   | `/api/channel-config`  | Upsert config.                                  |

---

## 6. Pages (Dashboard)

| Route                          | Tipe              | Konten                                                       |
| ------------------------------ | ----------------- | ------------------------------------------------------------ |
| `/dashboard`                   | dynamic (server)  | Top videos table + recommendation cards + refresh button.    |
| `/dashboard/channel`           | static            | Form `ChannelConfig` (demografi, branding).                  |
| `/dashboard/import`            | static            | Upload `Overview.csv` form.                                  |
| `/dashboard/briefs`            | static            | Kanban-style list brief by status.                           |
| `/dashboard/briefs/new`        | static            | Form create brief.                                           |
| `/dashboard/briefs/[id]`       | dynamic           | Detail brief, edit form, convert-to-campaign action, generate proposal PDF. |
| `/dashboard/campaigns`         | static            | List campaign.                                               |
| `/dashboard/campaigns/new`     | static            | Form manual create campaign.                                 |
| `/dashboard/campaigns/[id]`    | dynamic           | Detail + tabel video metrics + generate report PDF.          |

Semua server pages set `dynamic = "force-dynamic"` & `revalidate = 0` (data harus selalu fresh). Sidebar nav badge fetch dari `/api/briefs/stats` client-side.

---

## 7. Data Flow

### 7.1 Daily Scrape (Cron Path)

```
Vercel Cron (0 19 * * *)
        │
        ▼
GET /api/cron  (verify Bearer CRON_SECRET)
        │
        ├──► runScrape()  [src/lib/scrape.ts]
        │       │
        │       ├─ INSERT ScrapeJob (status: running)
        │       │
        │       ├─ createProvider(env.SCRAPER_PROVIDER)
        │       │     ├─ mock-provider.ts  (faker data)
        │       │     ├─ tikapi-provider.ts (HTTP → TikAPI)
        │       │     └─ csv-provider.ts   (local file)
        │       │
        │       ├─ retry(3x, exp backoff) → ScrapedVideo[]
        │       │
        │       └─ FOR EACH video, in transaction:
        │           ├─ prisma.video.upsert       (by tiktokId)
        │           └─ prisma.videoSnapshot.upsert (by videoId+capturedAt)
        │                       ▲
        │                       └─ capturedAt rounded ke detik
        │                          (dedupe runs dalam detik yang sama)
        │
        │       └─ UPDATE ScrapeJob (status: success/failed, durationMs, counts)
        │
        └──► generateAndSaveRecommendations()  [src/lib/recommendations.ts]
                │
                └─ Promise.all([
                     postingTimeAgg(),
                     hashtagComboAgg(),
                     durationBucketAgg(),
                     captionPatternAgg(),
                   ])
                   │
                   └─ INSERT Recommendation rows, keyed by kind
```

### 7.2 Dashboard Read Path

```
Browser GET /dashboard
        │
        ▼
Server Component (force-dynamic)
        │
        ├──► getTopVideos()  [src/lib/ranking.ts]
        │       │
        │       └─ raw SQL:
        │           SELECT DISTINCT ON (video_id) …
        │           ORDER BY video_id, captured_at DESC
        │           +  inline relevance_score (weighted)
        │           +  Zod validate (NUMERIC → number)
        │
        ├──► getAllRecommendations()  [src/lib/recommendations.ts]
        │       │
        │       └─ Promise.all([4 agregasi])  ← compute-on-demand
        │          (NB: cache di tabel Recommendation tidak dibaca di sini)
        │
        └──► serializeBigInts()  → kirim ke Client Components
                                   (kalau tidak, JSON.stringify throw)
```

### 7.3 Brief → Campaign → Report

```
Brief INQUIRY
   │  (UI: edit form, isi packageType, customPrice, startDate, endDate, …)
   │
   ▼
PATCH /api/briefs/[id]  → status: NEGOTIATING
   │
   │  GET /api/briefs/[id]/proposal  → @react-pdf/renderer
   │  └─► renderToStream(<ProposalReport />)  → application/pdf
   │
   ▼
POST /api/briefs/[id]/convert-to-campaign
   │
   │  prisma.$transaction([
   │    Campaign.create({ from brief data }),
   │    Brief.update({ status: ACTIVE, campaignId: campaign.id }),
   │  ])
   │
   ▼
Campaign ACTIVE
   │  (UI: tambah CampaignVideo metrics secara manual per video)
   │
   ▼
POST /api/campaigns/[id]/videos  ×N
   │
   ▼
Campaign DONE
   │
   ▼
GET /api/campaigns/[id]/report  → renderToStream(<CampaignReport />) → PDF
```

---

## 8. Environment Variables

Validated via Zod di `src/lib/env.ts` (throws on import kalau invalid).

| Variable                 | Required | Validation              | Catatan                                                      |
| ------------------------ | -------- | ----------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`           | ✅        | URL                     | Supabase pooler (port 6543, `pgbouncer=true`).               |
| `DIRECT_URL`             | optional | URL                     | Direct (port 5432) untuk migrations.                         |
| `TIKTOK_USERNAME`        | ✅        | non-empty               | Target channel.                                              |
| `CRON_SECRET`            | ✅        | min 32 chars            | Auth `/api/cron`.                                            |
| `REFRESH_SECRET`         | ✅        | min 32 chars            | (legacy, dipakai kalau refresh diaktifkan eksternal).        |
| `SCRAPER_PROVIDER`       | optional | `mock`/`tikapi`/`csv`   | Default `mock`.                                              |
| `TIKAPI_KEY`             | conditional | string               | Wajib kalau `SCRAPER_PROVIDER=tikapi`.                       |
| `LOG_LEVEL`              | optional | `debug`/`info`/`warn`/`error` | Default `info`.                                              |
| `NEXT_PUBLIC_SENTRY_DSN` | optional | string                  | Kosong → Sentry skip.                                        |
| `SENTRY_AUTH_TOKEN`      | optional | string                  | Build-time only.                                             |

---

## 9. Konvensi yang Dijaga

1. **BigInt → serialize** sebelum cross server/client boundary (`serializeBigInts()` di `src/lib/serialize.ts`).
2. **Snapshots append-only** — jangan pernah `UPDATE`/`DELETE` `video_snapshots`.
3. **Raw SQL** → validate dengan Zod (NUMERIC dari Postgres balik sebagai string).
4. **Scrape providers** → implement `ScraperProvider` interface, wire di `factory.ts`. Jangan modify `runScrape()`.
5. **Komentar di `src/lib/*`** ditulis dalam Bahasa Indonesia (campur English technical terms) — ikuti style yang ada saat edit.
6. **Logger**: pakai `createLogger({ module: "…" })`, jangan `console.*`.
7. **Env access**: lewat `env` object dari `src/lib/env.ts`, jangan `process.env.X` langsung di luar file itu.

---

## 10. Operasional

| Aktivitas              | Command / Action                                             |
| ---------------------- | ------------------------------------------------------------ |
| Dev local              | `pnpm dev` → http://localhost:3000                           |
| Migrasi DB             | `pnpm db:migrate`                                            |
| Seed dummy data        | `pnpm db:seed`                                               |
| Prisma Studio          | `pnpm db:studio` → http://localhost:5555                     |
| One-shot scrape        | `pnpm scrape`                                                |
| Cetak ranking          | `pnpm rank`                                                  |
| Regenerate recs        | `pnpm recommend`                                             |
| Deploy prod            | `vercel --prod` (project sudah linked)                       |
| Lihat env Vercel       | `vercel env ls`                                              |
| Tarik env Vercel → .env | `vercel env pull`                                            |
