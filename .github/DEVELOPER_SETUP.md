# GitHub Developer Setup Guide

Panduan setup lokal untuk 3 developer yang bekerja **bersamaan** (model Track paralel) di project VendingLink. Lihat `TASK_ASSIGNMENT.md` untuk tahu track mana yang jadi tugasmu.

---

## 1. Prerequisites

- **Node.js** v20+
- **Git** latest
- **VS Code** + extensions: ESLint, Prettier, Prisma

---

## 2. Initial Setup

### 2.1 Clone & Install

```bash
git clone https://github.com/elgptr/vendinglink.git && cd vendinglink
npm install
```

### 2.2 Setup Environment

```bash
cp .env.example .env.local
# Edit .env.local: DATABASE_URL, NEXTAUTH_SECRET, MIDTRANS keys, dll
```

### 2.3 Database

```bash
npx prisma generate
npx prisma db push        # Sync ke production Neon DB — hati-hati, koordinasi dulu jika ada perubahan schema
npx prisma db seed        # Load data test (admin, agent01, produk)
```

### 2.4 Verify

```bash
npm run build && npm run lint && npm run dev
# Buka http://localhost:3000
```

---

## 3. Daily Workflow

### 3.1 Mulai Kerja

```bash
git checkout main && git pull origin main
git checkout -b feat/dev-yourname/track-x-feature-name
```

Ganti `track-x` dengan track kamu (`track-a`, `track-b`, atau `track-c`) — lihat `TASK_ASSIGNMENT.md`.

### 3.2 Selama Kerja

- Push setiap 30-60 menit: `git add . && git commit -m "..." && git push`
- Build check sebelum push: `npm run build && npm run lint`

### 3.3 Sebelum PR

```bash
git fetch origin && git rebase origin/main
npm run build && npm run lint
git push --force-with-lease origin feat/dev-yourname/track-x-feature-name
```

### 3.4 Buat PR

1. GitHub → **Pull Request** → **New**
2. Base: `main`
3. Pakai template dari `.github/PULL_REQUEST_TEMPLATE.md`
4. Assign reviewer, label: `track-a`/`track-b`/`track-c`, `ready-for-review`
5. **Merge segera setelah approved** — tidak perlu tunggu PR track lain juga siap

---

## 4. Database Safety

⚠️ **PENTING:** `.env`/`.env.local` mengarah ke **production Neon DB**

- Perubahan schema harus lewat PR review dulu
- **Jangan** run `npx prisma db push` tanpa koordinasi tim
- Kalau butuh test schema lokal, setup PostgreSQL lokal atau tanya tech lead

---

## 5. Conflict Prevention

Sebelum edit, cek:
- [ ] File itu masuk track siapa? (lihat `TASK_ASSIGNMENT.md`)
- [ ] Termasuk protected files? (`prisma/schema.prisma`, `package.json`)
- [ ] Kalau iya → buka GitHub Issue dulu, jangan langsung edit

Kalau conflict terjadi (jarang, karena tiap track punya file terpisah):
- Salah satu dev rebase & resolve
- Keduanya run `npm run build && npm run lint` setelah merge
- Komunikasi via issue/chat

---

## 6. Quick Commands

```bash
git status                                    # Cek status
git branch -a                                 # Lihat semua branch
git reset --soft HEAD~1                       # Undo commit terakhir (keep changes)
npm run build && npm run lint                 # Verify sebelum push
npx prisma generate                           # Regenerate Prisma Client
```

---

## 7. PR Review (untuk Reviewer)

1. `git fetch origin && git checkout origin/feat-branch-name`
2. `npm run build && npm run lint && npm run dev`
3. Test fitur secara manual
4. Review logic, types, error handling, query DB
5. Approve atau Request Changes di GitHub

---

## 8. Deploy ke Production

- PR ke `main`, ≥1 approval, Squash Merge
- GitHub Actions jalankan CI (`build`, `lint`)
- Auto-deploy via Vercel setelah merge ke `main`

---

**Last Updated:** 2026-09-07 | **Model:** Track paralel, single branch `main`
