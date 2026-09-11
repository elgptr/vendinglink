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

## Initiative 1: Roadmap v0.1 to v0.5 (5 Phases)


---

### Phase 1: Testing Foundation & Quality Gate (v0.1.0 to v0.2.0)

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

### Phase 4: Database Performance & Scaling Foundation (v0.3.5 to v0.4.0)

**Timeline:** 1 minggu
**Dependency:** Phase 2 OK complete
**Parallel with:** Phase 3 (independent files - Phase 3 is observability, Phase 4 is DB indexes)

#### Assignment

| Developer | Role | Deliverables | Files |
|-----------|------|--------------|-------|
| **Jiwo** | Lead (DB Perf) | Add composite indexes to schema + generate migration + test | prisma/schema.prisma (**owned by Jiwo for this phase; coordinate with Iqbal who owns schema from Track C**), prisma/migrations/xxx/ (auto-generated), query optimization audit |
| **Elang** | Caching Lead | Create caching utility + integrate product catalog caching | lib/cache.ts (NEW), app/agent/catalog/page.tsx, app/customer/page.tsx (integrate caching) |
| **Iqbal** | QA Lead (optional) | E2E tests for caching invalidation (if time permits) | e2e/performance-*.spec.ts (OPTIONAL) |

#### Deliverables Checklist

- [ ] 4+ composite indexes added to Prisma schema (Transaction, Stock, User queries optimized)
- [ ] Migration generated and tested on staging/local DB
- [ ] Product catalog caching with auto-invalidation on update
- [ ] Query optimization audit: all queries have proper select directives
- [ ] Connection pooling documented (PgBouncer config for Neon)
- [ ] All Phase 1 + Phase 2 + Phase 3 tests still passing

#### SPECIAL NOTES

- **prisma/schema.prisma ownership transition:** Track C (Iqbal) owns schema. Phase 4 (Jiwo) needs to edit it for indexes. **Prerequisite:** Track C PR must merge before Phase 4 schema edits. Jiwo and Iqbal coordinate: Jiwo makes index changes, both review diff carefully to avoid breaking Track C fields/relations.
- **No breaking migrations:** Jiwo must ensure npx prisma migrate is backward compatible with deployed schema.

#### Protected Files (Phase 4 only)

- package.json - no new deps (use existing Prisma utilities)




---

### Phase 5: Revenue-Expanding Feature Foundation (v0.4.0 to v0.5.0)

**Timeline:** 2 minggu
**Dependency:** Phase 3 OK complete (observability needed to safely monitor new flows)
**Parallel with:** Nothing (final phase)

#### Assignment

| Developer | Role | Deliverables | Files |
|-----------|------|--------------|-------|
| **Elang** | Lead (Multi-Qty) | Multi-quantity checkout: qty selector in form + batch stock claiming + success screen updates | components/agent/CheckoutForm.tsx (extend for qty selector), app/api/checkout/agent/route.ts (extend; **was protected, now Elang edits**), components/agent/SuccessScreen.tsx (display multiple links), app/agent/order/[orderId]/page.tsx (extend) |
| **Jiwo** | Lead (Notifications + Lookup) | WhatsApp integration + customer order lookup page + lookup API | lib/whatsapp.ts (NEW), app/customer/orders/page.tsx (NEW), app/api/customer/orders/route.ts (NEW) |
| **Iqbal** | Lead (Upload + E2E) | Image upload infrastructure (file storage utility + admin upload endpoint) + image upload widget in inventory + >= 3 Playwright E2E specs | lib/storage.ts (NEW), app/api/admin/upload/route.ts (NEW), app/admin/inventory/page.tsx (extend with upload widget), e2e/revenue-*.spec.ts (3+ new specs) |

#### Deliverables Checklist

- [ ] Multi-quantity checkout working (max 10 qty) for agent + customer
- [ ] WhatsApp notification sent after successful payment (mock or live based on env)
- [ ] Customer order lookup page live at /customer/orders, works with phone-based search
- [ ] Image upload working for product guide images (file stored, URL saved to DB)
- [ ] >= 3 Playwright E2E specs covering new features (all passing)
- [ ] Multi-qty backward compatible with single-qty orders
- [ ] All Phase 1 + 2 + 3 + 4 tests still passing

#### SPECIAL NOTES

- **app/api/checkout/agent/route.ts unprotected:** Phase 5 removes protection (was read-only for Track A). Elang now owns edits for multi-qty feature. Coordinate with @dev-elang.
- **app/admin/inventory/page.tsx final touch:** Track C created form, Phase 3 added badge, Phase 5 adds upload widget. **Sequential only - Phase 3 merge first, then Phase 5 edits.**
- **Iqbal E2E demand (3+ specs):** This is heaviest Playwright work. Recommend: Start E2E design early (Week 1 of Phase 5), implement Weeks 1-2 in parallel with other devs.




---

## COLLABORATION RULES - Updated for Track + Phase Model

### Model Clarity

**Legacy (Track A/B/C):**
- OK **Parallel:** All 3 tracks can run simultaneously from main (zero file overlap by design)
- OK **No waiting:** Track A does not need to wait for Track B or C to complete

**New (Initiative 1 - Phases 1-5):**
- RED **Sequential blocks:** Phase N+1 cannot start until Phase N is merged to main
- WARNING **Partial parallel:** Phase 3 and Phase 4 can run simultaneously (after Phase 2 is done)
- OK **Within a phase:** All 3 developers work on their phase assignments in parallel (different files)

### Branch Naming Convention - Updated

```
# Track work (legacy, if any new features added)
feat/dev-elang/track-a-feature-name
feat/dev-jiwo/track-b-feature-name
feat/dev-iqbal/track-c-feature-name

# Phase work (roadmap initiatives)
feat/dev-elang/phase-1-unit-tests
feat/dev-jiwo/phase-1-integration-tests
feat/dev-iqbal/phase-1-e2e-playwright
feat/dev-jiwo/phase-2-middleware-security
feat/dev-elang/phase-3-observability
feat/dev-jiwo/phase-4-db-performance
feat/dev-elang/phase-5-multi-qty-checkout
```

**Rule:** Include phase number in branch name for clarity in PR list.

### Protected Files Per Phase - Updated



---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.1 | 2026-09-07 | Track paralel dengan tim: Elang (Track A), Jiwo (Track B), Iqbal (Track C) |
| v3.0 | 2026-09-11 | **Major update:** Initiative 1 Roadmap phases 1-5 added; dual-model (Track + Phase); per-phase assignments; special notes; updated collaboration rules; protected files made dynamic per phase |

---

**Last Updated:** 2026-09-11 | **Version:** 3.0 | **Model:** Track A/B/C (legacy) + Initiative 1 Roadmap v0.1 to v0.5 (5 phases sequential + partial parallel)

| Phase | Protected (Do Not Edit) |
|-------|------------------------|
| **Phase 1** | prisma/schema.prisma, middleware.ts, all production route logic (test coverage only) |
| **Phase 2** | prisma/schema.prisma, package.json (no new general deps) |
| **Phase 3** | prisma/schema.prisma, Track B owned files (app/admin/agents/*, app/api/admin/agents/*) |
| **Phase 4** | package.json, Track A + C owned files (except schema) |
| **Phase 5** | None (all assignments own their files for edits) |

