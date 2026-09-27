# Product Requirements Document — TikTok Dashboard

| Field | Value |
| --- | --- |
| Produk | TikTok Dashboard (internal, single-tenant) |
| Versi dokumen | 1.1 |
| Tanggal | 2026-09-23 |
| Status | Living document — mencerminkan produk yang sudah live + backlog |
| Owner | salmankecedarilahir |
| Production | https://tiktok-dashboard-three.vercel.app |
| Repository | https://github.com/salmankecedarilahir/tiktok-dashboard |

> Dokumen ini mendefinisikan spesifikasi kebutuhan produk (*Product Requirements*) yang **sudah berjalan (shipped)** serta lingkup kerja yang **sedang dan akan dikerjakan**. Setiap requirement ditandai status:
> ✅ Shipped · 🚧 Partial · 📋 Planned.
> Dokumen ini menjawab *apa & kenapa*, serta batasan fungsional sistem.

---

## 1. Ringkasan Eksekutif

TikTok Dashboard adalah aplikasi web internal untuk mengelola **satu channel TikTok** secara end-to-end:
1. Menarik dan menyimpan metrik video sebagai time-series (append-only).
2. Menghasilkan rekomendasi strategi konten dari data historis channel sendiri (jam posting, kombinasi hashtag, durasi, pola caption).
3. Melacak video produksi internal (inhouse) per minggu dengan evaluasi kualitatif dan ekspor laporan mingguan.
4. Menjalankan pipeline kemitraan brand dari inquiry, negosiasi, konversi ke campaign, pembuatan rencana bagi hasil (*Contribution Plan*), hingga penerbitan laporan PDF resmi untuk klien.

Masalah utama yang dipecahkan: TikTok Studio hanya menampilkan snapshot performa terkini, tidak menyimpan histori jangka panjang per video, tidak memiliki modul manajemen brand deal maupun contribution plan, serta tidak menyediakan generator laporan PDF profesional. Tim sebelumnya menambal gap tersebut dengan spreadsheet manual dan tangkapan layar—lambat, rawan salah input, dan tidak efisien.

---

## 2. Problem Statement

| # | Masalah | Dampak Nyata |
| --- | --- | --- |
| **P1** | TikTok Studio tidak menyimpan histori metrik per video | Tidak dapat menganalisis kurva pertumbuhan; sulit membedakan video evergreen vs video yang stagnan |
| **P2** | Insight konten (jam posting, hashtag, durasi, pola caption) dikira-kira | Keputusan editorial berdasarkan intuisi atau tren umum luar, bukan data riil audiens channel sendiri |
| **P3** | Brand deal dikelola manual di chat dan spreadsheet | Inquiry tercecer, status kesepakatan tidak jelas, follow-up terlambat |
| **P4** | Pembuatan proposal & laporan campaign manual di Canva/Docs | Memakan waktu berjam-jam per campaign, format inkonsisten, dan angka rawan salah ketik |
| **P5** | Alokasi bagi hasil dan pembagian peran tim (*Contribution Plan*) terpisah | Saat deal campaign disepakati, tim harus menyusun rencana kerja/insentif secara terpisah dan rawan tidak sinkron |
| **P6** | Evaluasi konten mingguan tim internal tidak terdokumentasi rapi | Tidak ada bank pembelajaran kualitatif ("mengapa video ini perform/tidak") untuk dipelajari di periode berikutnya |
| **P7** | Data komersial sensitif berisiko terbuka | Data rate card dan nominal deal brand bisa diakses tanpa pembatasan hak akses yang tegas |

---

## 3. Goals & Non-Goals

### 3.1 Goals
1. **Simpan histori metrik time-series**: Snapshot append-only per video untuk melacak perkembangan views, likes, comments, dan shares harian.
2. **Ubah data menjadi keputusan terukur**: Rekomendasi otomatis jam posting, kombinasi hashtag terbaik, bucket durasi ideal, dan formula caption dari data channel sendiri.
3. **Pusat kendali brand deal terpadu**: Mengelola siklus brand deal dari inquiry, negosiasi, konversi ke campaign, hingga laporan akhir.
4. **Otomasi Contribution Plan**: Otomatis membuat draf rencana kontribusi dan alokasi peran/bagi hasil tim saat campaign terbentuk.
5. **Laporan siap kirim dalam 1 klik**: Proposal brand, Campaign Report, Contribution Plan Report, dan Weekly Inhouse Report dalam format PDF terstandarisasi.
6. **Disiplin evaluasi mingguan**: Video internal dicatat per minggu dengan catatan evaluasi kualitatif dan rekap engagement.
7. **Keamanan berbasis peran (RBAC)**: Mengamankan data sensitif (konfigurasi channel, rate card, manajemen user) sesuai hak akses.

### 3.2 Non-Goals (Eksplisit di Luar Scope)
- **Multi-tenant / Multi-channel**: Dirancang khusus single-tenant untuk 1 channel utama.
- **Posting / Scheduling otomatis ke TikTok**: Dashboard hanya membaca data performa, tidak mempublikasikan video ke TikTok.
- **Dukungan platform lain**: Fokus eksklusif pada ekosistem TikTok (tidak mencakup IG Reels, YouTube Shorts, dll.).
- **Rekomendasi Black-Box LLM**: Semua insight dihitung menggunakan agregasi statistik & kueri SQL deterministik yang transparan dan dapat diaudit.
- **Modul Payment Gateway / Invoicing**: Berhenti pada pencatatan nilai deal dan porsi kontribusi; eksekusi transfer perbankan berada di luar sistem.

---

## 4. Users & Roles

Sistem menerapkan Role-Based Access Control (RBAC) pada dua lapis: Middleware Next.js (navigasi halaman) dan Helper `requireRole()` pada API Route Handlers.

| Role | Persona | Wewenang & Hak Akses | Batasan |
| --- | --- | --- | --- |
| `ADMIN` | Owner channel / Lead Manager | Akses penuh: manajemen user, konfigurasi channel & branding, import CSV TikTok Studio, hapus data. | — |
| `EDITOR` | Campaign Lead / Social Media Staff | Buat & edit brief, campaign, contribution plan, video metrics, weekly inhouse; generate PDF; trigger manual refresh. | Tidak dapat mengubah `ChannelConfig` atau mengimpor Overview CSV. |
| `VIEWER` | Stakeholder internal / Reviewer | Read-only ke seluruh dasbor, analytics, brief, campaign, contribution plan, dan inhouse report. | Tidak dapat melakukan operasi tulis (Create/Update/Delete). |

*Catatan: Semua pengguna terautentikasi dapat mengganti password akun masing-masing.*

---

## 5. Scope Fungsional

### 5.1 Autentikasi & Hak Akses — ✅ Shipped

| ID | Requirement | Status |
| --- | --- | --- |
| AUTH-1 | Login dengan email dan password; hashing aman via bcrypt; registrasi publik dinonaktifkan (user dibuat via seed/admin). | ✅ |
| AUTH-2 | Manajemen sesi JWT via NextAuth dengan masa aktif 7 hari. | ✅ |
| AUTH-3 | Proteksi rute `/dashboard/*`; sesi tidak valid dialihkan ke `/login`. | ✅ |
| AUTH-4 | Rute `/dashboard/channel` dan `/dashboard/import` khusus role `ADMIN`. | ✅ |
| AUTH-5 | Verifikasi role pada seluruh endpoint API mutasi (401 vs 403 dibedakan secara tegas). | ✅ |
| AUTH-6 | Token sesi lama tanpa klaim role ditolak otomatis dan diarahkan untuk login ulang. | ✅ |
| AUTH-7 | Fitur ubah password mandiri dengan validasi kecocokan password lama. | ✅ |
| AUTH-8 | Fitur reset password user oleh Admin via UI dasbor. | 📋 (saat ini via script CLI) |
| AUTH-9 | Audit log perubahan data sensitif oleh pengguna. | 📋 |

### 5.2 Pipeline Analytics & Data Scraping — ✅ Shipped

| ID | Requirement | Status |
| --- | --- | --- |
| ANA-1 | Auto-scrape harian via Vercel Cron (`0 19 * * *` UTC) dengan otentikasi header `Authorization: Bearer CRON_SECRET`. | ✅ |
| ANA-2 | Penyimpanan metrik bersifat **append-only** di tabel `VideoSnapshot` (tanpa operasi update/delete histori). | ✅ |
| ANA-3 | Pembulatan `capturedAt` ke satuan detik untuk mencegah duplikasi snapshot pada proses bersamaan. | ✅ |
| ANA-4 | Abstraksi provider scraper via env: `mock` (pengembangan), `tikapi` (API resmi), `csv` (file lokal). | ✅ |
| ANA-5 | Penanganan error per video: kegagalan 1 video tidak membatalkan keseluruhan antrean cron scraping. | ✅ |
| ANA-6 | Mekanisme retry otomatis 3x dengan exponential backoff saat memanggil provider pihak ketiga. | ✅ |
| ANA-7 | Pencatatan rekam jejak job scraping pada tabel `ScrapeJob` (status, provider, durasi, record count, error). | ✅ |
| ANA-8 | Manual refresh metrik dari UI untuk ADMIN/EDITOR dengan in-memory rate limiting (1x per 60 detik). | 🚧 |
| ANA-9 | Import manual `Overview.csv` dari TikTok Studio ke tabel `DailyMetric` (maks 5 MB). | ✅ |
| ANA-10 | Auto-inference tahun pada parsing tanggal TikTok Studio yang mengekspor tanggal tanpa tahun (misal `"May 13"`). | ✅ |
| ANA-11 | Tampilan UI riwayat eksekusi ScrapeJob untuk audit dan debugging operasional. | 📋 |
| ANA-12 | Sistem alert notifikasi saat cron job scraping mengalami kegagalan beruntun. | 📋 |

### 5.3 Ranking & Rekomendasi Konten — ✅ Shipped

| ID | Requirement | Status |
| --- | --- | --- |
| REC-1 | Perhitungan top video mengacu pada **snapshot terbaru per video**, bukan rerata histori. | ✅ |
| REC-2 | Kalkulasi `relevance_score`: Pembobotan engagement rate (Likes 40%, Comments 35%, Shares 15%) + faktor peluruhan recency (10%, linier hingga 90 hari). | ✅ |
| REC-3 | Filter ambang batas minimal performa: video dengan < 1.000 views dikecualikan dari komputasi ranking. | ✅ |
| REC-4 | Rekomendasi **Jam Posting**: Identifikasi slot waktu dengan rerata engagement tertinggi. | ✅ |
| REC-5 | Rekomendasi **Kombinasi Hashtag**: Ekstraksi klaster hashtag yang paling sering muncul di top video. | ✅ |
| REC-6 | Rekomendasi **Durasi Video**: Pengelompokan bucket durasi dengan interaksi terbaik. | ✅ |
| REC-7 | Rekomendasi **Pola Caption**: Deteksi struktur caption berkinerja tinggi (pertanyaan, CTA, dll.) via regex. | ✅ |
| REC-8 | Caching rekomendasi terkomputasi pada tabel `Recommendation` per jenis (`kind`). | 🚧 |
| REC-9 | Konfigurasi bobot kalkulasi ranking yang dapat diubah langsung dari UI. | 📋 |
| REC-10 | Tampilan grafik visual kurva tren time-series per video di UI. | 📋 |

### 5.4 Brand Pipeline & Campaign Management — ✅ Shipped

| ID | Requirement | Status |
| --- | --- | --- |
| BRF-1 | Alur status Brief: `INQUIRY` ➔ `NEGOTIATING` ➔ `CONFIRMED` ➔ `ACTIVE` ➔ `DONE` atau `ARCHIVED`. | ✅ |
| BRF-2 | Penyimpanan data komersial komprehensif: paket, harga kesepakatan, deliverables, target views, tanggal, dan PIC. | ✅ |
| BRF-3 | Pemisahan catatan internal tim dengan instruksi yang menghadap brand. | ✅ |
| BRF-4 | Badge visual indikator jumlah brief aktif di navigasi dasbor. | ✅ |
| BRF-5 | Konversi atomik Brief terkonfirmasi menjadi Campaign dalam 1 transaksi database. | ✅ |
| BRF-6 | Validasi kelengkapan data sebelum konversi (nama campaign, rentang tanggal wajib terisi). | ✅ |
| BRF-7 | Relasi ketat 1:1 antara Brief dan Campaign. | ✅ |
| CMP-1 | Pembuatan Campaign langsung tanpa melalui Brief (untuk deal yang sudah matang dari awal). | ✅ |
| CMP-2 | Input manual metrik per video campaign (views, likes, comments, shares) berdasarkan data resmi TikTok Studio. | ✅ |
| CMP-3 | Manajemen penghapusan Campaign fleksibel: Opsi konfirmasi untuk menghapus bersih (*cascade*) atau mempertahankan (*detach*) Contribution Plan terkait. | ✅ |
| CMP-4 | Fitur notifikasi pengingat tenggat waktu (*deadline reminder*) campaign. | 📋 |

### 5.5 Contribution Plan (Bagi Hasil / Kontribusi Tim) — ✅ Shipped

| ID | Requirement | Status |
| --- | --- | --- |
| CNT-1 | Relasi entitas: Model `ContributionPlan` terhubung langsung (1:1) dengan entitas `Campaign`. | ✅ |
| CNT-2 | **Otomasi Pembuatan Draft**: Sistem secara otomatis membuat *Draft Contribution Plan* saat Campaign baru dibuat (baik secara langsung maupun dari konversi Brief). | ✅ |
| CNT-3 | Alur status Contribution Plan: `DRAFT` ➔ `ACTIVE` ➔ `COMPLETED` ➔ `ARCHIVED`. | ✅ |
| CNT-4 | Manajemen item kontribusi (`ContributionPlanItem`): Pengaturan peran tim (Creator, Editor, Talent, Scriptwriter, Project Manager) beserta porsi fee atau persentase bagi hasil. | ✅ |
| CNT-5 | Integrasi penghapusan aman: Saat campaign dihapus, pengguna diberikan opsi eksplisit apakah contribution plan ikut dihapus atau dilepas relasinya. | ✅ |
| CNT-6 | Generator PDF Contribution Plan yang selaras dengan Campaign Report (mencakup ringkasan metrik, identitas brand, tabel tim pelaksana, dan styling terpadu). | ✅ |

### 5.6 Inhouse Video Tracking — ✅ Shipped

| ID | Requirement | Status |
| --- | --- | --- |
| INH-1 | Siklus kerja tetap 4 minggu per bulan (1–7, 8–14, 15–21, 22–akhir bulan). | ✅ |
| INH-2 | Penambahan video via URL TikTok dengan validasi format dan ekstraksi ID video otomatis. | ✅ |
| INH-3 | Pencegahan duplikasi video dalam minggu yang sama (kombinasi unik `videoId + week + month + year`). | ✅ |
| INH-4 | Input metrik performa manual (views, likes, comments, shares) dari TikTok Studio. | ✅ |
| INH-5 | Kolom evaluasi kualitatif bebas per video untuk catatan pembelajaran editorial. | ✅ |
| INH-6 | Perhitungan otomatis engagement rate video: `(likes + comments + shares) / views × 100`. | ✅ |
| INH-7 | Inisialisasi otomatis entitas `InhouseWeeklyReport` saat video pertama pada minggu tersebut dimasukkan. | ✅ |
| INH-8 | Kolom ringkasan evaluasi mingguan tingkat tim per periode minggu. | ✅ |
| INH-9 | Kalkulasi metrik agregat bulanan secara otomatis (total video, views, likes, comments, shares, rerata engagement). | ✅ |
| INH-10 | Ekspor rekapitulasi mingguan inhouse ke format dokumen PDF. | ✅ |
| INH-11 | Operasi penghapusan video yang bersifat idempoten untuk mencegah double-trigger error. | ✅ |
| INH-12 | Auto-sync metrik video inhouse dari pipeline scraper harian (menggantikan input manual). | 📋 |

### 5.7 Laporan Dokumen PDF — ✅ Shipped

| ID | Requirement | Status |
| --- | --- | --- |
| PDF-1 | **Brand Proposal PDF**: Digunakan pada tahap negosiasi/pitching (memuat profil channel, demografi audiens, rekam jejak, dan paket penawaran). | ✅ |
| PDF-2 | **Campaign Report PDF**: Laporan akhir performa brand campaign (ringkasan views, likes, comments, shares, engagement rate, dan daftar detail video). | ✅ |
| PDF-3 | **Contribution Plan Report PDF**: Lembar rencana bagi hasil dan alokasi peran tim dengan styling dan tema yang konsisten dengan Campaign Report. | ✅ |
| PDF-4 | **Inhouse Weekly Report PDF**: Lembar evaluasi mingguan produksi konten internal beserta catatan evaluasi kualitatif. | ✅ |
| PDF-5 | Server-side rendering (React-PDF) di-stream langsung sebagai respons HTTP `application/pdf` tanpa membebani disk penyimpanan lokal. | ✅ |
| PDF-6 | Dinamisme visual branding: Nama channel, handle, tagline, demografi, dan warna tema (`themeColor`) disinkronkan dari `ChannelConfig`. | ✅ |
| PDF-7 | Fitur upload logo brand langsung ke cloud object storage (saat ini via input URL logo). | 📋 |

### 5.8 Konfigurasi Channel & Branding — ✅ Shipped

| ID | Requirement | Status |
| --- | --- | --- |
| CFG-1 | Konfigurasi tunggal (single-row): nama channel, handle `@`, dan total followers resmi. | ✅ |
| CFG-2 | Profil demografi audiens: distribusi gender, kelompok usia (18–24, 25–34, 35+), dan top lokasi pengikut. | ✅ |
| CFG-3 | Pengaturan branding terpusat: warna primer tema (default `#DC2626`) dan tagline resmi untuk seluruh dokumen PDF. | ✅ |
| CFG-4 | Proteksi ketat: modul konfigurasi channel hanya dapat dibaca dan diperbarui oleh role `ADMIN`. | ✅ |

---

## 6. Non-Functional Requirements (NFR)

| ID | Kategori | Spesifikasi & Ketentuan | Status |
| --- | --- | --- | --- |
| **NFR-1** | Integritas Data | Histori metrik snapshot bersifat append-only; tidak ada kode yang menghapus/mengubah baris `video_snapshots`. | ✅ |
| **NFR-2** | Tipe Data Numerik | Seluruh metrik besar menggunakan format `BigInt` di database dan diserialisasi aman sebelum diserahkan ke client via JSON. | ✅ |
| **NFR-3** | Validasi Data | Seluruh input API divalidasi dengan Zod; respons error 400 mengembalikan detail validasi per field yang jelas. | ✅ |
| **NFR-4** | Validasi Lingkungan | Environment variables divalidasi via Zod saat inisialisasi aplikasi (*fail-fast* jika konfigurasi tidak lengkap). | ✅ |
| **NFR-5** | Keamanan Secret | Kunci rahasia sistem (`CRON_SECRET`, `NEXTAUTH_SECRET`) menerapkan standar minimum 32 karakter acak. | ✅ |
| **NFR-6** | Pembatasan Upload | Batas maksimal file upload CSV dibatasi hingga 5 MB untuk mencegah memory exhaustion. | ✅ |
| **NFR-7** | Reliabilitas Komputasi | Vercel Cron dibatasi `maxDuration = 60s`; retry provider pihak ketiga maksimal 3x dengan penundaan eksponensial. | ✅ |
| **NFR-8** | Standar Observabilitas | Logging terstruktur menggunakan Pino dengan tag modul yang jelas (menghindari penggunaan `console.log`). | ✅ |
| **NFR-9** | Kesegaran Data | Halaman dasbor menerapkan strategi `force-dynamic` (`revalidate = 0`) untuk memastikan data selalu aktual saat dimuat. | ✅ |
| **NFR-10** | Skalabilitas Rate Limit | Rate limit manual refresh saat ini menggunakan penyimpanan in-memory; wajib migrasi ke Redis sebelum multi-instance. | 🚧 |
| **NFR-11** | Automated Testing | Penyusunan test suite otomatis (unit & integration test) untuk alur konversi, ranking, dan parser CSV. | 📋 |
| **NFR-12** | Standar Desain Dokumen | Format dokumen PDF menerapkan typography, palet warna dinamis, dan tata letak tabel yang seragam di seluruh modul laporan. | ✅ |

---

## 7. Arsitektur Relasi Data

```
[ChannelConfig] ──── (Konfigurasi branding, profil, demografi)

[User] ───────────── (Akun pengguna internal, password hash, role)

[DailyMetric] ────── (Metrik agregat level channel hasil import CSV)

[Video] ──────────── 1:N ─── [VideoSnapshot] (Time-series deret metrik harian)
  │
[ScrapeJob] ──────── (Log eksekusi cron scraper harian)

[Brief] ──────────── 1:1 ─── [Campaign] ─── 1:N ─── [CampaignVideo]
                                 │
                                1:1 (Opsional / Cascade)
                                 │
                       [ContributionPlan] ─── 1:N ─── [ContributionPlanItem]

[InhouseWeeklyReport] 1:N ── [InhouseVideo] (Evaluasi & tracking internal mingguan)
```

---

## 8. Success Metrics

| Metrik Kunci | Sebelum Ada Sistem | Target & Capaian Dashboard |
| --- | --- | --- |
| Waktu penyusunan proposal brand | ~2 jam (manual Canva/Docs) | **< 3 menit** (otomatis via sistem) |
| Waktu pembuatan laporan akhir campaign | ~3 jam (rekap tangkapan layar manual) | **< 5 menit** (1-klik generate PDF) |
| Penyusunan rencana kontribusi tim | Dibuat manual terpisah, sering terlupa | **0 detik** (otomatis terbentuk draf saat deal) |
| Tingkat kehilangan peluang (*inquiry lost*) | Tidak terlacak di chat personal | **0 kasus** (semua inquiry tercatat terpusat) |
| Ketersediaan data historis performa | 0 hari (TikTok Studio hanya snapshot sesaat) | **≥ 90 hari** deret waktu time-series lengkap |
| Tingkat keberhasilan eksekusi cron harian | — | **≥ 98%** run sukses per bulan |
| Kelengkapan evaluasi video internal | ~0% (tidak pernah tercatat) | **100%** video memiliki catatan kualitatif |

---

## 9. Risiko & Mitigasi

| Risiko Potensial | Tingkat Dampak | Rencana Mitigasi |
| --- | --- | --- |
| Perubahan/pembatasan API pihak ketiga TikTok | Kritis | Desain provider modular: fallback cepat ke mode `csv` atau direct input tanpa merusak pipeline data. |
| Salah ketik pada input metrik manual | Sedang | Validasi skema ketat menggunakan Zod serta batas kewajaran tipe data numerik. |
| In-memory rate limiting pada multi-instance | Rendah | Arsitektur saat ini berjalan single instance; roadmap v1.2 mencakup transisi ke Upstash Redis. |
| Hilangnya histori contribution plan saat campaign dihapus | Sedang | Dialog konfirmasi interaktif dengan opsi retensi (*retain/detach*) atau pembersihan menyeluruh (*cascade*). |

---

## 10. Roadmap Rilis

### Versi 1.0 — Fondasi & Core Workflow (Shipped ✅)
- Sistem Autentikasi & RBAC (Admin, Editor, Viewer).
- Pipeline data time-series (append-only) & Vercel Cron scraper.
- Engine ranking & 4 rekomendasi konten (jam, hashtag, durasi, caption).
- Pipeline brand brief, konversi campaign, dan inhouse weekly tracking.
- Ekspor PDF Proposal, Campaign Report, dan Inhouse Report.
- Import data CSV TikTok Studio & panel konfigurasi channel.

### Versi 1.1 — Contribution Plan & Workflow Alignment (Shipped ✅)
- Modul Contribution Plan terintegrasi penuh.
- Otomasi pembuatan draf Contribution Plan saat Campaign dibuat atau dikonversi dari Brief.
- Fleksibilitas penghapusan Campaign dengan opsi retensi Contribution Plan.
- Standardisasi layout, kartu ringkasan, dan branding pada Contribution Plan PDF report agar selaras dengan Campaign Report.

### Versi 1.2 — Technical Debt & Fitur Lanjutan (Planned 📋)
- Pembacaan rekomendasi langsung dari cache tabel `Recommendation`.
- Visualisasi grafik interaktif kurva pertumbuhan views time-series per video.
- Suite automated test (unit & e2e) untuk alur konversi dan kalkulasi ranking.
- Transisi rate limiting ke Redis untuk kesiapan multi-instance.
- Notifikasi alert via webhook saat cron scraper mengalami kegagalan beruntun.
