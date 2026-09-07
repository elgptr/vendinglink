# Panduan Kolaborasi Git — VendingLink

Dokumen ini menetapkan branching strategy, workflow PR, dan aturan isolasi task untuk mencegah konflik antar developer — dan agar **3 developer bisa kerja bersamaan tanpa saling menunggu**.

---

## 1. Branching Model

### 1.1 Branch Utama

Project ini pakai **satu branch stabil**: `main`. Tidak ada tier `dev`/`staging` terpisah — supaya tidak ada antrian integrasi yang membuat satu track menunggu track lain selesai lebih dulu.

| Branch | Tujuan | Merge Rule |
|--------|--------|-----------|
| `main` | Production — semua PR yang lolos review & CI langsung masuk sini | Hanya via PR dengan ≥1 approval + passing CI/CD |

### 1.2 Feature Branch (Temporary)

Setiap developer membuat feature branch dari `main` dengan konvensi penamaan:

```
feat/<nama-dev>/<deskripsi-singkat>
```

**Contoh (lihat `TASK_ASSIGNMENT.md` untuk pembagian track):**
- `feat/dev-elang/track-a-agent-checkout-ux`
- `feat/dev-jiwo/track-b-agent-approval`
- `feat/dev-iqbal/track-c-guide-image`

**Aturan:**
- Deskripsi singkat, lowercase, dash-separated (no space)
- Selalu branch dari `main`
- Satu developer = satu feature branch aktif per track
- Delete branch setelah merge
- **3 track boleh punya feature branch aktif secara bersamaan** — tidak perlu tunggu track lain merge dulu, karena masing-masing menyentuh file yang berbeda (lihat `TASK_ASSIGNMENT.md`)

### 1.3 Hotfix Branch (Emergency)

```
hotfix/<nama-dev>/<deskripsi-singkat>
```

**Aturan:**
- Branch dari `main`
- Merge kembali ke `main` via PR (boleh fast-track review kalau genuinely urgent)
- Contoh: `hotfix/dev-elang/fix-payment-webhook`

---

## 2. Workflow Harian

### 2.1 Mulai Fitur Baru

```bash
git checkout main
git pull origin main
git checkout -b feat/dev-yourname/track-x-feature-name
git push -u origin feat/dev-yourname/track-x-feature-name
```

### 2.2 Commit & Push

- **Commit message:** present tense, singkat, jelas
  ```
  Fix CheckoutForm to call /api/checkout/agent
  Add isApproved gate to middleware
  Add guideImageUrl input to product form
  ```
- **Frequency:** push setiap 30-60 menit kerja
- **Rebase sebelum PR:**
  ```bash
  git fetch origin
  git rebase origin/main
  git push --force-with-lease origin feat/dev-yourname/track-x-feature-name
  ```

### 2.3 Buat Pull Request

1. Push feature branch ke GitHub
2. Buka GitHub → **Pull Request** → **New PR**
3. Base branch: `main`
4. Gunakan **PR Template** (`.github/PULL_REQUEST_TEMPLATE.md`)
5. Assign reviewer (dev lain, siapa saja yang available)
6. Label: `track-a`/`track-b`/`track-c`, `ready-for-review`

### 2.4 Review & Merge


## 3. Conflict Prevention — Task Isolation

### 3.1 Pembagian 3 Track Paralel (Tidak Berurutan)

Tidak ada "Stage 1, 2, 3, ..." yang harus dikerjakan berurutan. Semua track di bawah **independen** dan **bisa dimulai bersamaan sekarang** karena tidak menyentuh file yang sama. Detail lengkap tugas & files di `TASK_ASSIGNMENT.md`.

#### Track A: Agent Checkout UX
- **Files:** `components/agent/CheckoutForm.tsx`, `components/agent/OrderPageClient.tsx`, `app/agent/order/[orderId]/page.tsx`

#### Track B: Agent Registration, Approval & Debt Settlement
- **Files:** `app/register/`, `app/api/auth/register/`, `app/admin/agents/`, `app/api/admin/agents/`, `middleware.ts`, `lib/auth.ts`

#### Track C: Product Guide Image & Inventory
- **Files:** `app/admin/inventory/`, `app/api/admin/products/`

### 3.2 ⚠️ Protected Files (Coordinate Before Edit)

- `prisma/schema.prisma` — Sudah final untuk kebutuhan saat ini, kalau perlu field baru buka issue dulu
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

Karena semua track merge ke `main` yang sama, protection rule ini sudah cukup — tidak perlu setup tambahan untuk `dev`/`staging` karena branch itu tidak dipakai.

---

## 5. Common Scenarios

### 5.1 "Perlu update file di track orang lain"

- Create issue: "@dev-jiwo Perlu update X di Track B?"
- Wait for coordination
- Atau: branch dari feature branch mereka, merge back via PR

### 5.2 "3 PR dari 3 track mau merge di waktu yang sama"

Karena masing-masing track menyentuh file berbeda, ini **seharusnya tidak conflict**. Kalau tetap ada conflict (jarang, biasanya di file netral seperti `lib/utils.ts`):

```bash
git fetch origin
git rebase origin/main
git add . && git rebase --continue
git push --force-with-lease origin feat/dev-yourname/track-x-feature
```

Merge PR **begitu approved** — tidak perlu tunggu PR track lain juga selesai review.

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
git clone https://github.com/elgptr/vendinglink.git && cd vendinglink

# 2. Create feature branch (lihat TASK_ASSIGNMENT.md untuk track kamu)
git checkout -b feat/dev-yourname/track-x-feature-name

# 3. Daily work: commit & push
git add . && git commit -m "Descriptive message" && git push

# 4. Before PR: sync with main
git fetch origin && git rebase origin/main && git push --force-with-lease

# 5. Create PR on GitHub (use template), base branch = main

# 6. After approve & merge: cleanup
git checkout main && git pull origin main
git branch -D feat/dev-yourname/track-x-feature-name
git push origin --delete feat/dev-yourname/track-x-feature-name
```

---

**Last Updated:** 2026-09-07 | **Version:** 2.0 — Model Track paralel (bukan Stage sequential), single branch `main`

- Reviewer: check quality, run build/lint lokal, approve
- Conflict:
  ```bash
  git fetch origin
  git rebase origin/main
  git add . && git rebase --continue
  git push --force-with-lease origin feat/dev-yourname/track-x-feature-name
  ```
- **Merge strategy:** Squash and Merge
- **Merge segera setelah approve** — tidak perlu tunggu track lain juga selesai

---
