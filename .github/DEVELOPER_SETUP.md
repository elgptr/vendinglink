# GitHub Developer Setup Guide

Panduan setup lokal untuk 3 developer yang bekerja simultan di project VendingLink.

---

## 1. Prerequisites

- **Node.js** v20+ ([download](https://nodejs.org/))
- **Git** latest ([download](https://git-scm.com/))
- **GitHub CLI** (optional but recommended)
- **VS Code** + extensions: ESLint, Prettier, Prisma

---

## 2. Initial Setup

### 2.1 Clone & Install

```bash
git clone https://github.com/your-org/antigrav.git && cd antigrav
npm install
```

### 2.2 Setup Environment

```bash
cp .env.example .env.local
# Edit .env.local with your credentials

---

## 4. Database Safety

⚠️ **WARNING:** `.env` points to **production Neon DB**

- Schema changes go via PR review before push
- **Never** run `npx prisma db push` without team sync
- Tech lead only handles production DB changes
- Test locally? Setup local PostgreSQL or ask tech lead

---

## 5. Conflict Prevention

Before editing, check:
- [ ] Which stage? Who else working on those files?
- [ ] Protected files? (prisma/schema.prisma, middleware.ts, package.json)
- [ ] If yes → Coordinate via GitHub Issue

If conflict occurs:
- One dev rebases & resolves
- Both run `npm run build && npm run lint` after merge
- Communicate in issue/slack

---

## 6. Quick Commands

```bash
git status                                    # Check status
git branch -a                                 # View all branches
git reset --soft HEAD~1                       # Undo last commit (keep changes)
git checkout -- .                             # Discard all local changes (⚠️)
npm run build && npm run lint                 # Verify before push
npx prisma generate                           # Regenerate Prisma Client
```

---

## 7. PR Review (for Reviewer)

1. Checkout PR branch: `git fetch origin && git checkout origin/feat-branch-name`
2. Test locally: `npm run build && npm run lint && npm run dev`
3. Test feature manually (e.g., checkout flow, payment)
4. Review code: logic, types, error handling, SQL queries
5. Approve or request changes in GitHub UI

---

## 8. Staging → Production

**To Staging (QA):**
- PR: `dev` → `staging`
- Merge & test

**To Production:**
- PR: `staging` → `main`
- Require ≥1 approval
- Merge via Squash
- Auto-deploy via GitHub Actions

---

**Last Updated:** 2026-09-07

# DATABASE_URL, NEXTAUTH_SECRET, MIDTRANS keys, etc.
```

### 2.3 Database

```bash
npx prisma generate
npx prisma db push              # Sync to production Neon DB (if allowed)
npx prisma seed                 # Load test data
```

### 2.4 Verify

```bash
npm run build && npm run lint && npm run dev
# Visit http://localhost:3000
```

---

## 3. Daily Workflow

### 3.1 Start of Day

```bash
git checkout dev && git pull origin dev
git checkout -b feat/dev-yourname/stage-N-feature
```

### 3.2 During Work

- Push every 30-60 min: `git add . && git commit -m "..." && git push`
- Build check before push: `npm run build && npm run lint`

### 3.3 Before PR

```bash
git fetch origin && git rebase origin/dev
npm run build && npm run lint
git push --force-with-lease origin feat/dev-yourname/stage-N-feature
```

### 3.4 Create PR

1. GitHub → **Pull Request** → **New**
2. Base: `dev` (or `main` if hotfix)
3. Use template from `.github/PULL_REQUEST_TEMPLATE.md`
4. Assign reviewer, label: `stage-N`, `ready-for-review`

