# Remediation Guide: CI/CD & Database Isolation

Ikuti langkah-langkah di bawah ini untuk mengamankan data persisten produksi dan mencegah wipe berulang.

## 1. Neon Branching untuk Vercel Previews
Vercel memiliki integrasi resmi dengan Neon yang secara otomatis membuat database branch untuk setiap PR.
1. Di Dashboard Vercel, masuk ke **Settings > Integrations**.
2. Cari dan install **Neon**.
3. Hubungkan project Neon `vendinglink` Anda.
4. Neon akan secara otomatis mengatur agar environment **Preview** di Vercel mendapatkan `DATABASE_URL` dari branch Neon yang terisolasi, sementara environment **Production** tetap menggunakan branch `main`.

## 2. Pengaturan Environment Developer Lokal
Pastikan *README* atau *SETUP.md* diperbarui untuk mewajibkan developer menggunakan Postgres lokal, atau branch dev khusus.
```env
# .env lokal (Jangan gunakan URL Produksi!)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vendinglink_dev"
```

## 3. Workflow Migrasi Produksi
Mulai sekarang, ketika melakukan deployment schema baru ke produksi, **JANGAN PERNAH** menggunakan `npx prisma db push` atau `npx prisma migrate dev`.
Selalu gunakan perintah berikut di CI/CD atau saat deployment produksi:
```bash
npx prisma migrate deploy
```
Perintah ini **aman** dan tidak akan pernah mereset database, melainkan hanya menjalankan migrasi yang tertunda.
