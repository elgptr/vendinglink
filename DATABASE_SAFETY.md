# Database Safety & CI/CD Migration Workflow

Panduan wajib untuk menjaga keutuhan data produksi dan mencegah database ter-reset/terhapus (*wipe*).

---

## 1. Golden Rule: Perintah Migrasi

| Environment | Perintah yang Digunakan | Penjelasan |
|---|---|---|
| **Lokal Dev** | `npx prisma migrate dev` | Aman untuk membuat file migration baru saat ada perubahan `schema.prisma`. |
| **Produksi / CI / Vercel** | `npx prisma migrate deploy` (atau `npm run db:deploy`) | **HANYA** menjalankan file migration tertunda tanpa pernah mereset database. |

> [!CAUTION]
> **DILARANG KERAS** menjalankan `npx prisma db push` atau `npx prisma migrate reset` di database produksi. Perintah ini dapat menghapus seluruh tabel dan data pengguna.

---

## 2. Environment Developer Lokal

Developer **TIDAK BOLEH** menghubungkan koneksi lokal langsung ke database produksi main.

Gunakan PostgreSQL lokal atau branch dev khusus di `.env.local`:
```env
# .env.local (Gunakan Postgres lokal atau branch dev khusus!)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vendinglink_dev"
```

---

## 3. Neon Branching di Vercel Previews

Untuk isolasi otomatis antara Preview PR dan Production:
1. Buka dashboard Vercel: **Settings > Integrations**.
2. Cari dan pasang **Neon**.
3. Hubungkan project Neon `vendinglink`.
4. Vercel & Neon akan otomatis membuat ephemeral branch database untuk setiap pull request/preview, sehingga branch `main` (produksi) tetap 100% aman dan terisolasi.
