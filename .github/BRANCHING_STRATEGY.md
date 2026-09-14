# 🚀 Branching Strategy — VendingLink (Track Paralel + Phase Sequential)

Panduan setup kolaborasi 3 developer dengan dua model: **Track A/B/C (paralel)** untuk foundational work, dan **Phase 1-5 (sequential)** untuk roadmap initiatives.
---

## Two Collaboration Models

### Track A/B/C (Legacy - Foundational)

**Model:** Fully parallel. All 3 tracks can run simultaneously from `main`.

**Files:** Zero overlap by design.
- Track A: Agent checkout UX
- Track B: Agent auth, approval, debt settlement
- Track C: Product guides, inventory

**For Track work:** Start from `main`, merge independent of other tracks.

---

### Phase 1-5 (Roadmap v0.1 → v0.5)

**Model:** Sequential with partial parallel (Phase 3 & 4 run simultaneously after Phase 2).

**Dependency chain:**
```
Phase 1 (Testing) ← BLOCKER for all others
    |
    v
Phase 2 (Security)
    |
    +──────────────┐
    |              |
    v              v
Phase 3 (Observ) Phase 4 (DB Perf)  [paralel]
    |
    v
Phase 5 (Revenue Features)
```

**For Phase work:** Phase N+1 cannot start until Phase N is merged to `main`.

---

## Setup GitHub Branch Protection (Admin, Sekali Saja)

Repository → Settings → Branches → Add rule

**Pattern:** `main`
- ✅ Require pull request reviews: Min `1`
- ✅ Dismiss stale pull request approvals
- ✅ Require status checks: `build`, `lint`, `test` (after Phase 1 launch)
- ✅ Require up to date before merge
- ✅ Restrict push: Admins only
- ❌ No force push, no deletions

Cukup satu branch (`main`) — tidak perlu setup `dev`/`staging` karena tidak dipakai.

---

## Branch Naming Convention

**Track work:**
```
feat/dev-elang/track-a-feature-name
feat/dev-jiwo/track-b-feature-name
feat/dev-iqbal/track-c-feature-name
```

**Phase work:**
```
feat/dev-elang/phase-1-unit-tests
feat/dev-jiwo/phase-2-middleware-security
feat/dev-elang/phase-3-observability
feat/dev-jiwo/phase-4-db-performance
feat/dev-elang/phase-5-multi-qty-checkout
```

**Rule for Phase branches:** Always include phase number for clarity.

---

## File yang Perlu Coordinate Dulu

| File | Kenapa | Aturan |
|------|--------|--------|
| `prisma/schema.prisma` | Owned Track C, modified Phase 4 (Jiwo), then Phase 5 | **Sequential:** Track C → Phase 4 → Phase 5. Coordinate via issue. |
| `middleware.ts` | Owned Track B, refactored Phase 2 | **Sequential:** Track B merge first, then Phase 2 refactors. Jiwo continuous owner. |
| `app/admin/inventory/page.tsx` | Track C form → Phase 3 badge → Phase 5 upload | **Sequential:** Track C → Phase 3 → Phase 5. Iqbal owns all. |
| `package.json` | Dependency conflicts | Phase 1 pre-approved: Vitest, @testing-library/react, @vitejs/plugin-react, @playwright/test. Others require approval. |

---

## FAQ

**Q: Track saya harus nunggu track lain selesai dulu?**
A: Tidak untuk Track work. Semua track independen, mulai kapan saja dari `main`. Tapi untuk Phase work, Phase N+1 harus nunggu Phase N merge.

**Q: PR saya konflik dengan PR track lain?**
A: Seharusnya tidak terjadi untuk Track work (file terpisah). Kalau terjadi (jarang), rebase dan resolve manual. Untuk Phase work, phase dependencies seharusnya prevent ini.

**Q: Boleh 3 PR dari 3 track merge di hari yang sama?**
A: Ya, silakan untuk Track work. Merge begitu masing-masing approved. Untuk Phase work, Phase 3 & 4 PRs bisa merge same day karena mereka paralel.

**Q: Phase saya bisa mulai sebelum phase sebelumnya selesai?**
A: Tidak. Phase 1 blocks all. Phase 2 blocks Phase 3/4/5. Phase 3 & 4 bisa parallel, tapi keduanya tunggu Phase 2. Phase 5 tunggu Phase 3 & 4 both done.

**Q: Ada dependency riil antar track?**
A: Tidak ada untuk Track work saat ini. Untuk Phase work, dependency chain sudah defined di TASK_ASSIGNMENT.md. Jika unexpected issue found, buka issue dan koordinasi.

---

**Last Updated:** 2026-09-11 | **Version:** 3.0 — Track paralel + Phase sequential, single branch `main`
