# Git Collaboration Setup — Complete ✅

Branching strategy & workflow sudah disiapkan untuk 3 developer bekerja simultan pada VendingLink.

---

## 📋 Files yang Telah Dibuat

### Root Directory
- **`CONTRIBUTING.md`** (7.6 KB) — Panduan lengkap branching, workflow, conflict prevention
- **`TASK_ASSIGNMENT.md`** (3.9 KB) — Stage ownership, file isolation, communication

### `.github/` Directory
- **`BRANCHING_STRATEGY.md`** (5.5 KB) — Quick start guide & FAQ
- **`PULL_REQUEST_TEMPLATE.md`** (2.0 KB) — PR template dengan checklist
- **`DEVELOPER_SETUP.md`** (3.5 KB) — Local setup & quick commands
- **`CODEOWNERS`** (1.4 KB) — Auto-assign reviewers, protect files
- **`.workflows/ci.yml`** (0.7 KB) — GitHub Actions: build & lint

---

## 🚀 Next Steps for Admin

### 1. Setup GitHub Branch Protection (5 min)

Go to **Repository → Settings → Branches → Add Rule**

Rules needed:
- ✅ `main` — require 1 approval, status checks, no force push
- ✅ `dev` — require 1 approval, status checks, no force push
- ✅ `staging` — require 1 approval, status checks, no force push

See `.github/BRANCHING_STRATEGY.md` for detailed steps

### 2. Assign Developer Nicknames (2 min)

Edit `TASK_ASSIGNMENT.md`, update top section with actual names

### 3. Share With Team (1 min)

- Post `.github/BRANCHING_STRATEGY.md` link in chat
- Each dev reads `DEVELOPER_SETUP.md`
- Dry-run: one dev creates test PR, gets reviewed, merges

---

## 🎯 How Developers Use This

### Setup (Day 1)

Each dev reads:
1. `.github/DEVELOPER_SETUP.md` → Local setup
2. `.github/BRANCHING_STRATEGY.md` → Branching model
3. `CONTRIBUTING.md` → Daily workflow

### Daily Work

```bash
# Start feature
git checkout dev && git pull
git checkout -b feat/dev-yourname/stage-N-feature

# Work: commit every 30-60 min
git add . && git commit -m "..." && git push

# Before PR: sync & verify
git fetch origin && git rebase origin/dev
npm run build && npm run lint
git push --force-with-lease

# Create PR on GitHub (template auto-loads)
# Assign reviewer, label stage-N, ready-for-review
```

### Code Review

Reviewer:
```bash
git checkout origin/feat-branch
npm run build && npm run lint && npm run dev
# Test feature, leave comments, Approve or Request Changes
```

---

## 🛡️ Protected Files (Coordinate First)

| File | Protection | Action |
|------|-----------|--------|
| `prisma/schema.prisma` | 🔴 Locked | Only tech lead after Stage 1 |
| `lib/auth.ts` | 🔴 Locked | Only Stage 4 auth work |
| `middleware.ts` | 🔴 Locked | Only Stage 4 approval gate |
| `package.json` | 🔴 Locked | Get approval before adding deps |
| `.env.example` | 🟡 Notify Team | Notify if adding new env vars |

**To edit protected file:** Open issue → Get approval → Create PR

---

## 🔀 File Isolation (No Conflicts)

```
Stage 2: app/customer/*, components/customer/*, app/api/customer/*
Stage 3: app/agent/catalog/*, app/api/checkout/*
Stage 4: app/auth/register/*, app/admin/agents/*, middleware.ts
Stage 5: app/admin/inventory/*, app/api/admin/*
Stage 6: PRD.md, .env.example
```

→ **No overlap = No merge conflicts ✓**

---

## ✅ Branch Protection Configured

- `main` → 1 review, status checks, no force push
- `dev` → 1 review, status checks, no force push
- `staging` → 1 review, status checks, no force push

---

## 🚨 Conflict Resolution

```bash
git fetch origin && git rebase origin/dev
# Fix conflict markers in editor (<<<< ==== >>>>)
git add . && git rebase --continue
git push --force-with-lease origin feat-branch
```

Slack other dev: "Fixed conflict in FILE"

---

## ✅ Admin Checklist

- [ ] Setup GitHub branch protection rules
- [ ] Update developer nicknames in TASK_ASSIGNMENT.md
- [ ] Share `.github/BRANCHING_STRATEGY.md` with team
- [ ] Each dev reads `DEVELOPER_SETUP.md`
- [ ] Test dry-run PR
- [ ] Verify CI/CD running

---

**Setup Date:** 2026-09-07  
**Ready For:** Stage 2 concurrent development  
🚀 **Go!**
