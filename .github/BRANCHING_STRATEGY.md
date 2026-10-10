# 🚀 Branching Strategy — VendingLink

Panduan setup kolaborasi all developers (agents/developers) untuk roadmap initiatives.
---

## Two Collaboration Models

### Track A/B/C (Legacy - Foundational) --STATUS DONE

**Model:** Fully parallel. All 3 tracks can run simultaneously from `main`.

**Files:** Zero overlap by design.
- Track A: Agent checkout UX
- Track B: Agent auth, approval, debt settlement
- Track C: Product guides, inventory

**For Track work:** Start from `main`, merge independent of other tracks.

---

### Phase 1-5 (Roadmap v0.1 → v0.5) --STATUS DONE

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

**Last Updated:** 2026-09-11 | **Version:** 3.0 — Track paralel + Phase sequential, single branch `main`
