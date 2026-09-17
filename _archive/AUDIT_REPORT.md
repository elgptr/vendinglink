# 🏗️ Technical Audit Report & Root Cause Analysis

## 🚨 Final Verdict: The "Local-to-Prod Wipe" via Shared Database

Berdasarkan screenshot dari Vercel Dashboard, **Vercel tidak menjalankan command destruktif** (Build Command hanya berisi `prisma generate && next build`). Oleh karena itu, *database wipe* **bukan** disebabkan oleh *Vercel deployment hook* atau *GitHub Action*.

Akar masalahnya sepenuhnya berasal dari **Environment Leakage (Shared Database)** ditambah alur kerja **Prisma Schema Sync** lokal.

### 🔍 Bagaimana Wipe Terjadi (Kronologi Persisnya):
1. **Shared Database:** Semua *developer* (lokal), *Vercel Preview* (PR), dan *Produksi* menggunakan `DATABASE_URL` yang sama (Neon Cloud atau database live).
2. **Local Schema Sync:** Saat ada PR baru atau *push*, *developer* biasanya memodifikasi `schema.prisma` di laptop mereka. Untuk menyinkronkan database dengan schema terbaru, mereka menjalankan `npx prisma db push` atau `npx prisma migrate dev` secara lokal.
3. **Drift Detection & Reset:** Prisma mendeteksi bahwa schema di *shared database live* berbeda dengan *migration history* atau schema lokal (karena developer lain mungkin juga melakukan hal yang sama). Prisma kemudian akan meminta izin untuk melakukan **Reset (Drop all tables)**.
4. **Accidental Wipe:** Developer menekan `y` tanpa sadar bahwa `DATABASE_URL` di `.env` lokal mereka terhubung langsung ke **Database Produksi**. Seluruh tabel di-*drop*, data terhapus.
5. **Auto-Seeding:** Setelah *reset*, Prisma secara otomatis menjalankan `db:seed` (`tsx prisma/seed.ts`). Script seed ini melakukan *upsert* akun admin dan `agent01` dengan *password default* (development hash), yang menyebabkan *user accounts* dan *passwords* asli produksi menghilang dan kembali ke *seed state*.

---

## 🛠️ Remediation Strategy (Strategi Perbaikan)

Untuk memperbaiki masalah ini secara permanen tanpa mengganggu alur pengembangan:

### 1. Database Isolation (Isolasi Lingkungan) - **KRITIKAL**
- **Lokal:** Semua *developer* WAJIB menggunakan database lokal (misal: Docker Postgres `localhost:5432`) di `.env` mereka, BUKAN database produksi.
- **Preview (PR):** Manfaatkan fitur **Neon Branching**. Setiap kali PR dibuat, buat *branch database* baru di Neon, lalu setel `DATABASE_URL` di Vercel Preview (melalui *Environment Variables* Vercel) ke branch Neon tersebut.
- **Produksi:** Hanya Vercel Production yang boleh memiliki `DATABASE_URL` live.

### 2. Pengamanan Script Seed & Package.json
- Tambahkan *guard* yang ketat di `prisma/seed.ts` (menggunakan `VERCEL_ENV`) agar seed tidak pernah berjalan tanpa disengaja di lingkungan Preview atau Produksi.
- Modifikasi `package.json` scripts dengan menambahkan peringatan keamanan untuk command destruktif (`db:push` dan `db:migrate`).

### 3. CI/CD & Deploy Workflow
- Gunakan `npx prisma migrate deploy` secara eksklusif untuk menerapkan perubahan schema ke database Produksi. Command ini hanya menjalankan migrasi yang belum di-*apply* tanpa berisiko me-reset database.

---
*Laporan ini disimpan di folder `_archive/` sesuai dengan instruksi audit.*
