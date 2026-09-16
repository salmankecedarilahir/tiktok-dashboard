# Product Requirements Document — TikTok Dashboard

| Field | Value |
| --- | --- |
| Produk | TikTok Dashboard (internal, single-tenant) |
| Versi dokumen | 1.0 |
| Tanggal | 2026-09-07 |
| Status | Living document — mencerminkan produk yang sudah live + backlog |
| Owner | salmankecedarilahir |
| Production | https://tiktok-dashboard-three.vercel.app |
| Repository | https://github.com/salmankecedarilahir/tiktok-dashboard |

> Dokumen ini menulis ulang produk yang **sudah berjalan** sebagai requirement,
> plus scope yang **belum dikerjakan**. Setiap requirement ditandai status:
> ✅ Shipped · 🚧 Partial · 📋 Planned.
> Untuk detail implementasi teknis (file, fungsi, data flow), lihat
> `PROJECT_OVERVIEW.md`. Dokumen ini menjawab *apa & kenapa*, bukan *bagaimana*.

---

## 1. Ringkasan Eksekutif

TikTok Dashboard adalah aplikasi web internal untuk mengelola **satu channel
TikTok** secara end-to-end: menarik dan menyimpan metrik video sebagai
time-series, menghasilkan rekomendasi konten dari data historis, melacak video
produksi sendiri (inhouse) per minggu, dan menjalankan pipeline brand deal dari
inquiry sampai laporan PDF untuk klien.

Masalah yang dipecahkan: TikTok Studio hanya menampilkan snapshot terkini,
tidak menyimpan histori per video, tidak punya konsep "brand deal", dan tidak
bisa mengeluarkan laporan yang layak dikirim ke klien. Tim menambal gap itu
dengan spreadsheet manual + screenshot — lambat, rawan salah, dan tidak bisa
dijadikan bukti performa saat negosiasi harga.

---

## 2. Problem Statement

| # | Masalah | Dampak hari ini |
| --- | --- | --- |
| P1 | TikTok Studio tidak menyimpan histori metrik per video | Tidak bisa lihat kurva pertumbuhan; tidak tahu video mana yang masih naik vs sudah mati |
| P2 | Insight konten (jam posting, hashtag, durasi, pola caption) dikira-kira | Keputusan konten berdasarkan feeling, bukan data channel sendiri |
| P3 | Brand deal ditrack di chat + spreadsheet | Inquiry hilang, status tidak jelas, follow-up telat |
| P4 | Proposal & laporan campaign dibuat manual di Canva/Docs | Berjam-jam per campaign, format tidak konsisten, angka rawan typo |
| P5 | Evaluasi konten mingguan tidak terdokumentasi | Tidak ada catatan "kenapa video ini perform" untuk dipelajari bulan depan |
| P6 | Data channel dan brand deal bisa diakses siapa saja yang punya link | Data harga/deal bocor ke pihak yang tidak perlu tahu |

---

## 3. Goals & Non-Goals

### 3.1 Goals

1. **Simpan histori metrik**, bukan cuma angka terkini — snapshot append-only per video.
2. **Ubah data jadi keputusan** — rekomendasi jam posting, hashtag, durasi, dan pola caption dari data channel sendiri.
3. **Satu tempat untuk brand deal** — dari inquiry masuk sampai campaign selesai, dengan status yang jelas.
4. **Laporan siap kirim dalam satu klik** — proposal & campaign report PDF di-generate server-side.
5. **Disiplin evaluasi mingguan** — video inhouse dicatat per minggu dengan evaluasi tertulis + PDF rekap.
6. **Akses berbasis peran** — data sensitif (harga, config channel) hanya untuk yang berhak.

### 3.2 Non-Goals (eksplisit di luar scope)

- **Multi-tenant / multi-channel.** Single-tenant by design; menambah tenancy berarti rewrite data model.
- **Posting / scheduling ke TikTok.** Dashboard hanya membaca, tidak pernah menulis ke TikTok.
- **Platform lain** (Instagram, YouTube, Shopee Live).
- **Rekomendasi berbasis LLM.** Semua insight murni agregasi SQL — deterministik dan bisa diaudit.
- **Invoicing / pembayaran.** Berhenti di laporan; keuangan di luar sistem.
- **Media kit publik.** Semua halaman ada di balik login.

---

## 4. Users & Roles

Tiga peran, dienforce di dua lapis: middleware (halaman) + `requireRole()` (API).

| Role | Persona | Boleh | Tidak boleh |
| --- | --- | --- | --- |
| `ADMIN` | Owner channel / manager | Semua — termasuk config channel, import CSV, hapus data | — |
| `EDITOR` | Social media / campaign staff | Buat & edit brief, campaign, video metrics, inhouse; generate PDF; manual refresh | Ubah `ChannelConfig`, import Overview CSV |
| `VIEWER` | Stakeholder internal | Baca dashboard, briefs, campaigns, inhouse | Semua operasi tulis |

Semua user (termasuk VIEWER) bisa mengganti password sendiri.

---

## 5. Scope Fungsional

### 5.1 Autentikasi & Akses — ✅ Shipped

| ID | Requirement | Status |
| --- | --- | --- |
| AUTH-1 | Login email + password; password di-hash bcrypt; tidak ada self-registration (user dibuat via seed/script) | ✅ |
| AUTH-2 | Session JWT, masa berlaku 7 hari | ✅ |
| AUTH-3 | Seluruh `/dashboard/*` wajib login; unauthenticated → redirect `/login` | ✅ |
| AUTH-4 | `/dashboard/channel` dan `/dashboard/import` khusus ADMIN; non-admin → redirect ke `/dashboard/campaigns` | ✅ |
| AUTH-5 | Setiap route API tulis memverifikasi session **dan** role (401 vs 403 dibedakan) | ✅ |
| AUTH-6 | Token lama tanpa klaim `role` diperlakukan sebagai unauthenticated (paksa re-login) | ✅ |
| AUTH-7 | Ganti password mandiri, wajib memasukkan password lama | ✅ |
| AUTH-8 | Reset password oleh admin lewat UI | 📋 saat ini hanya via `scripts/reset-password.ts` |
| AUTH-9 | Audit log siapa mengubah apa | 📋 |

### 5.2 Pipeline Analytics — ✅ Shipped

| ID | Requirement | Status |
| --- | --- | --- |
| ANA-1 | Scrape harian otomatis via Vercel Cron (`0 19 * * *` UTC), diproteksi `Authorization: Bearer CRON_SECRET` | ✅ |
| ANA-2 | Metrik disimpan **append-only** sebagai `VideoSnapshot`; snapshot tidak pernah di-`UPDATE`/`DELETE` | ✅ |
| ANA-3 | `capturedAt` dibulatkan ke detik agar dua run dalam detik yang sama tidak menggandakan baris | ✅ |
| ANA-4 | Sumber data dapat ditukar lewat env: `mock` (dev), `tikapi` (API resmi), `csv` (file lokal) — tanpa mengubah pipeline | ✅ |
| ANA-5 | Kegagalan satu video tidak menggagalkan seluruh job; error dicatat, loop lanjut | ✅ |
| ANA-6 | Panggilan provider di-retry 3x dengan exponential backoff | ✅ |
| ANA-7 | Setiap run tercatat di `ScrapeJob` (status, provider, jumlah video/snapshot, durasi, pesan error) | ✅ |
| ANA-8 | Manual refresh dari UI untuk ADMIN/EDITOR, dibatasi 1x per 60 detik | 🚧 rate limit in-memory — hanya valid selama single instance |
| ANA-9 | Import `Overview.csv` dari TikTok Studio → `DailyMetric` (ADMIN, maks 5 MB) | ✅ |
| ANA-10 | Tahun di CSV diinfer dengan menelusuri baris mundur dari `endDate` (TikTok mengekspor `"May 13"` tanpa tahun) | ✅ |
| ANA-11 | Halaman riwayat scrape job untuk debugging cron | 📋 |
| ANA-12 | Alert saat cron gagal N kali berturut-turut | 📋 |

### 5.3 Ranking & Rekomendasi — ✅ Shipped

| ID | Requirement | Status |
| --- | --- | --- |
| REC-1 | Top videos diambil dari snapshot **terbaru per video**, bukan rata-rata seluruh histori | ✅ |
| REC-2 | `relevance_score` = engagement rate berbobot (likes 40, comments 35, shares 15) + recency (10, luruh linear sampai 90 hari) | ✅ |
| REC-3 | Video dengan < 1.000 views dikecualikan dari ranking | ✅ |
| REC-4 | Rekomendasi **jam posting** — slot waktu dengan engagement rata-rata tertinggi | ✅ |
| REC-5 | Rekomendasi **kombinasi hashtag** — hashtag yang paling sering muncul di video top | ✅ |
| REC-6 | Rekomendasi **durasi** — bucket durasi dengan engagement tertinggi | ✅ |
| REC-7 | Rekomendasi **pola caption** — pola regex (pertanyaan, CTA, dll) yang berkorelasi dengan views lebih tinggi | ✅ |
| REC-8 | Hasil rekomendasi di-cache di tabel `Recommendation` per `kind` saat cron berjalan | 🚧 cache ditulis tapi dashboard masih compute-on-demand |
| REC-9 | Bobot ranking dapat dikonfigurasi dari UI | 📋 saat ini konstanta di kode |
| REC-10 | Grafik tren per video dari histori snapshot | 📋 nilai utama time-series belum terekspos di UI |

### 5.4 Brand Workflow — ✅ Shipped

| ID | Requirement | Status |
| --- | --- | --- |
| BRF-1 | Brief masuk dengan status `INQUIRY`, bergerak melalui `NEGOTIATING → CONFIRMED → ACTIVE → DONE`, atau `ARCHIVED` | ✅ |
| BRF-2 | Brief menyimpan data komersial: paket, harga custom, deliverables, jaminan views, requirement, tanggal mulai/selesai, PIC | ✅ |
| BRF-3 | Catatan internal terpisah dari catatan yang menghadap brand | ✅ |
| BRF-4 | Badge jumlah brief aktif di navigasi | ✅ |
| BRF-5 | Convert brief → campaign bersifat atomik: `Campaign` dibuat, brief di-link, status jadi `ACTIVE`, dalam satu transaksi | ✅ |
| BRF-6 | Convert ditolak jika `campaignName`, `startDate`, atau `endDate` belum terisi | ✅ |
| BRF-7 | Satu brief maksimal terhubung ke satu campaign (relasi 1:1) | ✅ |
| CMP-1 | Campaign dapat dibuat langsung tanpa brief (deal yang datang sudah jadi) | ✅ |
| CMP-2 | Metrik per video campaign diinput **manual** — angka resmi dari TikTok Studio, bukan hasil scrape | ✅ |
| CMP-3 | Menghapus campaign ikut menghapus seluruh video-nya (cascade) | ✅ |
| CMP-4 | Reminder deadline campaign | 📋 |

### 5.5 Inhouse Video Tracking — ✅ Shipped

Domain terpisah dari brand campaign: video produksi sendiri, dievaluasi mingguan.

| ID | Requirement | Status |
| --- | --- | --- |
| INH-1 | Bulan dibagi tetap 4 minggu: 1–7, 8–14, 15–21, 22–akhir bulan | ✅ |
| INH-2 | Video ditambahkan lewat URL TikTok; ID video diekstrak otomatis; short link `vm.tiktok.com` ditolak | ✅ |
| INH-3 | Video yang sama tidak boleh masuk dua kali dalam minggu yang sama (unique `videoId + week + month + year`) | ✅ |
| INH-4 | Metrik (views, likes, comments, shares) diinput manual dari TikTok Studio | ✅ |
| INH-5 | Setiap video punya kolom **evaluasi** bebas — catatan kualitatif kenapa perform / tidak | ✅ |
| INH-6 | Engagement rate dihitung otomatis: `(likes + comments + shares) / views × 100` | ✅ |
| INH-7 | Weekly report dibuat otomatis saat video pertama minggu itu ditambahkan | ✅ |
| INH-8 | Ringkasan mingguan bisa ditulis manual per minggu | ✅ |
| INH-9 | Total bulanan (jumlah video, views, likes, comments, shares, rata-rata engagement) dihitung otomatis | ✅ |
| INH-10 | PDF rekap mingguan dapat di-generate dan mencatat waktu generate terakhir | ✅ |
| INH-11 | Hapus video bersifat idempoten (klik ganda tidak error) | ✅ |
| INH-12 | Tarik metrik inhouse otomatis dari pipeline scrape, hilangkan input manual | 📋 |

### 5.6 Laporan PDF — ✅ Shipped

| ID | Requirement | Status |
| --- | --- | --- |
| PDF-1 | **Proposal** — dikirim ke brand pada tahap inquiry/negosiasi; memuat profil channel, demografi, dan penawaran | ✅ |
| PDF-2 | **Campaign report** — laporan akhir; memuat metrik per video + agregat | ✅ |
| PDF-3 | **Inhouse weekly report** — rekap video + evaluasi minggu berjalan | ✅ |
| PDF-4 | PDF dirender server-side dan di-stream sebagai `application/pdf` (tidak ada file yang disimpan) | ✅ |
| PDF-5 | Branding (nama channel, handle, warna, tagline, demografi) diambil dari `ChannelConfig` | ✅ |
| PDF-6 | Upload logo brand ke object storage (saat ini hanya URL) | 📋 |

### 5.7 Konfigurasi Channel — ✅ Shipped

| ID | Requirement | Status |
| --- | --- | --- |
| CFG-1 | Satu baris config: nama channel, handle, total follower | ✅ |
| CFG-2 | Demografi manual: split gender, bucket usia (18–24, 25–34, 35+), lokasi teratas | ✅ |
| CFG-3 | Branding: warna utama (default `#DC2626`) + tagline, dipakai di seluruh PDF | ✅ |
| CFG-4 | Hanya ADMIN yang boleh membaca & menulis config | ✅ |

---

## 6. Non-Functional Requirements

| ID | Kategori | Requirement | Status |
| --- | --- | --- | --- |
| NFR-1 | Integritas data | Snapshot append-only; tidak ada jalur kode yang meng-`UPDATE`/`DELETE` `video_snapshots` | ✅ |
| NFR-2 | Integritas data | Seluruh kolom metrik `BigInt`; wajib diserialisasi sebelum melewati batas server→client | ✅ |
| NFR-3 | Integritas data | Hasil raw SQL divalidasi Zod (Postgres mengembalikan NUMERIC sebagai string) | ✅ |
| NFR-4 | Validasi | Seluruh input API divalidasi Zod; error 400 mengembalikan detail field | ✅ |
| NFR-5 | Konfigurasi | Env divalidasi Zod saat import; aplikasi gagal cepat, bukan gagal diam-diam | ✅ |
| NFR-6 | Keamanan | Secret (`CRON_SECRET`, `REFRESH_SECRET`, `NEXTAUTH_SECRET`) minimal 32 karakter | ✅ |
| NFR-7 | Keamanan | Upload dibatasi 5 MB | ✅ |
| NFR-8 | Reliabilitas | Cron `maxDuration = 60s`; retry 3x pada pemanggilan provider | ✅ |
| NFR-9 | Observabilitas | Logging terstruktur via Pino dengan tag modul; tidak ada `console.*` | ✅ |
| NFR-10 | Observabilitas | Sentry opsional — dilewati jika DSN kosong | ✅ |
| NFR-11 | Kesegaran data | Halaman dashboard `force-dynamic`, `revalidate = 0` | ✅ |
| NFR-12 | Skalabilitas | Rate limit refresh in-memory; **harus pindah ke Redis sebelum multi-instance** | 🚧 risiko diketahui |
| NFR-13 | Testing | Belum ada automated test | 📋 gap utama |
| NFR-14 | Lokalisasi | UI & komentar kode berbahasa Indonesia dengan istilah teknis Inggris | ✅ konvensi |

---

## 7. Data Model (ringkas)

Dua domain berbagi satu database Postgres.

**Analytics** — otomatis, time-series
- `Video` — metadata statis, unik per `tiktokId`
- `VideoSnapshot` — deret waktu, PK gabungan `(videoId, capturedAt)`, append-only
- `Recommendation` — payload insight ter-cache per `kind`
- `ScrapeJob` — log eksekusi cron
- `DailyMetric` — total level channel dari CSV, unik per tanggal

**Brand & Inhouse** — manual, workflow
- `Brief` → 1:1 opsional → `Campaign` → `CampaignVideo[]`
- `InhouseWeeklyReport` (unik `week + month + year`) → `InhouseVideo[]`
- `ChannelConfig` — satu baris, dipakai seluruh PDF
- `User` — akun internal + role

---

## 8. Success Metrics

| Metrik | Baseline (sebelum) | Target |
| --- | --- | --- |
| Waktu membuat proposal brand | ~2 jam (manual) | < 5 menit |
| Waktu membuat campaign report | ~3 jam (manual) | < 10 menit |
| Inquiry yang hilang / tak terbalas | tidak terukur | 0 — semua inquiry punya baris `Brief` |
| Cakupan histori metrik | 0 hari | ≥ 90 hari snapshot berkelanjutan |
| Tingkat keberhasilan cron | — | ≥ 95% run sukses per bulan |
| Video inhouse yang punya evaluasi tertulis | ~0% | 100% video yang tercatat |

---

## 9. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| TikTok mengubah/membatasi API pihak ketiga | Pipeline scrape mati | Abstraksi provider — fallback ke `csv` tanpa mengubah pipeline |
| Rate limit refresh in-memory | Rusak jika deploy multi-instance | Terdokumentasi; ganti Redis sebelum scaling (NFR-12) |
| Input metrik manual (campaign & inhouse) | Salah ketik masuk ke laporan klien | Validasi Zod; jangka panjang tarik dari pipeline (INH-12) |
| Tidak ada automated test | Regresi lolos ke produksi | Gap yang diakui — prioritas berikutnya (NFR-13) |
| Cache rekomendasi tidak dibaca | Query berat berjalan setiap page load | Perbaikan kecil, sudah teridentifikasi (REC-8) |
| Tidak ada audit log | Perubahan sensitif tak bisa dilacak | Direncanakan (AUTH-9) |

---

## 10. Roadmap

**Sudah rilis (v1)** — auth & RBAC, pipeline scrape, ranking & 4 rekomendasi, brief → campaign → PDF, inhouse weekly tracking + PDF, import CSV, config channel.

**Berikutnya (v1.1) — bayar utang teknis**
1. REC-8 — dashboard membaca cache `Recommendation`, bukan compute-on-demand
2. NFR-13 — test untuk ranking, parser CSV, dan transisi status brief
3. ANA-11 — halaman riwayat `ScrapeJob`
4. AUTH-8 — reset password oleh admin dari UI

**Kemudian (v1.2) — nilai baru**
5. REC-10 — grafik tren per video (mengekspos nilai time-series yang sudah dikumpulkan)
6. ANA-12 — alert kegagalan cron
7. CMP-4 — reminder deadline campaign
8. INH-12 — metrik inhouse otomatis dari pipeline

**Dipertimbangkan**
9. AUTH-9 audit log · REC-9 bobot ranking dari UI · PDF-6 upload logo brand · NFR-12 rate limit Redis

---

## 11. Open Questions

1. Apakah `REFRESH_SECRET` masih dipakai? Refresh sekarang diproteksi session — kandidat untuk dihapus dari skema env.
2. Pembagian 4 minggu tetap (INH-1) menggabungkan tanggal 29–31 ke minggu 4. Perlu minggu ke-5 untuk bulan panjang?
3. Apakah `DailyMetric` (level channel) perlu ditampilkan di dashboard? Saat ini diimpor tapi belum ada halaman yang membacanya.
4. Apakah VIEWER boleh mengunduh PDF? Saat ini generate PDF butuh ADMIN/EDITOR.
