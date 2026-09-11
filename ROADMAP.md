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


**Priority:** 🔴 CRITICAL — blocks all other phases


### Motivation

Zero test files exist in the codebase. For a platform processing real money (Midtrans payments, agent credit/debt), every deployment is a confidence gamble. A broken checkout route means lost sales that nobody notices until a customer complains.

### Scope

1. **Setup test framework:** Vitest + `@testing-library/react` + Prisma test utilities
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

### Related Tracks & Files

| Area | Files | Notes |
|------|-------|-------|
| Test setup | `vitest.config.ts` (NEW), `__tests__/` (NEW) | Project-wide |
| Unit tests | `__tests__/lib/stock.test.ts`, `__tests__/lib/transactionStatus.test.ts`, `__tests__/lib/utils.test.ts` (ALL NEW) | Pure logic, no DB |
| Integration tests | `__tests__/api/checkout-customer.test.ts`, `__tests__/api/checkout-agent.test.ts`, `__tests__/api/webhook.test.ts` (ALL NEW) | Needs Prisma test client |
| E2E | `e2e/customer-checkout.spec.ts`, `e2e/agent-checkout.spec.ts` (ALL NEW) | Playwright, owned by QA |
| CI | `.github/workflows/ci.yml` (MODIFY) | Add test step |
| Dependencies | `vitest`, `@testing-library/react`, `@playwright/test` (ALL NEW devDeps) | Approval needed per CONTRIBUTING.md |

### Deliverables Checklist

- [ ] Vitest configured and running (`npm test`)
- [ ] ≥ 15 unit tests for `lib/stock.ts`, `lib/transactionStatus.ts`, `lib/utils.ts`
- [ ] ≥ 6 integration tests for 3 checkout paths + webhook
- [ ] CI pipeline runs tests on every PR
- [ ] Playwright setup + ≥ 2 E2E specs (QA)

---

## Phase 2: Middleware & Security Hardening

**Version:** v0.2.0 → v0.3.0  
**Target:** 1–2 minggu  
**Impact:** Revenue Protection — prevent unauthorized access and endpoint abuse  
**Priority:** 🔴 CRITICAL — prerequisite for safe agent registration flow  
**Depends on:** Phase 1 (tests must exist before modifying auth layer)

### Motivation

`middleware.ts` does not exist on disk — referenced in docs and CODEOWNERS but never created (was renamed to `proxy.ts` in commit `eb46690`). Route protection currently relies on per-layout `redirect()` and per-route `auth()` calls. Any API route missing an explicit `auth()` check is unprotected. Public endpoints (`/api/checkout/customer`, `/api/promo-codes/validate`) have no rate limiting beyond the registration endpoint's in-memory limiter.

### Scope

1. **Create `middleware.ts`** with NextAuth edge-compatible route matcher
2. **Rate limiting for public endpoints** (extracted to shared module)
3. **Auth hardening** (verify isApproved check is active)
4. **Security headers** (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)

### Deliverables Checklist

- [ ] `middleware.ts` created with full public/agent/admin route matrix
- [ ] Shared rate limiter extracted and applied to ≥ 3 public endpoints
- [ ] Security headers configured
- [ ] ≥ 8 tests for middleware route matching + rate limiter
- [ ] All existing tests still pass




---

## Phase 3: Observability & Operational Visibility

**Version:** v0.3.0 → v0.3.5  
**Target:** 1–2 minggu  
**Impact:** Revenue Recovery — detect failed payments and stuck orders fast  
**Depends on:** Phase 2  
**Can run parallel with:** Phase 4

### Motivation

Only `console.log` / `console.error` exists for monitoring. Failed Midtrans webhooks, stock claim race failures, and agent debt discrepancies are invisible in production. Every minute a failed payment goes unnoticed is lost revenue.

### Scope

1. **Structured logging** across all route handlers
2. **Error tracking integration** (Sentry or equivalent)
3. **Admin health dashboard** with stuck orders + low-stock alerts
4. **Low-stock badge** in inventory page

### Deliverables Checklist

- [ ] Structured logger utility created and integrated
- [ ] All route handlers use structured logging (no raw console.log)
- [ ] Error tracking operational (Sentry or equivalent)
- [ ] `/api/admin/health` endpoint returns stuck orders + low stock
- [ ] Admin dashboard shows health summary
- [ ] ≥ 4 tests for logger + health endpoint

---

## Phase 4: Database Performance & Scaling Foundation

**Version:** v0.3.5 → v0.4.0  
**Target:** 1 minggu  
**Impact:** Revenue Growth — handle 10x transaction volume without degradation  
**Depends on:** Phase 2  
**Can run parallel with:** Phase 3

### Motivation

No database indexes beyond Prisma defaults (`@id`, `@unique`). The optimistic CAS in `lib/stock.ts` is well-designed, but without composite indexes the queries degrade as stock tables grow. Report queries aggregate across thousands of transactions without index support.

### Scope

1. **Add Prisma `@@index` directives** to hot-path tables
2. **Connection pooling configuration**
3. **Product catalog caching** (Next.js `unstable_cache`)
4. **Query optimization audit** (missing `select` directives)

### Deliverables Checklist

- [ ] 4+ composite indexes added to Prisma schema
- [ ] Migration generated and tested
- [ ] Product catalog caching with auto-invalidation
- [ ] Connection pooling documented
- [ ] Query optimization for report endpoints
- [ ] Zero performance regression (build + test pass)

---

## Phase 5: Revenue-Expanding Feature Foundation

**Version:** v0.4.0 → v0.5.0  
**Target:** 2 minggu  
**Impact:** Revenue Growth — new revenue channels and higher conversion  
**Depends on:** Phase 3 (observability for safe monitoring of new flows)

### Motivation

The platform currently has single-unit checkout, no customer notifications, no order lookup for returning customers, and no image upload infrastructure. Each of these directly impacts conversion rate or average order value.

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
- [ ] ≥ 3 Playwright E2E specs (QA)
- [ ] All existing tests still pass

---

## Dependency Graph

```
Phase 1 (Testing)
    │
    ▼
Phase 2 (Security)
    │
    ├──────────────┐
    ▼              ▼
Phase 3          Phase 4
(Observability)  (DB Perf)
    │
    ▼
Phase 5 (Revenue Features)
```

---

## Track Overlap Matrix

The following files are touched by roadmap phases AND current Track A/B/C work. Coordinate via GitHub Issues before editing.

| File | Current Track | Roadmap Phase | Risk |
|------|---------------|---------------|------|
| `middleware.ts` | Track B | Phase 2 | **High** — Phase 2 creates it, Track B was supposed to extend it. Merge Phase 2 first, then Track B extends. |
| `app/api/checkout/agent/route.ts` | Protected (Track A reads) | Phase 5 | Medium — Phase 5 modifies for multi-qty. Complete Track A first. |
| `components/agent/CheckoutForm.tsx` | Track A | Phase 5 | Medium — Phase 5 adds qty selector. Complete Track A first. |
| `app/admin/inventory/page.tsx` | Track C | Phase 3, Phase 5 | Medium — Phase 3 adds low-stock badge, Phase 5 adds upload. Complete Track C first or coordinate. |
| `prisma/schema.prisma` | Track C (extend) | Phase 4 | **High** — Protected file. Both add changes. Coordinate via Issue. |

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| v0.1.0 | 2026-09-07 | Foundation: B2C + B2B checkout flows, admin dashboard, AI chat/insight, 3 parallel tracks |
| v0.2.0 | TBD | Testing foundation + CI quality gate |
| v0.3.0 | TBD | Middleware + security hardening |
| v0.3.5 | TBD | Observability + structured logging |
| v0.4.0 | TBD | Database indexes + caching + query optimization |
| v0.5.0 | TBD | Multi-qty checkout, WhatsApp notification, customer order lookup, image upload (MVP Complete) |

---

**Roadmap Version:** 1.0 | **Last Updated:** 2026-09-11 | **Scope:** VendingLink v0.1.0 → v0.5.0 MVP
