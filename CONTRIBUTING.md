# Panduan Kolaborasi Git — VendingLink

Dokumen ini menetapkan branching strategy, workflow PR, dan aturan isolasi task untuk mencegah konflik antar developer.

---

## 1. Branching Model

### 1.1 Branch Utama

| Branch | Tujuan | Siapa | Merge Rule |
|--------|--------|-------|-----------|
| `main` | **Production Release** — digunakan untuk deploy ke production. Setiap commit adalah rilis stabil. | — | Hanya via PR dengan ≥1 approval + passing CI/CD |
| `staging` | **Integration & QA** — tempat testing feature bersama sebelum main. Lebih stabil dari dev. | — | Hanya via PR dengan ≥1 approval + passing CI |
| `dev` | **Development** — branch integrasi utama. Sering diupdate, bisa unstable. | Semua | Hanya via PR dengan ≥1 approval dari team member lain |

### 1.2 Feature Branch (Temporary)

Setiap developer membuat feature branch dari `dev` dengan konvensi penamaan:

```
feat/<nama-dev>/<deskripsi-singkat>
```

**Contoh:**
- `feat/dev-kiro/stage2-customer-flow` — Stage 2 Public Customer B2C flow
- `feat/dev-alice/stage3-agent-checkout` — Stage 3 Agent Credit/Debt Checkout
- `feat/dev-bob/stage4-admin-approval` — Stage 4 Agent Approval Workflow

**Aturan:**
- Deskripsi singkat, lowercase, dash-separated (no space)
- Selalu branch dari `dev`, bukan `main` atau `staging`
- Satu developer = satu feature branch (hindari shared feature branch)
- Delete branch setelah merge ke `dev`

### 1.3 Hotfix Branch (Emergency)

Jika ada bug urgent di production:

```
hotfix/<nama-dev>/<deskripsi-singkat>
```

**Aturan:**
- Branch dari `main`, bukan `dev`
- Merge kembali ke `main` (via PR) dan rebase ke `dev`
- Contoh: `hotfix/dev-kiro/fix-payment-webhook`

---

## 2. Workflow Harian

### 2.1 Mulai Fitur Baru

```bash
# Update dev branch
git checkout dev
git pull origin dev

# Buat feature branch
git checkout -b feat/dev-yourname/feature-name

# Push ke remote (setup tracking)
git push -u origin feat/dev-yourname/feature-name
```

### 2.2 Commit & Push

- **Commit message:** Gunakan present tense, singkat tapi jelas
  ```
  Add nullable agentId to Transaction model
  Update nullable agent handling in reports query
  Fix type errors from schema change
  ```
- **Frequency:** Push setiap 30-60 menit kerja (jangan nunggu selesai)
- **Rebase sebelum PR:** 
  ```bash
  git fetch origin
  git rebase origin/dev
  git push --force-with-lease origin feat/dev-yourname/feature-name
  ```

### 2.3 Buat Pull Request

1. Push feature branch ke GitHub
2. Buka GitHub → **Pull Request** → **New PR**
3. Base branch: `dev` (atau `main` jika hotfix)
4. Gunakan **PR Template** (lihat `.github/PULL_REQUEST_TEMPLATE.md`)
5. Assign reviewer (dev lain di team)
6. Label: `stage-N`, `in-progress`, `ready-for-review`

### 2.4 Review & Merge

- **Reviewer** harus:
  - ✅ Check code quality, logic, dan naming conventions
  - ✅ Run build & test lokal sebelum approve
  - ✅ Approve jika semua checks pass
  
- **Jika ada conflict:** 
  ```bash
  git fetch origin
  git rebase origin/dev
  # Resolve conflicts in editor
  git add .
  git rebase --continue
  git push --force-with-lease origin feat/dev-yourname/feature-name
  ```

- **Merge strategy:** **Squash and Merge** (1 clean commit per feature)
  - GitHub Setting: Pull Request → Squash and Merge as default



---

## 3. Conflict Prevention — Task Isolation

### 3.1 Modul Pembagian (Stages 2–6)

Setiap stage fokus pada modul terpisah untuk meminimalkan tabrakan file:

#### Stage 2: Public Customer Flow (B2C)
- **Files:** `app/customer/`, `components/customer/`, `app/api/customer/`
- **Shared:** `lib/midtrans.ts` (only `createSnapTransaction()` function)

#### Stage 3: Agent Checkout → Credit/Debt
- **Files:** `app/agent/catalog/[productId]/checkout/page.tsx`, `app/api/checkout/route.ts`, `components/agent/`
- **Note:** Split from Stage 2 checkout logic by `paymentType`

#### Stage 4: Agent Approval & Admin Workflow
- **Files:** `app/auth/register/`, `app/api/auth/register/`, `app/admin/agents/`, `app/api/admin/agents/`, `middleware.ts`

#### Stage 5: Debt Settlement & Guide Images
- **Files:** `app/admin/agents/` (settlement UI), `app/admin/inventory/` (guide image upload), `app/api/admin/`

#### Stage 6: Docs & Copy Sync
- **Files:** `PRD.md`, `.env.example`, UI copy (coordinate in PR)

### 3.2 ⚠️ Protected Files (Coordinate Before Edit)

- `prisma/schema.prisma` — Stage 1 locked (next change: notify team)
- `lib/auth.ts` — Only Stage 4 logic overhaul
- `middleware.ts` — Only new permission/role gates
- `.env.example` — Notify team if env var added
- `package.json` — **No new deps without tech lead approval**

### 3.3 Dependency Management

- ✅ Upgrade existing package: OK
- ❌ Add new dependency: Create issue, wait approval
- Process: Issue → Approve → Add → Test → PR

---

## 4. GitHub Branch Protection Rules

### 4.1 Setup untuk `main` Branch

Go to **Settings → Branches → Branch Protection Rules**

**Pattern:** `main`

**Configure:**
- ✅ Require pull request reviews: Min **1** reviewer
- ✅ Dismiss stale pull request approvals
- ✅ Require status checks: `build`, `lint`
- ✅ Require up to date before merge
- ✅ Restrict who can push: Admins only
- ❌ Allow force pushes
- ❌ Allow deletions

### 4.2 Setup untuk `dev` Branch

**Pattern:** `dev`
- ✅ Min **1** reviewer
- ✅ Status checks: `build`, `lint`
- ✅ Require up to date
- ✅ Restrict push: Admins only
- ❌ No force push, no deletions

### 4.3 Setup untuk `staging` Branch

**Pattern:** `staging`
- ✅ Min **1** reviewer
- ✅ Status checks, up to date, push restricted
- ❌ No force push, no deletions

---

## 5. Common Scenarios

### 5.1 "Perlu update file di stage orang lain"

- Create issue: "@dev-alice Perlu update X di stage-mu?"
- Wait for coordination
- Or: branch dari feature branch mereka, merge back via PR

### 5.2 "Ada conflict di staging"

```bash
git checkout staging && git pull origin staging
git merge --no-ff origin/dev
# Resolve conflicts
git add . && git commit -m "Merge dev → staging: conflicts resolved"
git push origin staging
```

### 5.3 "Accidentally pushed kesalahan"

- Belum PR: `git reset HEAD~1 && git push --force-with-lease`
- Sudah PR: Push fix commit, rebase sebelum merge
- Sudah merge: Coordinate untuk revert atau hotfix

---

## 6. Code Review Checklist

✅ Type safety (no `any`)  
✅ Error handling (try-catch, null checks)  
✅ Database queries (no N+1, proper includes)  
✅ Naming conventions (camelCase, SNAKE_CASE)  
✅ No console.log, debug code  
✅ Build & lint pass: `npm run build && npm run lint`  
✅ `.env.example` updated if new vars  
✅ PR description: what/why/how tested  

---

## 7. Quick Reference

```bash
# 1. Clone repo
git clone https://github.com/yourorg/antigrav.git && cd antigrav

# 2. Create feature branch
git checkout -b feat/dev-yourname/stage-X-feature

# 3. Daily work: commit & push
git add . && git commit -m "Descriptive message" && git push

# 4. Before PR: sync with dev
git fetch origin && git rebase origin/dev && git push --force-with-lease

# 5. Create PR on GitHub (use template)

# 6. After approve & merge: cleanup
git checkout dev && git pull origin dev
git branch -D feat/dev-yourname/stage-X-feature
git push origin --delete feat/dev-yourname/stage-X-feature
```

---

**Last Updated:** 2026-09-07 | **Version:** 1.0
