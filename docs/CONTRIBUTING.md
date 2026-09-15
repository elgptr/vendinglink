# Panduan Kolaborasi Git - VendingLink

Dokumen ini menetapkan branching strategy, workflow PR, dan aturan isolasi task untuk mencegah konflik antar developer.

Dua model: **Track A/B/C (paralel)** untuk foundational work, **Phase 1-5 (sequential)** untuk roadmap initiatives.

---

## 1. Branching Model

### 1.1 Branch Utama

Project ini pakai **satu branch stabil**: `main`. Tidak ada tier `dev`/`staging` terpisah.

| Branch | Tujuan | Merge Rule |
|--------|--------|-----------| 
| `main` | Production - semua PR yang lolos review & CI langsung masuk sini | Hanya via PR dengan >=1 approval + passing CI/CD |

### 1.2 Feature Branch (Temporary)

Setiap developer membuat feature branch dari `main` dengan konvensi penamaan:

```
feat/<nama-dev>/<deskripsi-singkat>
```

**Contoh Track work (lihat TASK_ASSIGNMENT.md):**
- `feat/dev-elang/track-a-agent-checkout-ux`
- `feat/dev-jiwo/track-b-agent-approval`
- `feat/dev-iqbal/track-c-guide-image`

**Contoh Phase work:**
- `feat/dev-elang/phase-1-unit-tests`
- `feat/dev-jiwo/phase-2-middleware-security`
- `feat/dev-elang/phase-3-observability`

**Aturan:**
- Deskripsi singkat, lowercase, dash-separated (no space)
- Selalu branch dari `main`
- Satu developer = satu feature branch aktif per track/phase
- Delete branch setelah merge
- **Track work:** 3 tracks boleh punya feature branch aktif bersamaan (zero file overlap)
- **Phase work:** Only one phase development at a time (dependencies enforced)

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

### 2.1 Mulai Fitur/Phase Baru

**Track work:**
```bash


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
  git push --force-with-lease origin feat/dev-yourname/track-x-or-phase-N-feature
  ```

### 2.3 Buat Pull Request

1. Push feature branch ke GitHub
2. Buka GitHub - **Pull Request** - **New PR**
3. Base branch: `main`
4. Gunakan **PR Template** (`.github/PULL_REQUEST_TEMPLATE.md`)
5. Assign reviewer (dev lain, siapa saja yang available)
6. Label: `track-a`/`track-b`/`track-c` OR `phase-1`/`phase-2`/etc., plus `ready-for-review`

### 2.4 Review & Merge

- **Reviewer check:** build, lint, test (if applicable), code quality, file ownership (for Phase PRs)
- **Track work:** Merge segera setelah approved - tidak perlu tunggu track lain
- **Phase work:** Merge after approved, but ensure previous phases merged first

---

## 3. Conflict Prevention - Task Isolation & Phase Dependencies

### 3.1 Track A/B/C Model (Paralel)

Tidak ada dependency - semua track independen. Detail lengkap di `TASK_ASSIGNMENT.md`:

- **Track A:** Agent Checkout UX (Elang)
- **Track B:** Agent Registration & Approval (Jiwo)
- **Track C:** Product Guides & Inventory (Iqbal)

### 3.2 Phase 1-5 Model (Sequential + Partial Parallel)

**Dependency chain:**
```
Phase 1 (Testing) <- BLOCKER for all
    |
    v
Phase 2 (Security)
    |
    +----+ 
    |    |
    v    v
Phase 3 Phase 4  [paralel]
(Observ)(DB Perf)
    |
    v
Phase 5 (Revenue)
```

**Rules:**
- Phase N+1 cannot start until Phase N merged to main AND tests passing
- Phase 3 & 4 can run simultaneously after Phase 2 done (different files)
- Phase 5 needs both Phase 3 & 4 complete

### 3.3 File Ownership Per Phase

See `TASK_ASSIGNMENT.md` Phase assignment tables for full details. Each phase specifies which developer owns which files.

**Protected files per phase:** See `TASK_ASSIGNMENT.md` Protected Files table.

**High-risk files with multi-phase touching:**
- `middleware.ts` (Track B owned, Phase 2 refactors)
- `prisma/schema.prisma` (Track C owned, Phase 4 indexes, Phase 5 as needed)
- `app/admin/inventory/page.tsx` (Track C form, Phase 3 badge, Phase 5 upload)

**Koordinasi strategy:** Open GitHub Issue for multi-phase file edits, tag all owners, discuss scope before merging previous phase.

---

## 4. Code Review Checklist

Standard checklist for all PRs:

- [ ] Type safety (no `any`)
- [ ] Error handling (try-catch, null checks)
- [ ] Database queries (no N+1, proper includes)
- [ ] Naming conventions (camelCase, SNAKE_CASE)
- [ ] No console.log, debug code
- [ ] .env.example updated if new vars
- [ ] npm run build && npm run lint pass
- [ ] npm test pass (if Phase 1+ and applicable)
- [ ] .github/PULL_REQUEST_TEMPLATE.md filled out

**For Phase PRs additionally:**
- [ ] All files edited assigned to my role (check assignment table)
- [ ] No edits to protected files for this phase
- [ ] Confirm previous phases merged (if not first phase)

---

## 5. Deployment & CI/CD

### CI Pipeline

Runs on all PR + push to main:
- `npm run build`
- `npm run lint`
- `npm test` (after Phase 1 launch)

All must pass before merge.

### Deploy to Production

1. PR reviewed & approved
2. Rebase & ensure no conflicts
3. Squash & Merge to main
4. GitHub Actions CI runs
5. Auto-deploy via Vercel

---

**Last Updated:** 2026-09-11 | **Version:** 3.0 | **Model:** Track paralel + Phase sequential, single branch `main`

git checkout main
git pull origin main
git checkout -b feat/dev-yourname/track-x-feature-name
git push -u origin feat/dev-yourname/track-x-feature-name
```

**Phase work:**
```bash
git checkout main
git pull origin main
# CRITICAL: Ensure previous phases merged and tested!
git checkout -b feat/dev-yourname/phase-N-feature-name
git push -u origin feat/dev-yourname/phase-N-feature-name
```

