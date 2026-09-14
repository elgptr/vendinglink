# Implementation Plan — VendingLink Initiatives (Remaining Work to MVP v0.5.0)

## [Overview]

Drive VendingLink from v0.3.0 (testing + security foundation merged) to MVP v0.5.0 by executing three business initiatives from ROADMAP v2.0. Phase 1 (Testing) and Phase 2 (Security) are already merged in `main`. Remaining work is reframed under three initiatives, sequenced 1 → 2 → 3. All Playwright E2E owned by @dev-iqbal.

---

## Initiative 1 — "Never Lose a Paid Order" (Reliability & Observability) → v0.4.0

Goal: surface payment/fulfillment failures within seconds; give admins mission-control. Currently only `console.*` (59 call sites) exists.

### [Files]

| Action | File | Purpose |
|--------|------|---------|
| NEW | `lib/logger.ts` | Structured JSON logger (levels, context, request tracking) |
| NEW | `__tests__/lib/logger.test.ts` | Logger unit tests |
| NEW | `app/api/admin/health/route.ts` | Admin-only health endpoint (metrics + stuck orders + low stock) |
| NEW | `__tests__/api/health.test.ts` | Health endpoint integration tests |
| MODIFY | `app/api/**/route.ts` (~15 handlers) | Replace `console.error/log` with `logger` in catch blocks |
| MODIFY | `app/admin/page.tsx` | Add health widget consuming `/api/admin/health` |
| MODIFY | `app/admin/inventory/page.tsx` | Add low-stock badge (badge only — no form/upload) |
| MODIFY | `lib/transactionStatus.ts` | Add structured logging around stockout-grace |
| NEW | `e2e/observability-health.spec.ts` | E2E: admin sees health widget + low-stock badge (QA — @dev-iqbal) |

### [Implementation Order — Initiative 1]

1. Create `lib/logger.ts` + tests → `npm run test:run` passes
2. Batch-replace `console.*` in 15 route files → `npm run build` passes
3. Create `/api/admin/health` endpoint → integration tests pass
4. Add health widget to admin page → renders metrics
5. Add low-stock badge to inventory page → badge appears
6. Add logging to `lib/transactionStatus.ts` → existing tests pass
7. (QA) E2E specs → `npm run test:e2e` passes

**Testing:** ≥ 6 unit, ≥ 4 integration, ≥ 1 E2E.

---

## Initiative 2 — "Safe to Open the Doors" (Abuse Protection remainder) → v0.5.0 (p1)

Goal: rate-limit discount endpoints, consolidate Voucher + PromoCode at code level, remove duplicate `/api/order/*` endpoints. (Security headers/CSRF/register/checkout/admin rate-limit already merged.)

### [Files]

| Action | File | Purpose |
|--------|------|---------|
| DONE | Security libs, headers | Already merged in `main` |
| MODIFY | `app/api/voucher/validate/route.ts` | Add rate limiting (currently unthrottled) |
| MODIFY | `app/api/promo-codes/validate/route.ts` | Add rate limiting + use unified discount |
| NEW | `lib/discount.ts` | Single `validateDiscountCode(code)` source of truth |
| MODIFY | `app/api/checkout/customer/route.ts`, `app/api/checkout/agent/route.ts` | Use unified discount helper |
| DELETE | `app/api/order/snap-token/route.ts`, `app/api/order/status/route.ts` | Duplicates of `/api/customer/order/*` |
| NEW | `__tests__/lib/discount.test.ts` | Unit tests for consolidated validation |
| NEW | `__tests__/api/discount-ratelimit.test.ts` | Rate-limit integration tests |
| NEW | `e2e/security-discount.spec.ts` | E2E: discount brute-force throttled (QA — @dev-iqbal) |

---

## Initiative 3 — "Buy More, Come Back, Tell a Friend" (Growth) → v0.5.0 (p2)

Goal: raise AOV (multi-qty), redemption (WhatsApp delivery), repeat purchase (phone lookup). Highest risk — ships last onto tested base.

### [Files]

| Action | File | Purpose |
|--------|------|---------|
| MODIFY | `prisma/schema.prisma` | Add `@@index` (Transaction, RedeemStock, lookup indexes) — tech-lead owned |
| NEW | `prisma/migrations/<ts>_add_indexes/` | Auto-generated migration |
| MODIFY | `app/api/checkout/customer/route.ts`, `app/api/checkout/agent/route.ts` | Accept `quantity`, loop atomic stock claim |
| MODIFY | `lib/stock.ts` | Batch claim helper `claimAvailableStocks(productId, count, ...)` |
| MODIFY | `components/agent/CheckoutForm.tsx` (+ customer form) | Quantity selector (1–10) |
| MODIFY | agent + customer success/order screens | Render multiple redeem links |
| NEW | `lib/whatsapp.ts` | WhatsApp delivery (mock in dev, live via env) |
| MODIFY | `app/api/midtrans/webhook/route.ts` | Fire WhatsApp on PAID |
| NEW | `app/customer/orders/page.tsx` | Phone-based order lookup page (no login) |
| NEW | `app/api/customer/orders/route.ts` | Lookup API (rate-limited, phone-scoped) |
| NEW | `lib/storage.ts` | File storage utility for guide images |
| NEW | `app/api/admin/upload/route.ts` | Admin image upload endpoint (admin-guarded) |
| MODIFY | `app/admin/inventory/page.tsx` | Image upload widget (after Initiative 1 badge merges) |
| NEW | `e2e/revenue-*.spec.ts` | E2E: multi-qty, lookup, upload (QA — @dev-iqbal) |

### [Implementation Order — Initiative 3]

1. Add `@@index` to schema + generate migration → `npx prisma validate` passes
2. Add `claimAvailableStocks` to `lib/stock.ts` → unit tests pass
3. Extend checkout schemas + routes for `quantity` (backward compatible) → integration tests pass
4. Update checkout form + success screens for qty/multi-link → UI + E2E
5. Create `lib/whatsapp.ts`; wire into webhook → mock send on PAID
6. Create `/api/customer/orders` + `/customer/orders` page → lookup works, rate-limited
7. Create `lib/storage.ts` + `/api/admin/upload` + inventory upload widget → image persists
8. Add `lib/cache.ts` + catalog caching (optional) → second load from cache
9. (QA) Write 3 revenue E2E specs → `npm run test:e2e` passes

**Testing:** ≥ 8 unit, ≥ 4 integration, ≥ 3 E2E. Backward compatible (quantity omitted → 1).

---

## Summary

| Initiative | Version | Effort | Tests | Sequencing |
|-----------|---------|--------|-------|-----------|
| 1 — Reliability | v0.4.0 | 3–4 wks | ≥ 10 + 1 E2E | First (protects MVP) |
| 2 — Safety | v0.5.0 (p1) | ~2 wks | ≥ 9 + 1 E2E | Second (reuses proxy) |
| 3 — Growth | v0.5.0 (p2) | ~3 wks | ≥ 12 + 3 E2E | Third (highest risk) |

**Version:** 2.0 | **Aligned to:** ROADMAP v2.0 | **Baseline:** v0.3.0 (Phase 1 + 2 merged)


### [Implementation Order — Initiative 2]

1. Create `lib/discount.ts` + tests → unit tests pass
2. Add rate limiting + consolidation to both validate endpoints → integration tests pass
3. Point checkout routes at unified helper → existing tests pass
4. Confirm no client references to `/api/order/*`, delete → build passes
5. (QA) E2E throttle spec → `npm run test:e2e` passes

**Testing:** ≥ 6 unit, ≥ 3 integration, ≥ 1 E2E.
