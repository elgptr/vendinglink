# Implementation Plan — VendingLink Initiative 1 (v0.1 → v0.5)

**Version:** 1.0 | **Date:** 2026-09-11 | **Duration:** 7–9 weeks

---

## Phase 1: Testing Foundation (v0.2.0) — 2 weeks

**Team:** Elang (Unit), Jiwo (Integration), Iqbal (E2E)

**Deliverables:**
- Vitest + Playwright setup (`vitest.config.ts`, `playwright.config.ts`)
- 20+ unit tests (`__tests__/lib/stock.test.ts`, `transactionStatus.test.ts`, `utils.test.ts`)
- 14+ integration tests (`__tests__/api/checkout-customer.test.ts`, `checkout-agent.test.ts`, `webhook.test.ts`)
- 2+ E2E specs (`e2e/customer-happy-path.spec.ts`, `agent-happy-path.spec.ts`)
- CI updated: build → lint → test

**Acceptance:** `npm test` + `npx playwright test` pass

---

## Phase 2: Middleware & Security (v0.3.0) — 1–2 weeks

**Lead:** Jiwo

**Deliverables:**
- Rate limiting (10 req/min on `/api/checkout/`, `/api/admin/`)
- Security headers (CSP, X-Frame-Options, HSTS)
- CSRF tokens on all forms
- Input sanitization (SQL/HTML injection protection)
- 2+ E2E security tests

---

## Phase 3: Observability (v0.3.5) — 1–2 weeks

**Lead:** Elang

**Deliverables:**
- Structured logger (`lib/logger.ts`) — replace 15+ `console.log()` calls
- Health check endpoint (`app/api/admin/health/route.ts`)
- Low-stock badge on inventory page
- 2+ E2E observability tests

---

## Phase 4: Database Performance (v0.4.0) — 1 week

**Lead:** Jiwo

**Deliverables:**
- 4+ composite indexes in `prisma/schema.prisma`
- Caching utility (`lib/cache.ts`) with product catalog + transaction caching
- Query optimization audit (add select directives)
- Migration: `npx prisma migrate dev --name add_performance_indexes`

---

## Phase 5: Revenue Features (v0.5.0) — 2 weeks

**Lead:** Jiwo, Iqbal

**Deliverables:**
- Multi-qty checkout (1–10 units)
- WhatsApp notification (`lib/whatsapp.ts`)
- Customer order lookup (`app/customer/orders/page.tsx`, `/api/customer/orders`)
- Image upload for product guides (`app/api/admin/upload`, `lib/storage.ts`)
- 3+ E2E revenue tests

---

## Test Summary

| Phase | Unit | Integration | E2E | Total |
|-------|------|-------------|-----|-------|
| 1 | 20+ | 14+ | 2+ | 36+ |
| 2 | 5+ | 8+ | 2+ | 15+ |
| 3 | 3+ | 5+ | 2+ | 10+ |
| 4 | 2+ | 4+ | — | 6+ |
| 5 | 3+ | 6+ | 3+ | 12+ |

**Total:** 79+ tests

---

## Dependencies

Phase 1 ← Track C merge
Phase 2 ← Phase 1 ✅
Phase 3 ← Phase 2 ✅
Phase 4 ← Phase 2 ✅ (parallel with Phase 3)
Phase 5 ← Phase 3 ✅

---

## Developer Assignments

| Dev | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|-----|---------|---------|---------|---------|---------|
| Elang | Unit + Vitest | Security tests | Logger | Cache | Revenue |
| Jiwo | Integration + Prisma | Middleware | Integration ext | Indexes | WhatsApp + multi-qty |
| Iqbal | E2E + Playwright | E2E security | E2E observability | — | Upload + E2E |

---

**Implementation Plan v1.0 | 2026-09-11**
