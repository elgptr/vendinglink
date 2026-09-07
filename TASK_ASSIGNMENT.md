# Task Assignment & Stage Ownership

Dokumen ini memetakan tanggung jawab developer per stage untuk menghindari tabrakan pekerjaan.

---

## Status: 3 Developer Team

| Developer | Nickname | Role |
|-----------|----------|------|
| [Name 1] | dev-kiro | Lead / Stage 2 |
| [Name 2] | dev-alice | Stage 3–4 |
| [Name 3] | dev-bob | Stage 5–6 |

*(Update nicknames dengan nama asli)*

---

## ✅ Stage 1: DB Schema Foundation
**Status:** ✅ COMPLETED  
**Owner:** @dev-kiro  
**Key Files:** `prisma/schema.prisma`, `app/api/admin/reports/route.ts`

---

## 🔄 Stage 2: Public Customer Flow (B2C Midtrans)
**Status:** 📋 READY TO START  
**Owner:** @dev-kiro  
**Files Owned:** `app/customer/` (NEW), `components/customer/` (NEW), `app/api/customer/` (NEW)

**Deliverables:**
- [ ] Public catalog page
- [ ] Customer checkout with Midtrans Snap
- [ ] Success page with redeem URL + guide image
- [ ] `agentId = null`, `paymentType = 'MIDTRANS'`

**Protected (DO NOT EDIT):** `lib/auth.ts`, `middleware.ts`, `prisma/schema.prisma`

---

## 🔄 Stage 3: Agent Checkout → Credit/Debt
**Status:** 📋 READY AFTER Stage 2  
**Owner:** @dev-alice  
**Files Owned:** `app/agent/catalog/[productId]/checkout/page.tsx`, `app/api/checkout/route.ts`

**Deliverables:**
- [ ] Split checkout: agent vs customer logic
- [ ] Agent checkout: no Midtrans, instant redeem
- [ ] Increment `outstandingDebt`
- [ ] `paymentType = 'AGENT_CREDIT'`

**Dependency:** Await Stage 2 → separate Snap API endpoint

---

## 🔄 Stage 4: Agent Registration & Admin Approval
**Status:** 📋 READY AFTER Stage 3  
**Owner:** @dev-alice  
**Files Owned:** `app/auth/register/` (NEW), `app/api/auth/register/` (NEW), `app/admin/agents/`, `middleware.ts`

**Deliverables:**
- [ ] Agent registration page
- [ ] Admin approval UI + API
- [ ] Middleware gate: block unapproved agents
- [ ] `isApproved = false` for new, `true` when approved

---

## 🔄 Stage 5: Debt Settlement & Guide Images
**Status:** 📋 READY AFTER Stage 4  
**Owner:** @dev-bob  
**Files Owned:** `app/admin/inventory/`, `app/admin/agents/`

**Deliverables:**
- [ ] Guide image upload in product edit
- [ ] Display guide on checkout & success pages
- [ ] "Lunas" button to settle debt
- [ ] Reset `outstandingDebt`, mark `isSettled`

---

## 🔄 Stage 6: Docs & Copy Sync
**Status:** 📋 READY AFTER Stage 5  
**Owner:** @dev-bob  
**Files Owned:** `PRD.md`, `.env.example`, UI copy

**Deliverables:**
- [ ] Update PRD.md to match implementation
- [ ] Sync UI copy (Indonesian)
- [ ] End-to-end QA testing

---

## 📋 Collaboration Rules

### Protected Files (Always Coordinate)
- `prisma/schema.prisma` — Locked, next change: notify tech lead
- `lib/auth.ts` — Only Stage 4
- `middleware.ts` — Only Stage 4
- `package.json` — No new deps without approval

### Shared Files (Any Dev, Review Required)
- `lib/midtrans.ts` — Coordinate split for Stage 2 & 3
- `lib/utils.ts`, `app/api/admin/reports/` — All stages review carefully
- `PRD.md` — Each stage updates, final sync in Stage 6

---

## Communication Protocol

**Starting a Stage:** Open GitHub Issue, label `stage-N`, mention blockers

**File Changes:** Comment in issue, wait for approval before editing protected files

**Conflict:** Slack immediately, one dev rebases & resolves, both verify `npm run build`

---

## Git Branch Naming

```
feat/dev-yourname/stage-N-feature
```

Example:
```
feat/dev-kiro/stage-2-customer-flow
feat/dev-alice/stage-3-agent-credit
```

---

## PR Approval Workflow

Every PR needs:
- ✅ Passing CI/CD (build & lint)
- ✅ ≥1 code review from another dev
- ✅ No `dev` conflicts
- ✅ Updated `.env.example` if needed

**Merge:** Squash and Merge (1 clean commit)

---

**Last Updated:** 2026-09-07 | **Maintained By:** Tech Lead
