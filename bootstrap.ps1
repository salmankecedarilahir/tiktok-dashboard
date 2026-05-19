# Bootstrap script untuk TikTok Dashboard MVP (Windows PowerShell)
# Pakai: .\bootstrap.ps1

$ErrorActionPreference = "Stop"

Write-Host "TikTok Dashboard MVP Bootstrap" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# === 1. Cek prerequisites ===
Write-Host "[1/9] Checking prerequisites..." -ForegroundColor Yellow

$missing = @()
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { $missing += "pnpm" }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { $missing += "docker" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $missing += "node" }

if ($missing.Count -gt 0) {
    Write-Host "ERROR: Missing tools: $($missing -join ', ')" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found. Run inside Next.js project folder." -ForegroundColor Red
    exit 1
}

# Cek Docker daemon
$dockerOk = $false
try {
    docker ps 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
} catch { }

if (-not $dockerOk) {
    Write-Host "ERROR: Docker daemon not running. Open Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host "OK: All prerequisites" -ForegroundColor Green
Write-Host ""

# === 2. Install dependencies ===
Write-Host "[2/9] Installing dependencies..." -ForegroundColor Yellow
pnpm add '@prisma/client' zod date-fns pino pino-pretty '@sentry/nextjs'
if ($LASTEXITCODE -ne 0) { exit 1 }
pnpm add -D prisma tsx '@types/node' dotenv
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host "OK: Dependencies installed" -ForegroundColor Green
Write-Host ""

# === 3. Folder structure ===
Write-Host "[3/9] Creating folder structure..." -ForegroundColor Yellow
@("src\lib\scraper", "scripts", "prisma", "data", "src\app\dashboard", "src\components\dashboard") | ForEach-Object {
    New-Item -ItemType Directory -Force -Path $_ | Out-Null
}
Write-Host "OK: Folders created" -ForegroundColor Green
Write-Host ""

# === 4. Generate secrets & .env ===
Write-Host "[4/9] Generating secrets and .env..." -ForegroundColor Yellow

function New-RandomHex {
    param([int]$Length = 32)
    $bytes = New-Object byte[] $Length
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
}

$cronSecret = New-RandomHex 32
$refreshSecret = New-RandomHex 32

if (Test-Path ".env") {
    Write-Host "WARN: .env exists, backing up to .env.backup" -ForegroundColor Yellow
    Copy-Item ".env" ".env.backup" -Force
}

$envContent = @"
# Database
DATABASE_URL="postgresql://tiktok:tiktok_local_dev@localhost:5433/tiktok_analytics?schema=public"
DIRECT_URL="postgresql://tiktok:tiktok_local_dev@localhost:5433/tiktok_analytics?schema=public"

# App
NODE_ENV="development"
LOG_LEVEL="debug"

# TikTok target
TIKTOK_USERNAME="abangabanganthis"

# TikAPI (isi kalau udah sign up)
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

# === 5. .gitignore ===
Write-Host "[5/9] Updating .gitignore..." -ForegroundColor Yellow
$gitignoreEntries = @(".env", ".env.local", ".env.backup", "data/")
if (Test-Path ".gitignore") {
    $existing = Get-Content ".gitignore"
    foreach ($entry in $gitignoreEntries) {
        if ($existing -notcontains $entry) {
            Add-Content -Path ".gitignore" -Value $entry
        }
    }
} else {
    Set-Content -Path ".gitignore" -Value ($gitignoreEntries -join "`n")
}
Write-Host "OK: .gitignore updated" -ForegroundColor Green
Write-Host ""

# === 6. Start Postgres ===
Write-Host "[6/9] Starting Postgres..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: docker compose up failed" -ForegroundColor Red
    exit 1
}

Write-Host "Waiting for Postgres healthy..." -ForegroundColor Yellow
$ready = $false
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    $status = docker compose ps --format json 2>$null | Out-String
    if ($status -match '"Health":\s*"healthy"') {
        $ready = $true
        break
    }
}

if (-not $ready) {
    Write-Host "ERROR: Postgres not healthy in 30s" -ForegroundColor Red
    docker compose logs db
    exit 1
}
Write-Host "OK: Postgres ready" -ForegroundColor Green
Write-Host ""

# === 7. package.json scripts ===
Write-Host "[7/9] Updating package.json..." -ForegroundColor Yellow

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
Write-Host "OK: package.json updated" -ForegroundColor Green
Write-Host ""

# === 8. Prisma migration ===
Write-Host "[8/9] Running Prisma migration..." -ForegroundColor Yellow
pnpm prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: migration failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Migration done" -ForegroundColor Green
Write-Host ""

# === 9. Seed ===
Write-Host "[9/9] Seeding database..." -ForegroundColor Yellow
pnpm db:seed
Write-Host ""

Write-Host "BOOTSTRAP COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  pnpm scrape       - run scraping"
Write-Host "  pnpm rank         - see top 10"
Write-Host "  pnpm db:studio    - browse DB"
Write-Host "  pnpm dev          - start dev server"
Write-Host ""
Write-Host "Manual next:" -ForegroundColor Yellow
Write-Host "  pnpm dlx shadcn@latest init"
Write-Host "  pnpm dlx shadcn@latest add card badge button table skeleton sonner tooltip separator"
