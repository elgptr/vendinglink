# Implementation Plan — VendingLink Roadmap v0.1 → v0.5

## Overview

Comprehensive implementation plan for 5 phases of VendingLink technical roadmap, progressing from v0.1.0 (current foundation with B2C/B2B checkout, admin dashboard, AI features) to v0.5.0 (MVP complete with testing, security, observability, performance, and revenue-expanding features). Each phase is designed to be deployable independently via PR to `main`, with 1–2 week target per phase.

Track A/B/C references are included for file overlap awareness, but developer assignment is dynamic. Playwright E2E testing across all phases is fully owned by @dev-iqbal (QA Tester).

---

## Phase 1: Testing Foundation & Quality Gate (v0.1.0 → v0.2.0)

### [Types]

```typescript
// __tests__/helpers/types.ts (NEW)
interface TestTransaction {
  orderId: string;
  productId: string;
  agentId?: string;
  status: string;
  paymentType: 'MIDTRANS' | 'AGENT_CREDIT';
  finalAmount: number;
}

interface MockMidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
}
```

### [Files]

| Action | File | Purpose |
|--------|------|---------|
| NEW | `vitest.config.ts` | Vitest configuration with path aliases matching `tsconfig.json` |
| NEW | `__tests__/helpers/prisma.ts` | Prisma test client factory (isolated test DB or mock) |
| NEW | `__tests__/helpers/fixtures.ts` | Reusable test data factories (user, product, stock, transaction) |
| NEW | `__tests__/helpers/types.ts` | Shared test type definitions |
| NEW | `__tests__/lib/stock.test.ts` | Unit tests for `claimAvailableStock` |
| NEW | `__tests__/lib/transactionStatus.test.ts` | Unit tests for `applyMidtransStatusUpdate` |
| NEW | `__tests__/lib/utils.test.ts` | Unit tests for utility functions |
| NEW | `__tests__/api/checkout-customer.test.ts` | Integration tests for customer checkout |
| NEW | `__tests__/api/checkout-agent.test.ts` | Integration tests for agent checkout |
| NEW | `__tests__/api/webhook.test.ts` | Integration tests for Midtrans webhook |
| NEW | `playwright.config.ts` | Playwright E2E config (QA) |
| NEW | `e2e/customer-checkout.spec.ts` | E2E customer happy path (QA) |
| NEW | `e2e/agent-checkout.spec.ts` | E2E agent happy path (QA) |
| MODIFY | `.github/workflows/ci.yml` | Add `npm test` step after build |
| MODIFY | `package.json` | Add `test`, `test:e2e` scripts |

### [Functions]

| Action | Function | File | Purpose |
|--------|----------|------|---------|
| NEW | `createTestPrisma()` | `__tests__/helpers/prisma.ts` | Isolated Prisma client for tests |
| NEW | `createMockProduct()` | `__tests__/helpers/fixtures.ts` | Factory for test products |
| NEW | `createMockStock(productId, count)` | `__tests__/helpers/fixtures.ts` | Factory for redeem stock entries |
| NEW | `createMockUser(role, isApproved)` | `__tests__/helpers/fixtures.ts` | Factory for users |
| NEW | `buildMidtransSignature(params)` | `__tests__/helpers/fixtures.ts` | Generate valid test signatures |

### [Classes]

No class changes.

### [Dependencies]

| Package | Version | Type | Purpose |
|---------|---------|------|---------|
| `vitest` | `^3.2.0` | devDependency | Test runner |
| `@vitejs/plugin-react` | `^4.0.0` | devDependency | React support for Vitest |
| `@testing-library/react` | `^16.0.0` | devDependency | Component testing |
| `@playwright/test` | `^1.52.0` | devDependency | E2E testing (QA) |

### [Testing]

- **Unit tests (≥ 15):**
  - `stock.test.ts`: claimAvailableStock success, out-of-stock returns null, concurrent claim retry, MAX_CLAIM_ATTEMPTS exceeded
  - `transactionStatus.test.ts`: settlement → PAID, capture+accept → PAID, cancel → EXPIRED, idempotent duplicate, out-of-stock → promo code, agent credit out-of-stock → CANCELLED
  - `utils.test.ts`: validateMidtransSignature valid/invalid, generateOrderId format, sanitizeString XSS removal, parseBulkLinks valid/invalid URLs, parseBulkCodes

- **Integration tests (≥ 6):**
  - Customer checkout: success → PENDING + snapToken, out-of-stock → 400, free promo code checkout → instant PAID
  - Agent checkout: success → instant PAID + redeemUrl, out-of-stock → 400, unapproved agent → 403

- **Webhook tests (≥ 4):**
  - Valid sig + settlement → PAID + stock claimed
  - Valid sig + settlement + out-of-stock → PAID + promoCode issued
  - Invalid sig → 403
  - Duplicate settlement → idempotent (no double stock claim)

- **E2E tests (≥ 2, QA — @dev-iqbal):**
  - Customer: visit `/customer` → select product → fill form → checkout → order page → verify PAID
  - Agent: login → `/agent/catalog` → select product → checkout → success screen → copy link

### [Implementation Order]

1. Install Vitest + create `vitest.config.ts` with path aliases → verify: `npx vitest --run` exits 0
2. Create test helpers: `prisma.ts`, `fixtures.ts`, `types.ts` → verify: imports resolve
3. Write `__tests__/lib/utils.test.ts` (pure functions, no DB) → verify: `npx vitest --run` passes
4. Write `__tests__/lib/stock.test.ts` (needs Prisma mock) → verify: passes
5. Write `__tests__/lib/transactionStatus.test.ts` → verify: passes
6. Write `__tests__/api/checkout-customer.test.ts` → verify: passes
7. Write `__tests__/api/checkout-agent.test.ts` → verify: passes
8. Write `__tests__/api/webhook.test.ts` → verify: passes
9. Update `.github/workflows/ci.yml` to add test step → verify: CI passes
10. (QA — @dev-iqbal) Install Playwright + write 2 E2E specs → verify: `npx playwright test` passes


---

## Phase 2: Middleware & Security Hardening (v0.2.0 → v0.3.0)

### [Files]

| Action | File | Purpose |
|--------|------|---------|
| NEW | `middleware.ts` | NextAuth edge middleware with route matrix |
| NEW | `lib/rateLimit.ts` | Shared in-memory rate limiter |
| MODIFY | `app/api/auth/register/route.ts` | Use shared rate limiter |
| MODIFY | `next.config.mjs` | Add security headers |
| NEW | `__tests__/middleware.test.ts` | Route matching tests |
| NEW | `__tests__/lib/rateLimit.test.ts` | Rate limiter tests |

### [Testing]

- **Middleware tests (≥ 8):** Public routes, agent routes, admin routes, assets
- **Rate limiter tests (≥ 4):** Under limit, at limit, window expiry, different keys

### [Implementation Order]

1. Create `lib/rateLimit.ts` → verify: unit tests pass
2. Refactor `app/api/auth/register/route.ts` → verify: registration works
3. Create `middleware.ts` → verify: route matrix functional
4. Apply rate limiter to public endpoints → verify: 429 on excess
5. Add security headers → verify: headers in response
6. Write all tests → verify: `npm test` passes

---

## Phase 3: Observability & Operational Visibility (v0.3.0 → v0.3.5)

### [Files]

| Action | File | Purpose |
|--------|------|---------|
| NEW | `lib/logger.ts` | Structured logging utility |
| NEW | `app/api/admin/health/route.ts` | Health check endpoint |
| MODIFY | ~15 `app/api/**/route.ts` | Replace console with logger |
| MODIFY | `app/admin/page.tsx` | Health widget |
| MODIFY | `app/admin/inventory/page.tsx` | Low-stock badge |
| NEW | `__tests__/lib/logger.test.ts` | Logger tests |

### [Implementation Order]

1. Create `lib/logger.ts` → verify: unit tests pass
2. Replace console in route handlers → verify: build passes
3. Create `app/api/admin/health/route.ts` → verify: metrics returned
4. Add health widget → verify: dashboard shows health
5. Add low-stock badge → verify: badge appears
6. Write tests → verify: full suite green

---

## Phase 4: Database Performance & Scaling (v0.3.5 → v0.4.0)

### [Files]

| Action | File | Purpose |
|--------|------|---------|
| MODIFY | `prisma/schema.prisma` | Add `@@index` directives |
| NEW | `prisma/migrations/xxx/` | Auto-generated migration |
| NEW | `lib/cache.ts` | Caching utility |
| MODIFY | `app/agent/catalog/page.tsx`, `app/customer/page.tsx` | Use caching |
| MODIFY | Query files | Optimization |

### [Implementation Order]

1. Add indexes to schema → verify: `npx prisma validate` passes
2. Generate migration → verify: migration applies cleanly
3. Create `lib/cache.ts` → verify: unit tests pass
4. Integrate caching → verify: second load faster
5. Add query optimizations → verify: smaller payload
6. Write tests → verify: full suite green

---

## Phase 5: Revenue-Expanding Features (v0.4.0 → v0.5.0)

### [Files]

| Action | File | Purpose |
|--------|------|---------|
| MODIFY | Checkout route files | Add quantity param |
| MODIFY | Checkout form components | Add qty selector |
| MODIFY | Success screen components | Display multiple links |
| NEW | `lib/whatsapp.ts` | WhatsApp integration |
| NEW | `app/customer/orders/page.tsx` | Order lookup page |
| NEW | `app/api/customer/orders/route.ts` | Order lookup API |
| NEW | `app/api/admin/upload/route.ts` | Image upload endpoint |
| NEW | `lib/storage.ts` | File storage utility |
| NEW | E2E test files | QA owned |

### [Implementation Order]

1. Add quantity to checkout schemas → verify: backward compatible
2. Loop stock claiming → verify: tests pass
3. Update checkout form UI → verify: qty selector appears
4. Update success screen UI → verify: multiple links display
5. Create WhatsApp integration → verify: unit test passes
6. Create order lookup endpoint → verify: returns correct orders
7. Create order lookup page → verify: lookup works
8. Create storage utility → verify: file upload works
9. Create upload endpoint → verify: endpoint functional
10. Add upload widget → verify: image appears
11. (QA — @dev-iqbal) Write E2E specs → verify: all pass
12. Write all tests → verify: full suite green

---

## Summary

| Phase | Version | Duration | Tests |
|-------|---------|----------|-------|
| 1 | v0.1→v0.2 | 2 weeks | ≥ 25 unit/int + 2 E2E |
| 2 | v0.2→v0.3 | 1-2 weeks | ≥ 12 |
| 3 | v0.3→v0.3.5 | 1-2 weeks | ≥ 6 |
| 4 | v0.3.5→v0.4 | 1 week | ≥ 3 |
| 5 | v0.4→v0.5 | 2 weeks | ≥ 11 unit + 3 E2E |
| **Total** | **v0.1→v0.5** | **7-9 weeks** | **≥ 60+** |

---

**Implementation Plan Version:** 1.0 | **Last Updated:** 2026-09-11
