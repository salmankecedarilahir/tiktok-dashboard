# Bootstrap script untuk TikTok Dashboard MVP (Windows, Supabase)
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "TikTok Dashboard MVP Bootstrap (Supabase)" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# === 1. Install additional dependencies ===
Write-Host "[1/6] Installing dependencies..." -ForegroundColor Yellow
pnpm add '@prisma/client' zod date-fns pino pino-pretty '@sentry/nextjs' lucide-react
if ($LASTEXITCODE -ne 0) { exit 1 }
pnpm add -D prisma tsx '@types/node' dotenv
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host "OK: Dependencies installed" -ForegroundColor Green
Write-Host ""

# === 2. Ensure folders ===
Write-Host "[2/6] Ensuring folder structure..." -ForegroundColor Yellow
@(
    "src\app\dashboard",
    "src\app\api\refresh",
    "src\app\api\cron",
    "src\components\dashboard",
    "data"
) | ForEach-Object {
    New-Item -ItemType Directory -Force -Path $_ | Out-Null
}
Write-Host "OK: Folders ready" -ForegroundColor Green
Write-Host ""

# === 3. Prompt for Supabase URLs ===
Write-Host "[3/6] Supabase Connection Setup" -ForegroundColor Yellow
Write-Host ""
Write-Host "Buka Supabase -> tombol Connect (ijo) -> copy 2 URL" -ForegroundColor Cyan
Write-Host "Pastikan [YOUR-PASSWORD] udah lo ganti dengan password lo" -ForegroundColor Cyan
Write-Host ""

$databaseUrl = Read-Host "Paste TRANSACTION pooler URL (port 6543)"
if ($databaseUrl -notmatch "^postgresql://") {
    Write-Host "ERROR: URL harus mulai dengan postgresql://" -ForegroundColor Red
    exit 1
}
if ($databaseUrl -match "\[YOUR-PASSWORD\]") {
    Write-Host "ERROR: [YOUR-PASSWORD] masih ada, ganti dengan password lo" -ForegroundColor Red
    exit 1
}

$directUrl = Read-Host "Paste DIRECT connection URL (port 5432)"
if ($directUrl -notmatch "^postgresql://") {
    Write-Host "ERROR: URL harus mulai dengan postgresql://" -ForegroundColor Red
    exit 1
}
if ($directUrl -match "\[YOUR-PASSWORD\]") {
    Write-Host "ERROR: [YOUR-PASSWORD] masih ada, ganti dengan password lo" -ForegroundColor Red
    exit 1
}

Write-Host "OK: URLs captured" -ForegroundColor Green
Write-Host ""

# === 4. Generate .env ===
Write-Host "[4/6] Generating .env..." -ForegroundColor Yellow

function New-RandomHex {
    param([int]$Length = 32)
    $bytes = New-Object byte[] $Length
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
}

$cronSecret = New-RandomHex 32
$refreshSecret = New-RandomHex 32

if (Test-Path ".env") {
    Copy-Item ".env" ".env.backup" -Force
}

$envContent = @"
# Database (Supabase)
DATABASE_URL="$databaseUrl"
DIRECT_URL="$directUrl"

# App
NODE_ENV="development"
LOG_LEVEL="debug"

# TikTok target
TIKTOK_USERNAME="abangabanganthis"

# TikAPI (kosong dulu)
TIKAPI_KEY=""

# Provider: "mock" | "tikapi" | "csv"
SCRAPER_PROVIDER="mock"

# Secrets
CRON_SECRET="$cronSecret"
REFRESH_SECRET="$refreshSecret"

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""
"@

Set-Content -Path ".env" -Value $envContent -Encoding UTF8
Write-Host "OK: .env created" -ForegroundColor Green
Write-Host ""

# === 5. .gitignore + package.json ===
Write-Host "[5/6] Updating .gitignore & package.json..." -ForegroundColor Yellow

$gitignoreEntries = @(".env", ".env.local", ".env.backup", "data/")
if (Test-Path ".gitignore") {
    $existing = Get-Content ".gitignore"
    foreach ($entry in $gitignoreEntries) {
        if ($existing -notcontains $entry) {
            Add-Content -Path ".gitignore" -Value $entry
        }
    }
}

$nodeScript = @'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
pkg.scripts = Object.assign({}, pkg.scripts, {
  "dev": "next dev --turbopack",
  "build": "prisma generate && next build",
  "start": "next start",
  "lint": "next lint",
  "db:migrate": "prisma migrate dev",
  "db:seed": "prisma db seed",
  "db:studio": "prisma studio",
  "db:reset": "prisma migrate reset --force",
  "scrape": "tsx scripts/scrape.ts",
  "rank": "tsx scripts/ranking.ts",
  "recommend": "tsx scripts/recommend.ts"
});
pkg.prisma = { "seed": "tsx prisma/seed.ts" };
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('package.json updated');
'@

$nodeScript | node
Write-Host "OK: Configs updated" -ForegroundColor Green
Write-Host ""

# === 6. Prisma migration ===
Write-Host "[6/6] Running Prisma migration to Supabase..." -ForegroundColor Yellow
Write-Host "(Ini bakal create 4 tabel di Supabase DB lo)" -ForegroundColor Cyan
Write-Host ""

pnpm prisma migrate dev --name init

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Migration failed." -ForegroundColor Red
    Write-Host "Common causes:" -ForegroundColor Yellow
    Write-Host "  - Password salah di URL" -ForegroundColor Yellow
    Write-Host "  - Firewall block Supabase" -ForegroundColor Yellow
    Write-Host "  - URLs tertukar (port 6543 vs 5432)" -ForegroundColor Yellow
    exit 1
}

Write-Host "OK: Migration applied" -ForegroundColor Green
Write-Host ""

# === Seed ===
Write-Host "Seeding database with dummy data..." -ForegroundColor Yellow
pnpm db:seed
Write-Host ""

Write-Host "==================================================" -ForegroundColor Green
Write-Host "BOOTSTRAP COMPLETE!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Verify di Supabase Dashboard -> Table Editor" -ForegroundColor Cyan
Write-Host "Harus muncul 4 tabel: videos, video_snapshots, video_recommendations, scrape_jobs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test commands:" -ForegroundColor Cyan
Write-Host "  pnpm scrape    - run mock scraping"
Write-Host "  pnpm rank      - see top 10"
Write-Host "  pnpm db:studio - browse DB visually"