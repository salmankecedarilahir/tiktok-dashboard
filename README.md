# TikTok Analytics MVP — Setup Guide (Turn 1)

Honest setup guide. Yang manual = manual. Yang otomatis = otomatis.

## Prerequisites

Pastikan ini ke-install dulu:
```bash
node --version    # >= 20
pnpm --version    # >= 9
docker --version  # any recent
openssl version   # any
```

Kalau belum:
- pnpm: `npm i -g pnpm`
- Docker Desktop: https://docker.com/products/docker-desktop

---

## STEP 1 — Create Next.js project (INTERACTIVE — manual)

Ini interactive prompt. Lo harus jawab manual.

```bash
pnpm create next-app@latest tiktok-analytics
```

Jawab prompt:
- TypeScript: **Yes**
- ESLint: **Yes**
- Tailwind CSS: **Yes**
- `src/` directory: **Yes**
- App Router: **Yes**
- Turbopack: **Yes**
- Customize import alias: **No** (pakai default `@/*`)

Lalu masuk ke folder:
```bash
cd tiktok-analytics
```

---

## STEP 2 — Copy file dari zip (manual)

Unzip `tiktok-analytics-turn1.zip` lalu copy isinya **MERGE** ke folder `tiktok-analytics/`.

Pakai macOS/Linux:
```bash
# Asumsi zip udah lo extract ke ~/Downloads/tiktok-analytics-turn1/
cp -R ~/Downloads/tiktok-analytics-turn1/. .

# Verify file ada
ls docker-compose.yml prisma/schema.prisma src/lib/env.ts
```

**Penting:** `tsconfig.json` di zip bakal overwrite punya Next.js. Itu intended — gua udah include semua setting Next.js + tambahan strict mode.

---

## STEP 3 — Replace src/lib/env.ts dengan versi fixed

Versi `env.ts` di zip belum support `tsx` standalone run. Replace dengan versi di file terpisah `env-fixed.ts` (rename jadi `env.ts`).

Atau langsung pakai versi fixed dari zip update.

---

## STEP 4 — Bootstrap (OTOMATIS — 1 command)

Setelah Step 1–3 selesai, semua ini otomatis:

```bash
chmod +x bootstrap.sh
bash bootstrap.sh
```

Script ini bakal:
- ✅ Install semua npm dependencies
- ✅ Bikin folder structure (`src/lib/scraper`, `scripts`, `prisma`, `data`)
- ✅ Generate random secrets dengan openssl
- ✅ Bikin `.env` lengkap
- ✅ Update `.gitignore`
- ✅ Start Postgres via docker compose
- ✅ Wait sampai Postgres healthy
- ✅ Update `package.json` scripts dengan node patcher
- ✅ Run `prisma migrate dev --name init`
- ✅ Run `pnpm db:seed` (insert 25 dummy videos)

Selesai dalam ~1–2 menit.

---

## STEP 5 — shadcn/ui (INTERACTIVE — manual)

shadcn init nanya pertanyaan. Tidak bisa di-skip via flag (versi terbaru).

```bash
pnpm dlx shadcn@latest init
```

Jawab:
- Style: **Default** (atau New York kalau lo suka)
- Base color: **Slate**
- CSS variables: **Yes**

Lalu install komponen yang dipakai di Turn 2:
```bash
pnpm dlx shadcn@latest add card badge button table skeleton sonner tooltip
```

---

## STEP 6 — Test semua jalan

```bash
# Test 1: scrape
pnpm scrape
# Expected: log "Scrape finished" dengan videosNew > 0

# Test 2: ranking
pnpm rank
# Expected: tabel top 10 video dengan score

# Test 3: dev server
pnpm dev
# Expected: http://localhost:3000 muncul Next.js default page

# Test 4: inspect DB
pnpm db:studio
# Expected: http://localhost:5555 dengan 4 model
```

---

## Common Errors & Fix

### `Error: Cannot find module 'dotenv'`
Bootstrap script harusnya install ini. Kalau missed:
```bash
pnpm add -D dotenv
```

### `Error: P1001: Can't reach database server at localhost:5433`
Postgres belum jalan. Cek:
```bash
docker compose ps
# Kalau kosong → docker compose up -d
# Kalau Exit → docker compose logs db (cek error)
```

### `Error: CRON_SECRET must be at least 32 chars`
`.env` lo punya secret yang pendek. Generate ulang:
```bash
openssl rand -hex 32
# Copy output ke CRON_SECRET di .env
```

### `Port 5433 already in use`
Ada Postgres lain di port itu. Ganti di `docker-compose.yml`:
```yaml
ports:
  - "5434:5432"  # ganti 5433 → 5434
```
Lalu update `DATABASE_URL` di `.env` jadi `localhost:5434`.

### shadcn init: "No tailwind.config.ts found"
Lo skip Tailwind saat `create-next-app`. Re-run:
```bash
pnpm create next-app@latest tiktok-analytics --tailwind
```
Atau install Tailwind manual: https://tailwindcss.com/docs/installation/framework-guides/nextjs

### `BigInt` cannot be serialized
Lo akses Prisma result langsung di Client Component. Pakai `serializeBigInts()` di `src/lib/serialize.ts`.

### `pnpm scrape` error: "ELIFECYCLE Command failed"
Cek error message di atasnya. Biasanya:
- DATABASE_URL salah → cek `.env`
- Prisma client belum di-generate → `pnpm prisma generate`

---

## Manual Steps Summary (yang nggak bisa di-otomasi)

| Step | Reason |
|------|--------|
| `pnpm create next-app` | Interactive prompt, versi terbaru tetap nanya |
| Copy zip files | Filesystem ops, depends on download location |
| `shadcn init` | Interactive prompt |
| `shadcn add [components]` | Bisa di-otomasi tapi gua pisah biar lo bisa pilih |
| Sign up TikAPI (kalau mau) | Manual signup |
| Fill `TIKAPI_KEY` di `.env` | Manual setelah signup |

Yang lain semua otomatis via `bootstrap.sh`.
