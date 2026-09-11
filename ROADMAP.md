# VendingLink — Product & Technical Roadmap

| Field | Value |
|-------|-------|
| **Title** | VendingLink MVP Roadmap |
| **Version** | 1.0 |
| **Last Updated** | 2026-09-11 |
| **Current App Version** | v0.1.0 |
| **Target App Version** | v0.5.0 (MVP Complete) |

---

## Guide for Contributors

> **Anda sedang mengirimkan:** Improvement bertahap dari foundation v0.1 menuju MVP v0.5 — mencakup testing, security, observability, database performance, dan revenue features. Setiap phase menghasilkan versi minor yang bisa di-deploy.
>
> **Target waktu per phase:** 1–2 minggu. Setiap phase harus bisa di-merge dan di-deploy secara independen.

### Version Transitions

| Phase | From | To | Focus | Duration |
|-------|------|----|-------|----------|
| 1 | v0.1.0 | v0.2.0 | Testing Foundation & Quality Gate | 2 weeks |
| 2 | v0.2.0 | v0.3.0 | Middleware & Security Hardening | 1–2 weeks |
| 3 | v0.3.0 | v0.3.5 | Observability & Operational Visibility | 1–2 weeks |
| 4 | v0.3.5 | v0.4.0 | Database Performance & Scaling Foundation | 1 week |
| 5 | v0.4.0 | v0.5.0 | Revenue-Expanding Feature Foundation | 2 weeks |

### Ground Rules

- Setiap phase punya PR tersendiri, tidak boleh dicampur lintas phase
- Phase 1–2 HARUS selesai sebelum Phase 3–5 dimulai (dependency)
- Phase 3 dan 4 bisa dikerjakan paralel setelah Phase 2 selesai
- Phase 5 bisa dimulai setelah Phase 3 selesai
- Playwright E2E testing (di semua phase) → fully owned oleh @dev-iqbal (QA)
- Track assignment per phase bersifat **dinamis** — lihat `TASK_ASSIGNMENT.md` untuk pembagian terkini

---

## Phase 1: Testing Foundation & Quality Gate

**Version:** v0.1.0 → v0.2.0  
**Target:** 2 minggu  
**Impact:** Revenue Protection — prevent broken deployments from killing live sales  
**Priority:** CRITICAL — blocks all other phases

### Motivation

Zero test files exist in the codebase. For a platform processing real money (Midtrans payments, agent credit/debt), every deployment is a confidence gamble. A broken checkout route means lost sales that nobody notices until a customer complains.


---

## Phase 2: Middleware & Security Hardening

**Version:** v0.2.0 → v0.3.0  
**Target:** 1–2 minggu  
**Depends on:** Phase 1 ✅ complete + Track B PR merged  
**Impact:** Security & Reliability — harden auth, rate limit, CSRF protection

### Scope

1. **Middleware refactor:** rate limiting, security headers integration, auth hardening
2. **Input sanitization & CSRF protection** on all forms
3. **Security headers** (CSP, X-Frame-Options, etc.)
4. **Playwright E2E** for security flows (rate limit triggers, auth gates)

### Deliverables Checklist

- [ ] Rate limiting implemented on critical endpoints (`/api/checkout/`, `/api/admin/`)
- [ ] CSRF protection tokens on all forms
- [ ] Input sanitization for all user inputs
- [ ] Security headers configured
- [ ] >= 2 new E2E specs passing (rate limit, auth gates)
- [ ] All Phase 1 tests still passing

---

## Phase 3: Observability & Operational Visibility

**Version:** v0.3.0 → v0.3.5  
**Target:** 1–2 minggu  
**Depends on:** Phase 2 ✅ complete  
**Parallel with:** Phase 4 (independent files)
**Impact:** Operational Insight — structured logging, health checks, low-stock alerting

### Scope

1. **Structured logger** (`lib/logger.ts`) with context, levels, request tracking
2. **Health check endpoint** (`app/api/admin/health/route.ts`) — uptime, DB connection, cache status
3. **Dashboard health widget** — visual status indicator
4. **Replace console.* with logger** in 15+ route files
5. **Low-stock badge** on inventory page
6. **Playwright E2E** for observability flows

### Deliverables Checklist

- [ ] Structured logger created and integrated
- [ ] Health check endpoint returns app metrics
- [ ] Dashboard shows health widget + low-stock badge visible
- [ ] 15+ route files use logger instead of console
- [ ] >= 2 Playwright E2E specs for health/metrics flows
- [ ] All Phase 1 + Phase 2 tests still passing

---

## Phase 4: Database Performance & Scaling Foundation

**Version:** v0.3.5 → v0.4.0  
**Target:** 1 minggu  
**Depends on:** Phase 2 ✅ complete  
**Parallel with:** Phase 3 (independent files)
**Impact:** Performance & Scalability — indexes, caching, query optimization

### Scope

1. **Composite indexes** added to Prisma schema (Transaction, Stock, User queries optimized)
2. **Migration** generated and tested
3. **Caching utility** (`lib/cache.ts`) + product catalog caching with auto-invalidation
4. **Query optimization** audit — all queries have proper `select` directives
5. **Connection pooling** configuration documented

### Deliverables Checklist

- [ ] 4+ composite indexes added to Prisma schema
- [ ] Migration generated and tested on staging/local DB
- [ ] Product catalog caching with auto-invalidation on update
- [ ] Query optimization audit: all queries have proper select directives
- [ ] Connection pooling documented (PgBouncer config for Neon)
- [ ] Zero performance regression (build + test pass)

---

## Phase 5: Revenue-Expanding Feature Foundation

**Version:** v0.4.0 → v0.5.0  
**Target:** 2 minggu  
**Depends on:** Phase 3 ✅ complete (observability for safe monitoring of new flows)
**Impact:** Revenue Growth — new revenue channels and higher conversion

### Scope

1. **Multi-quantity checkout** (qty selector, batch stock claiming)
2. **WhatsApp notification** (post-purchase redeem URL)
3. **Customer order lookup** (phone-based, no login)
4. **Image upload** for product guides (Supabase/Cloudinary)
5. **Playwright E2E** for new features (@dev-iqbal)

### Deliverables Checklist

- [ ] Multi-quantity checkout working for both agent + customer (max 10)
- [ ] WhatsApp notification sent after successful payment
- [ ] Customer order lookup page live at `/customer/orders`
- [ ] Image upload working for product guide images
- [ ] >= 3 Playwright E2E specs (QA)
- [ ] All existing tests still pass

---

## Dependency Graph

```
Phase 1 (Testing)
    |
    v
Phase 2 (Security)
    |
    ├──────────────┐
    v              v
Phase 3          Phase 4
(Observability)  (DB Perf)
    |
    v
Phase 5 (Revenue Features)
```

---

## Track Overlap Matrix

| File | Current Track | Roadmap Phase | Risk |
|------|---------------|---------------|------|
| `middleware.ts` | Track B | Phase 2 | **High** — Phase 2 creates it, Track B extends it. Merge Phase 2 first. |
| `app/admin/inventory/page.tsx` | Track C | Phase 3, Phase 5 | Medium — Phase 3 adds badge, Phase 5 adds upload. Complete Track C first. |
| `prisma/schema.prisma` | Track C | Phase 4 | **High** — Both add changes. Coordinate via Issue. |

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| v0.1.0 | 2026-09-07 | Foundation: B2C + B2B checkout flows, admin dashboard, AI chat/insight |
| v0.2.0 | TBD | Testing foundation + CI quality gate |
| v0.3.0 | TBD | Middleware + security hardening |
| v0.3.5 | TBD | Observability + structured logging |
| v0.4.0 | TBD | Database indexes + caching + query optimization |
| v0.5.0 | TBD | Multi-qty checkout, WhatsApp notification, customer order lookup, image upload (MVP Complete) |

---

**Roadmap Version:** 1.0 | **Last Updated:** 2026-09-11 | **Scope:** VendingLink v0.1.0 → v0.5.0 MVP

### Scope

1. **Setup test framework:** Vitest + @testing-library/react + Prisma test utilities
2. **Unit tests for critical business logic:**
   - `lib/stock.ts` — optimistic CAS claim logic, retry behavior, out-of-stock
   - `lib/transactionStatus.ts` — Midtrans status mapping, idempotency, stockout promo code generation
   - `lib/utils.ts` — `validateMidtransSignature()`, `generateOrderId()`, `sanitizeString()`, `parseBulkLinks()`, `parseBulkCodes()`
3. **Integration tests for checkout flows:**
   - Customer Midtrans checkout (happy path + stock unavailable)
   - Customer free checkout via promo code (100% discount)
   - Agent credit checkout (happy path + stock unavailable + unapproved agent)
4. **Integration tests for webhook:**
   - Valid signature → stock claimed → PAID
   - Valid signature → out of stock → promo code issued
   - Invalid signature → 403
   - Duplicate notification → idempotent
5. **CI pipeline update:** Add `test` step to `.github/workflows/ci.yml`
6. **Playwright E2E (QA — @dev-iqbal):**
   - Customer happy path: catalog → checkout → payment → order page
   - Agent happy path: login → catalog → checkout → success screen

### Deliverables Checklist

- [ ] Vitest + React Testing Library + Playwright setup complete
- [ ] >= 15 unit tests untuk critical business logic (stock, status, utils)
- [ ] >= 10 integration tests untuk checkout flows + webhook
- [ ] 2 Playwright E2E specs (customer + agent) passing
- [ ] CI pipeline updated: build -> lint -> test (all passing)
- [ ] `package.json` scripts: `test`, `test:e2e` defined and working
- [ ] **Zero** pre-existing tests broken (all pass)
