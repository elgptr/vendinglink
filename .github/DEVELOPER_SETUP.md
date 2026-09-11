# GitHub Developer Setup Guide

Panduan setup lokal untuk 3 developer yang bekerja **bersamaan** di VendingLink. 

Dua model:
- **Track A/B/C** (paralel): foundational features
- **Phase 1-5** (sequential): roadmap initiatives

Lihat `TASK_ASSIGNMENT.md` untuk tahu track/phase mana yang jadi tugasmu.

---

## 1. Prerequisites

- **Node.js** v20+
- **Git** latest
- **VS Code** + extensions: ESLint, Prettier, Prisma
- **Chromium/Chrome** (for Playwright E2E, installed via npm)

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
npx prisma db push        # Sync ke production Neon DB - hati-hati, koordinasi dulu jika ada perubahan schema
npx prisma db seed        # Load data test (admin, agent01, produk)
```

### 2.4 Test Setup (Phase 1+)

After Phase 1 is launched, install test tools:

```bash
# Vitest + React Testing Library already in package.json (Phase 1 PR adds)
# Playwright E2E browser setup
npx playwright install    # Install Chrome for E2E tests

# Verify all test tooling
npm run test              # Run unit + integration tests (Vitest)
npm run test:e2e          # Run E2E tests (Playwright) - if Phase 1 done
```

### 2.5 Verify Setup

```bash
npm run build && npm run lint && npm run dev
# Buka http://localhost:3000
```

---

## 3. Daily Workflow

### 3.1 Mulai Kerja

**For Track A/B/C work:**
```bash
git checkout main && git pull origin main
git checkout -b feat/dev-yourname/track-x-feature-name
```

**For Phase 1-5 work:**
```bash
git checkout main && git pull origin main
# Ensure previous phases are merged!
git checkout -b feat/dev-yourname/phase-N-feature-description
```

Ganti dengan track/phase kamu - lihat `TASK_ASSIGNMENT.md`.

### 3.2 Selama Kerja

- Push setiap 30-60 menit: `git add . && git commit -m "..." && git push`
- Build check sebelum push: `npm run build && npm run lint`
- **After Phase 1 launch:** also run `npm test` before push

### 3.3 Sebelum PR

```bash
git fetch origin && git rebase origin/main
npm run build && npm run lint

# After Phase 1 launch, also test:
npm test
npm run test:e2e           # if you modified E2E tests

git push --force-with-lease origin feat/dev-yourname/track-x-or-phase-N-feature
```

### 3.4 Buat PR

1. GitHub - **Pull Request** - **New**
2. Base: `main`
3. Pakai template dari `.github/PULL_REQUEST_TEMPLATE.md`
4. Assign reviewer
5. Label: `track-a`/`track-b`/`track-c` OR `phase-1`/`phase-2`/etc., plus `ready-for-review`
6. **Merge segera setelah approved** - untuk Track work, tidak perlu tunggu PR track lain; untuk Phase work, coordinate phase dependencies

---

## 4. Database Safety

WARNING: **PENTING:** `.env`/`.env.local` mengarah ke **production Neon DB**

- Perubahan schema harus lewat PR review dulu
- **Jangan** run `npx prisma db push` tanpa koordinasi tim
- Kalau butuh test schema lokal, setup PostgreSQL lokal atau tanya tech lead
- Phase 4 akan optimize DB - coordinate dengan tech lead saat itu

---

## 5. Conflict Prevention & File Ownership

Sebelum edit, cek:
- [ ] File itu masuk track/phase siapa? (lihat `TASK_ASSIGNMENT.md`)
- [ ] Termasuk protected files untuk phase ini?
- [ ] Kalau iya -> buka GitHub Issue dulu, jangan langsung edit

Kalau conflict terjadi:
- Salah satu dev rebase & resolve
- Keduanya run `npm run build && npm run lint npm test` setelah merge (after Phase 1 launch)
- Komunikasi via issue/chat

**Phase-specific file ownership:**
- Phase 1: protected files are core routes + schema (test coverage only)
- Phase 2: middleware refactor (coordinate with Jiwo)
- Phase 3 & 4: separate track phases, minimal overlap
- Phase 5: schema + checkout routes (post-Phase 4, post-Phase 3)

See `TASK_ASSIGNMENT.md` protected files table for full details.

---

## 6. Quick Commands

```bash
git status                                    # Cek status
git branch -a                                 # Lihat semua branch
git reset --soft HEAD~1                       # Undo commit terakhir (keep changes)
npm run build && npm run lint                 # Verify sebelum push
npm test                                      # Run all unit + integration tests (Phase 1+)
npm run test:e2e                              # Run E2E only (Phase 1+, Playwright)
npx prisma generate                           # Regenerate Prisma Client
npx playwright install                        # Install E2E browsers (Phase 1+)
```

---

## 7. PR Review (untuk Reviewer)

1. `git fetch origin && git checkout origin/feat-branch-name`
2. `npm run build && npm run lint`
3. `npm test` (after Phase 1 launch)
4. `npm run dev` & test fitur secara manual
5. Review logic, types, error handling, query DB
6. For Phase PRs: confirm file ownership matches TASK_ASSIGNMENT.md
7. Approve atau Request Changes di GitHub

---

## 8. Deploy ke Production

- PR ke `main`, >= 1 approval, Squash Merge
- GitHub Actions jalankan CI (`build`, `lint`, `test` after Phase 1)
- Auto-deploy via Vercel setelah merge ke `main`

---

**Last Updated:** 2026-09-11 | **Version:** 3.0 | **Model:** Track paralel + Phase sequential
