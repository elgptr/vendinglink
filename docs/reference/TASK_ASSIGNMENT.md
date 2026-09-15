# Task Assignment & Module Ownership

Dokumen ini memetakan tanggung jawab developer dalam dua model kolaborasi:
1. **Track A/B/C (Legacy)** - sudah selesai, foundational work
2. **Initiative 1: Roadmap v0.1 to v0.5** - 5 phases progresif menuju MVP

---

## Status: 3 Developer Team

| Developer | Nickname | Track (Legacy) | Role Tambahan |
|-----------|----------|----------------|---------------|
| Elang | dev-elang | Track A | Unit Test Lead (Phase 1) |
| Jiwo | dev-jiwo | Track B | Integration Test Lead (Phase 1) + Tech Lead (Phase 2, 4) |
| Iqbal | dev-iqbal | Track C | QA Lead (all phases) + E2E Owner |

---

## OK Track A/B/C - Selesai (Foundational, No Further Changes)

Semua work di bawah **sudah live di main** dan tidak memerlukan perubahan lebih lanjut. Ini disertakan untuk referensi historis dan untuk memetakan file ownership hingga Initiative 1 dimulai.

### A Track A: Agent Checkout UX (Owner: Elang) - DONE

**Files:**
- components/agent/CheckoutForm.tsx
- components/agent/OrderPageClient.tsx
- app/agent/order/[orderId]/page.tsx

**Protected (jangan diedit sampai Phase 1 selesai):** app/api/checkout/agent/route.ts

---

### B Track B: Agent Registration, Approval & Debt Settlement (Owner: Jiwo) - DONE

**Files:**
- app/register/
- app/api/auth/register/
- app/admin/agents/
- app/api/admin/agents/
- middleware.ts (extension untuk /register public route + isApproved check)
- lib/auth.ts (enable isApproved check)

**Protected (jangan diedit sampai Phase 1 selesai):** prisma/schema.prisma

---

### C Track C: Support Kode Redeem & Panduan Penggunaan (Owner: Iqbal) - DONE

**Files:**
- prisma/schema.prisma (extend: type, guideText, guideImageUrl)
- app/api/admin/products/route.ts
- app/admin/inventory/page.tsx
- app/customer/order/[orderId]/page.tsx (extend)
- app/agent/order/[orderId]/page.tsx (extend)

**Protected (jangan diedit sampai Phase 1 selesai):** app/admin/agents/*, app/api/admin/agents/*

---

## Initiative Model — Roadmap v2.0 (3 Business Initiatives)

Replaces prior 5-phase structure. Phase 1 (Testing) & Phase 2 (Security) are **merged to `main`** — no further work. Remaining work organized as 3 initiatives, executed sequentially (1 → 2 → 3). **All Playwright E2E owned end-to-end by @dev-iqbal (QA).**

### Completed Foundation (merged, no action)

| Phase | Status | Details |
|-------|--------|---------|
| Phase 1 (Testing) | ✅ merged | Vitest + helpers + `__tests__/*` + `e2e/*` + CI gate |
| Phase 2 (Security) | ✅ merged (PR #20) | `proxy.ts` routing, rate-limiting, CSRF, input validation, security headers |

---

### Initiative 1 — "Never Lose a Paid Order" (Reliability & Observability) → v0.4.0

**Timeline:** 3–4 minggu | **Dependency:** none | **Priority:** RED (protects MVP launch)

| Developer | Role | Deliverables | Files |
|-----------|------|--------------|-------|
| **Elang** | Lead (Observability) | Structured logger + health endpoint + dashboard widget | `lib/logger.ts`, `app/api/admin/health/route.ts`, `app/admin/page.tsx` (health widget), `__tests__/lib/logger.test.ts`, `__tests__/api/health.test.ts` |
| **Jiwo** | Logger Integration | Replace `console.*` (≈59 sites) with `logger` across route handlers + stockout logging | `app/api/**/route.ts` (catch blocks), `lib/transactionStatus.ts` |
| **Iqbal** | QA / E2E Owner | Low-stock badge + observability E2E | `app/admin/inventory/page.tsx` (badge only; **do NOT touch forms/upload**), `e2e/observability-*.spec.ts` |

**Deliverables Checklist:**
- [ ] Structured logger with levels/context
- [ ] `/api/admin/health` returns metrics + stuck orders + low stock
- [ ] Dashboard health widget + low-stock badge
- [ ] ≥ 15 route files on logger
- [ ] ≥ 1 E2E spec passing
- [ ] All existing tests green

**Protected:** `prisma/schema.prisma`, `next.config.mjs` (tech-lead), Track B files (`app/api/admin/agents/*`).

---

### Initiative 2 — "Safe to Open the Doors" (Abuse Protection remainder) → v0.5.0 (p1)

**Timeline:** ~2 minggu | **Dependency:** Initiative 1 merged | **Note:** builds on already-merged security layer

| Developer | Role | Deliverables | Files |
|-----------|------|--------------|-------|
| **Jiwo** | Lead (Safety) | Rate-limit discount endpoints + unify discount validation | `app/api/voucher/validate/route.ts`, `app/api/promo-codes/validate/route.ts`, `lib/discount.ts` |
| **Elang** | Consolidation | Wire checkout routes + remove duplicate endpoints | `app/api/checkout/customer/route.ts`, `app/api/checkout/agent/route.ts`, delete `app/api/order/*` |
| **Iqbal** | QA / E2E Owner | Discount-throttle E2E | `e2e/security-*.spec.ts` |

**Deliverables Checklist:**
- [ ] Both validate endpoints rate-limited
- [ ] Single `validateDiscountCode` used by endpoints + checkout
- [ ] Duplicate `/api/order/*` removed
- [ ] ≥ 1 E2E spec passing
- [ ] All prior tests green

**Protected:** `prisma/schema.prisma`, `package.json` (no new deps).

---

### Initiative 3 — "Buy More, Come Back, Tell a Friend" (Growth) → v0.5.0 (p2)

**Timeline:** ~3 minggu | **Dependency:** Initiative 1 merged (observability needed) | **Risk:** highest (touches checkout) — ships last

| Developer | Role | Deliverables | Files |
|-----------|------|--------------|-------|
| **Elang** | Lead (Multi-Qty) | Qty selector + batch stock claim + multi-link screens | `components/agent/CheckoutForm.tsx`, customer form, `app/api/checkout/agent/route.ts`, `app/api/checkout/customer/route.ts`, `lib/stock.ts`, success/order screens |
| **Jiwo** | Delivery & Reorders | WhatsApp + phone lookup + DB indexes/migration | `lib/whatsapp.ts`, `app/api/midtrans/webhook/route.ts`, `app/api/customer/orders/route.ts`, `app/customer/orders/page.tsx`, `prisma/schema.prisma` (@@index — coordinate w/ tech-lead), `prisma/migrations/*` |
| **Iqbal** | QA / E2E Owner + Uploads | Image upload + revenue E2E (3+) | `lib/storage.ts`, `app/api/admin/upload/route.ts`, `app/admin/inventory/page.tsx` (upload widget — after Init 1 badge), `e2e/revenue-*.spec.ts` (3+) |

**Deliverables Checklist:**
- [ ] Multi-qty (max 10) for agent + customer
- [ ] WhatsApp on PAID (mock/live via env)
- [ ] `/customer/orders` phone lookup live
- [ ] Image upload persists URL
- [ ] ≥ 3 E2E specs passing
- [ ] Single-qty backward compatible
- [ ] All prior tests green

**Special Notes:**
- `app/api/checkout/agent/route.ts` — no longer protected; Elang owns multi-qty edits. Coordinate with Jiwo (webhook).
- `app/admin/inventory/page.tsx` — triple-touch: Track C form → Init 1 badge → Init 3 upload. Sequential: Initiative 1 badge merge first.
- `prisma/schema.prisma` index changes require tech-lead review (CODEOWNERS gate).

**Protected:** none frozen, but `package.json` + `prisma/schema.prisma` changes need tech-lead sign-off.

---

## REMOVED: Phase 1: Testing Foundation & Quality Gate (v0.1.0 to v0.2.0)

**Timeline:** 2 minggu
**Priority:** RED CRITICAL - blocks semua phase lain
**Dependency:** None (dapat dimulai sekarang)

#### Assignment

| Developer | Role | Deliverables | Files |
|-----------|------|--------------|-------|
| **Elang** | Unit Test Lead | Setup Vitest config + test helpers + unit tests untuk lib/stock.ts, lib/transactionStatus.ts, lib/utils.ts | vitest.config.ts, __tests__/helpers/prisma.ts, __tests__/helpers/fixtures.ts, __tests__/helpers/types.ts, __tests__/lib/*.test.ts |
| **Jiwo** | Integration Test Lead | Integration tests untuk checkout (customer, agent) + webhook | __tests__/api/checkout-customer.test.ts, __tests__/api/checkout-agent.test.ts, __tests__/api/webhook.test.ts |
| **Iqbal** | QA Lead | Playwright config + E2E specs (customer + agent happy path) + CI pipeline update + test scripts di package.json | playwright.config.ts, e2e/customer-checkout.spec.ts, e2e/agent-checkout.spec.ts, .github/workflows/ci.yml (add test step), package.json (add test scripts) |

#### Deliverables Checklist

- [ ] Vitest + React Testing Library + Playwright setup complete
- [ ] >= 15 unit tests untuk critical business logic (stock, status, utils)
- [ ] >= 10 integration tests untuk checkout flows + webhook
- [ ] 2 Playwright E2E specs (customer + agent) passing
- [ ] CI pipeline updated: build -> lint -> test (all passing)
- [ ] package.json scripts: test, test:e2e defined and working
- [ ] **Zero** pre-existing tests broken (all pass)

#### SPECIAL NOTES

- **Iqbal bottleneck:** Dual role (Track C owner + QA Lead). **Prerequisite:** Track C must merge to main before Phase 1 E2E starts. Coordinate with @dev-iqbal to confirm timeline.
- **Pre-approve 4 new devDependencies:** Approved pending implementation: vitest@^3.2.0, @vitejs/plugin-react@^4.0.0, @testing-library/react@^16.0.0, @playwright/test@^1.52.0

#### Protected Files (Phase 1 only)

- prisma/schema.prisma - do not edit (Track C owns, may expand in Phase 5)
- middleware.ts - frozen (Track B done, Phase 2 will refactor)
- All production route files - no logic changes, only test coverage

---

### Phase 2: Middleware & Security Hardening (v0.2.0 to v0.3.0)

**Timeline:** 1-2 minggu
**Dependency:** Phase 1 OK complete + Track B PR merged
**Parallel with:** Nothing (sequential after Phase 1)

#### Assignment

| Developer | Role | Deliverables | Files |
|-----------|------|--------------|-------|
| **Jiwo** | Lead (Tech) | Middleware refactor: rate limiting + security headers integration + auth hardening | middleware.ts (major rewrite), lib/auth.ts (extend), lib/rateLimit.ts (NEW) |
| **Elang** | Security Hardener | CSRF protection tokens + input sanitization + security headers + security-related route validation | Security middleware in routes, next.config.mjs (CSP headers if needed) |
| **Iqbal** | QA Lead | E2E security flow tests: rate limit triggers, invalid requests blocked, auth gates work | e2e/security-rate-limit.spec.ts, e2e/security-auth.spec.ts (NEW) |

#### Deliverables Checklist

- [ ] Rate limiting implemented on critical endpoints (/api/checkout/, /api/admin/)
- [ ] CSRF protection tokens on all forms
- [ ] Input sanitization for all user inputs (apply to routes + utils)
- [ ] Security headers configured (CSP, X-Frame-Options, etc.)
- [ ] >= 2 new E2E specs passing (rate limit, auth gates)
- [ ] All Phase 1 tests still passing
- [ ] Middleware diff reviewed: all existing public routes preserved

#### SPECIAL NOTES

- **middleware.ts critical:** This file was extended by Track B. Phase 2 refactors it significantly. **Prerequisite:** Track B PR must merge first. Jiwo must carefully preserve all Track B additions (/register public route, isApproved check for agents).
- **No breaking changes to Track B routes:** /register, /api/auth/register/, agent flow must stay functional.

#### Protected Files (Phase 2 only)

- prisma/schema.prisma - frozen
- package.json - no new deps without approval (use existing security libraries)



**Model:** Sequential dengan partial parallel (Phase 3 & 4 paralel setelah Phase 2).

**Dependency Chain:**
```
Phase 1 (Testing) [CRITICAL BLOCKER]
    |
    v
Phase 2 (Security)
    |
    +------ +
    |       |
    v       v
Phase 3    Phase 4
(Observ)   (DB Perf)
    |
    v
Phase 5 (Revenue Features)
```

**Target Delivery:** 7-9 minggu (1-2 minggu per phase)




---

### Phase 3: Observability & Operational Visibility (v0.3.0 to v0.3.5)

**Timeline:** 1-2 minggu
**Dependency:** Phase 2 OK complete
**Parallel with:** Phase 4 (independent files)

#### Assignment

| Developer | Role | Deliverables | Files |
|-----------|------|--------------|-------|
| **Elang** | Lead (Observability) | Create structured logger + health check endpoint + dashboard health widget | lib/logger.ts (NEW), app/api/admin/health/route.ts (NEW), app/admin/page.tsx (extend with health widget) |
| **Jiwo** | Logger Integration | Replace console.* with structured logger in 15+ route files | Multiple app/api/**/route.ts files (batch replace console to logger) |
| **Iqbal** | QA Lead | Low-stock badge + E2E tests for observability flows | app/admin/inventory/page.tsx (badge only; **do not touch forms, upload features**), e2e/observability-*.spec.ts (NEW) |

#### Deliverables Checklist

- [ ] Structured logger (lib/logger.ts) with context, levels, request tracking
- [ ] Health check endpoint returns app metrics (uptime, DB connection, cache status)
- [ ] Dashboard shows health widget + low-stock badge visible
- [ ] 15+ route files use logger instead of console
- [ ] >= 2 Playwright E2E specs for health/metrics flows
- [ ] All Phase 1 + Phase 2 tests still passing

#### SPECIAL NOTES

- **app/admin/inventory/page.tsx triple-touch file:** Phase 3 adds low-stock badge only. **Do not touch** form inputs, guide text, image upload (those are Track C feature + Phase 5). Iqbal coordinates with self (same person owns Track C).
- **Jiwo batch console replacement:** Large number of files but mechanical change. Can be done in one focused session.

#### Protected Files (Phase 3 only)

- prisma/schema.prisma - frozen
- Track C owned files (app/admin/agents/*, app/api/admin/agents/*) - frozen for Phase 3

---

### ~~Phase 4 & 5~~ → Merged into: Final Sprint (Parallel)

> **Restructured 2026-09-14:** Phase 4 (DB Perf) dan Phase 5 (Revenue Features) digabung menjadi 1 sprint paralel. Setiap developer punya domain file 100% independen — tidak ada yang menunggu, tidak ada merge conflict.

**Timeline:** 2 minggu
**Dependency:** Phase 3 ✅ merged to main
**Model:** Fully parallel — siapa selesai duluan, merge duluan.

```
main (Phase 3 merged)
  ├── feat/dev-elang/sprint-final  ──▶ merge kapan saja
  ├── feat/dev-jiwo/sprint-final   ──▶ merge kapan saja
  └── feat/dev-iqbal/sprint-final  ──▶ merge kapan saja
```

---

#### Elang: "Checkout & Caching"
**Branch:** `feat/dev-elang/sprint-final`

| Deliverable | Files |
|-------------|-------|
| Caching utility | `lib/cache.ts` (NEW) |
| Product catalog caching | `app/agent/catalog/page.tsx`, `app/customer/page.tsx` |
| Multi-qty checkout | `components/agent/CheckoutForm.tsx`, `app/api/checkout/agent/route.ts` |
| Multi-link success screen | `components/agent/SuccessScreen.tsx` |
| Order detail update | `app/agent/order/[orderId]/page.tsx` |
| Batch stock claiming | `lib/stock.ts` |
| Unit tests | `__tests__/lib/cache.test.ts` (NEW) |

**Do NOT touch:** prisma/schema.prisma, app/admin/inventory/*, e2e/*, app/customer/orders/*

---

#### Jiwo: "Database & Notifications"
**Branch:** `feat/dev-jiwo/sprint-final`

| Deliverable | Files |
|-------------|-------|
| Composite DB indexes | `prisma/schema.prisma` (@@index additions) |
| Migration | `prisma/migrations/*` (auto-generated) |
| Logger integration | `app/api/**/route.ts` (replace `console.*` with logger — **except** `app/api/checkout/agent/route.ts` which Elang owns) |
| WhatsApp integration | `lib/whatsapp.ts` (NEW) |
| Customer order lookup page | `app/customer/orders/page.tsx` (NEW) |
| Customer order lookup API | `app/api/customer/orders/route.ts` (NEW) |
| Integration tests | `__tests__/api/customer-orders.test.ts` (NEW) |

**Do NOT touch:** lib/cache.ts, lib/stock.ts, components/agent/*, lib/storage.ts, app/admin/inventory/*, e2e/*

---

#### Iqbal: "Upload, Badge & E2E"
**Branch:** `feat/dev-iqbal/sprint-final`

| Deliverable | Files |
|-------------|-------|
| Low-stock badge | `app/admin/inventory/page.tsx` (badge) |
| File storage utility | `lib/storage.ts` (NEW) |
| Admin upload endpoint | `app/api/admin/upload/route.ts` (NEW) |
| Upload widget in inventory | `app/admin/inventory/page.tsx` (upload widget) |
| E2E tests (all) | `e2e/observability-*.spec.ts`, `e2e/revenue-*.spec.ts`, `e2e/performance-*.spec.ts` |

**Do NOT touch:** lib/cache.ts, lib/stock.ts, components/agent/*, prisma/schema.prisma, app/api/checkout/*, app/customer/orders/*

---

#### File Ownership Matrix

| File/Area | Elang | Jiwo | Iqbal |
|-----------|:-----:|:----:|:-----:|
| `lib/cache.ts` | **OWN** | - | - |
| `lib/stock.ts` | **OWN** | - | - |
| `lib/whatsapp.ts` | - | **OWN** | - |
| `lib/storage.ts` | - | - | **OWN** |
| `prisma/schema.prisma` | - | **OWN** | - |
| `components/agent/*` | **OWN** | - | - |
| `app/api/checkout/agent/route.ts` | **OWN** | - | - |
| `app/agent/catalog/page.tsx` | **OWN** | - | - |
| `app/agent/order/[orderId]/page.tsx` | **OWN** | - | - |
| `app/customer/page.tsx` | **OWN** | - | - |
| `app/customer/orders/*` | - | **OWN** | - |
| `app/api/customer/orders/*` | - | **OWN** | - |
| `app/api/**/route.ts` (console replace) | - | **OWN** | - |
| `app/admin/inventory/page.tsx` | - | - | **OWN** |
| `app/api/admin/upload/*` | - | - | **OWN** |
| `e2e/*` | - | - | **OWN** |

**Zero file overlap.** Setiap file dimiliki 1 developer saja.

#### Deliverables Checklist (Final Sprint)

- [ ] Product catalog caching with auto-invalidation on update (Elang)
- [ ] Multi-quantity checkout working max 10 qty (Elang)
- [ ] Multi-qty backward compatible with single-qty orders (Elang)
- [ ] 4+ composite indexes added to Prisma schema (Jiwo)
- [ ] Migration generated and tested (Jiwo)
- [ ] 15+ route files use logger instead of console (Jiwo)
- [ ] WhatsApp notification after payment (Jiwo)
- [ ] Customer order lookup page at /customer/orders (Jiwo)
- [ ] Low-stock badge visible in admin inventory (Iqbal)
- [ ] Image upload working for product guide images (Iqbal)
- [ ] >= 5 Playwright E2E specs covering all new features (Iqbal)
- [ ] All Phase 1 + 2 + 3 tests still passing

#### Special Notes

- **`app/api/checkout/agent/route.ts`:** Elang owns this file. Jiwo should NOT replace console.* here — Elang will handle logger integration in his own files.
- **`app/admin/inventory/page.tsx`:** Iqbal adds both low-stock badge AND upload widget in one branch. No sequential dependency.
- **`prisma/schema.prisma`:** Only Jiwo edits. Index additions must be backward compatible.

---

## COLLABORATION RULES - Updated for Final Sprint

### Model Clarity

**Legacy (Track A/B/C):**
- ✅ **Parallel:** All 3 tracks can run simultaneously from main (zero file overlap by design)
- ✅ **No waiting:** Track A does not need to wait for Track B or C to complete

**Completed (Phases 1-3):**
- ✅ Phase 1 (Testing) — merged
- ✅ Phase 2 (Security) — merged
- ✅ Phase 3 (Observability) — merged/merging

**Final Sprint (was Phase 4+5):**
- ✅ **Fully parallel:** All 3 developers work simultaneously, zero file overlap
- ✅ **Independent merge:** Siapa selesai duluan, merge duluan. Tidak perlu urutan.
- ✅ **No protected files:** Each developer owns their files exclusively

### Branch Naming Convention

```
feat/dev-elang/sprint-final
feat/dev-jiwo/sprint-final
feat/dev-iqbal/sprint-final
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.1 | 2026-09-07 | Track paralel dengan tim: Elang (Track A), Jiwo (Track B), Iqbal (Track C) |
| v3.0 | 2026-09-11 | Initiative 1 Roadmap phases 1-5 added; dual-model (Track + Phase) |
| v4.0 | 2026-09-13 | Reframed to ROADMAP v2.0: 3 business initiatives, Phase 1 & 2 merged |
| v5.0 | 2026-09-14 | **Phase 4+5 merged into single parallel sprint.** Zero file overlap, independent merge order. All 3 developers work fully parallel. |

---

**Last Updated:** 2026-09-14 | **Version:** 5.0 | **Model:** Track A/B/C (legacy, merged) + Phases 1-3 (merged) + Final Sprint (parallel) | **Baseline:** Phase 1, 2 & 3 merged to `main`

