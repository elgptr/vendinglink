# 🚀 Branching Strategy & Collaboration — VendingLink

Panduan lengkap untuk setup kolaborasi 3 developer simultan tanpa konflik.

---

## 📦 Files yang Telah Dibuat

| File | Purpose |
|------|---------|
| `CONTRIBUTING.md` | Workflow harian, branching model, conflict prevention |
| `TASK_ASSIGNMENT.md` | Stage ownership, file isolation, communication |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR template auto-loaded saat buat PR |
| `.github/DEVELOPER_SETUP.md` | Setup lokal & quick reference |
| `.github/CODEOWNERS` | Auto-assign reviewers & protect files |
| `.github/workflows/ci.yml` | GitHub Actions: build & lint checks |

---

## 🔧 Setup GitHub Branch Protection (Admin Only)

Go to **Repository → Settings → Branches → Add rule**

### Protect `main` Branch

**Pattern:** `main`

Configure:
- ✅ Require pull request reviews: Min `1`
- ✅ Dismiss stale pull request approvals
- ✅ Require status checks: `build`, `lint`
- ✅ Require up to date before merge
- ✅ Restrict push: Admins only
- ❌ No force pushes, no deletions

### Protect `dev` Branch

**Pattern:** `dev` (same as main)

### Protect `staging` Branch

**Pattern:** `staging` (same as dev)

---

## 👥 Team Setup

Edit `TASK_ASSIGNMENT.md`, update nicknames:

```markdown
| Developer | Nickname | Role |
|-----------|----------|------|
| [Your Name] | dev-kiro | Lead / Stage 2 |
| [Name 2] | dev-alice | Stage 3–4 |
| [Name 3] | dev-bob | Stage 5–6 |
```

---

## 🎯 How 3 Developers Work Simultaneously

**Key:** Each stage works on **separate directories**

```
Stage 2 (Dev A):   app/customer/, components/customer/, app/api/customer/
Stage 3 (Dev B):   app/agent/catalog/, app/api/checkout/
Stage 4 (Dev B):   app/auth/register/, app/admin/agents/
Stage 5 (Dev C):   app/admin/inventory/, app/api/admin/products/
Stage 6 (Dev C):   PRD.md, .env.example
```

**No overlap = No conflicts ✓**

---

## 📋 Daily Workflow

### 1. Start Feature

```bash
git checkout dev && git pull origin dev
git checkout -b feat/dev-yourname/stage-N-feature
```

### 2. During Work: Commit Every Hour

```bash
git add . && git commit -m "Add feature X"
git push origin feat/dev-yourname/stage-N-feature
```

### 3. Before PR: Sync & Verify

```bash
git fetch origin && git rebase origin/dev
npm run build && npm run lint
git push --force-with-lease origin feat/dev-yourname/stage-N-feature
```

### 4. Create PR on GitHub

- Base: `dev` | Compare: `feat/dev-yourname/...`
- Use PR template (auto-loaded)
- Fill: What changed, Why, Testing notes
- Assign reviewer (another dev)
- Label: `stage-N`, `ready-for-review`

### 5. Code Review

Reviewer:
```bash
git checkout origin/feat-branch-name
npm run build && npm run lint && npm run dev
# Test feature manually
# Leave GitHub review comments
```

**Approve or Request Changes**

### 6. Merge After Approval

Author:
- Click **Squash and Merge**
- Delete branch

Cleanup:
```bash
git checkout dev && git pull origin dev
git branch -D feat/dev-yourname/stage-N-feature
git push origin --delete feat/dev-yourname/stage-N-feature
```

---

## ⚠️ Protected Files — Coordinate First

| File | Who | When |
|------|-----|------|
| `prisma/schema.prisma` | Tech Lead | After Stage 1 (already done) |
| `lib/auth.ts` | Tech Lead | Only Stage 4 |
| `middleware.ts` | Tech Lead | Only Stage 4 |
| `package.json` | Tech Lead | Never without approval |

**Process:**
1. Open GitHub Issue: "Need to update FILE for Stage N"
2. Get approval
3. Create PR with issue link

---

## 🚨 Conflict Resolution

**If GitHub shows "can't merge" conflict:**

```bash
git fetch origin && git rebase origin/dev
# Resolve conflicts (<<<< ==== >>>> markers)
git add . && git rebase --continue
git push --force-with-lease origin feat-branch-name
```

Then Slack other dev: "Resolved conflict in FILE"

---

## ✅ Checks Before Pushing

- ✅ `npm run build` — passes
- ✅ `npm run lint` — passes
- ✅ No `console.log` left in code
- ✅ `.env.example` updated if new env var
- ✅ TypeScript types correct (no `any`)

---

## 💡 Tips to Avoid Conflicts

1. **Commit frequently:** Every 30-60 min
2. **Small PRs:** < 400 lines per PR
3. **Isolated files:** Each stage, different directories
4. **Communicate:** Ask before editing protected files
5. **Test locally:** `npm run build && npm run lint`
6. **Rebase often:** Keep `dev` sync

---

## 📚 Quick Reference Docs

- **CONTRIBUTING.md** → Detailed branching, rules, scenarios
- **TASK_ASSIGNMENT.md** → Stage ownership, file mapping
- **DEVELOPER_SETUP.md** → Setup local environment
- **PR Template** → Auto-loaded when creating PR

---

## ❓ FAQ

**Q: Can I work on 2 features at once?**  
A: No. One feature per branch per dev.

**Q: What if my feature takes 2 weeks?**  
A: Push daily commits. Create "Draft PR" in GitHub until ready.

**Q: Can I force push to `dev`?**  
A: NO. Branch protection blocks it.

**Q: How do I know if someone is working on my file?**  
A: Check GitHub Issues (labeled `in-progress`) and TASK_ASSIGNMENT.md.

**Q: What if I accidentally pushed bad code?**  
A: If not merged: push fix commit. If merged: coordinate rollback.

---

**Last Updated:** 2026-09-07  
**Ready For:** Concurrent development starting Stage 2
