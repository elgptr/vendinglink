# VendingLink — Product & Technical Roadmap

| Field | Value |
|-------|-------|
| Title | VendingLink Roadmap |
| Version | 2.0 |
| Last Updated | 2026-09-13 |
| Current App Version | v0.3.0 |
| Target App Version | v0.5.0 (MVP Complete) |
| Framework Baseline | Next.js 16.3.4 (App Router, Node.js runtime boundary via `proxy.ts`) |

---

## How to Read This Roadmap

This roadmap is organized around **3 business outcomes**, not technical layers.
Each initiative states who it serves, the business problem it solves, and the
value it delivers.

**Progress so far:**
- ✅ Phase 1 (Testing Foundation) — test suites present in `__tests__/` + `e2e/`
- ✅ Phase 2 (Middleware & Security routing) — `proxy.ts` live with role + approval gates
- ⏭️ Remaining work reframed into 3 initiatives below.

**Framework note:** Next.js 16. Network boundary is `proxy.ts` (modern replacement for deprecated `middleware.ts`).

---

## Architecture Snapshot (Verified)

- **Monolithic full-stack Next.js 16** (App Router, Server + Client Components).
- **Node.js runtime boundary:** `proxy.ts` implements network policy:
  - Public allowlist (B2C catalog, checkout, auth)
  - Role-based routing (ADMIN `/admin/*`, AGENT `/agent/*`, CUSTOMER)
  - Unapproved-agent gate (blocks unregistered agents from transacting)
- **Data layer:** PostgreSQL + Prisma; client used directly in routes.
- **Payments:** Midtrans Snap API; webhook at `app/api/midtrans/webhook`.
- **AI:** Anthropic SDK + Google GenAI for chat, descriptions, insights.
- **Tests:** Vitest (unit + integration) + Playwright (E2E) populated.

---

## Initiative 1 — "Never Lose a Paid Order"
### Trust & Fulfillment Reliability

**Serves:** Customers · Admins · Business (revenue protection)

**Problem:** Failed Midtrans webhook or stuck PENDING order invisible. Only `console.*` exists. Revenue evaporates silently.

**Value Delivered:**
- Every paid customer gets redeem URL or team alerted within seconds.
- Admins get unified mission control: stuck orders, failed payments, low stock.
- Safe to deploy checkout changes (automated regression detection).

| Outcome | Impact |
|---------|--------|
| **Failure Visibility** | Structured JSON logging; failures surface immediately |
| **Mission Control** | `/api/admin/health` showing stuck transactions, failures, low stock |
| **Stockout Grace** | Out-of-stock → auto-offer promo/alternative, not dead end |
| **Regression Safety** | Vitest + Playwright suites gate CI releases |

**Effort:** 3–4 weeks

---

## Initiative 2 — "Safe to Open the Doors"
### Abuse Protection & Controlled Growth

**Serves:** Business · Real Agents · Admins

**Problem:** `proxy.ts` controls who gets in, but nothing throttles how hard they knock. Public endpoints exposed to spam, promo brute-forcing, registration flooding.

**Value Delivered:**
- Checkout + registration stay available under spikes or attack.
- Discount codes can't be brute-forced (margin protection).
- Confidence to run growth campaigns and scale agent onboarding.

| Outcome | Impact |
|---------|--------|
| **Abuse Throttling** | Rate limits on checkout, registration, discounts |
| **Margin Protection** | Validation hardened against brute-force/replay |
| **Browser Hardening** | Security headers (CSP, X-Frame, HSTS) at `proxy.ts` |
| **Discount Clarity** | Consolidate `voucher` + `promo-codes` into one flow |

**Effort:** 2 weeks

---

## Initiative 3 — "Buy More, Come Back, Tell a Friend"
### Conversion, Order Value & Retention

**Serves:** Customers · Agents · Business

**Problem:** Single-unit checkout, no post-purchase notification (lost URLs), no returning-customer lookup. Money left on table.

**Value Delivered:**
- Higher AOV: bulk checkout (1–10 units) = 2–5x for bulk buyers.
- Higher redemption: WhatsApp delivery = 15%+ fewer lost-URL tickets.
- Repeat revenue: phone-based order lookup (no account needed).
- Better listings: admin image upload for guides.

| Outcome | Impact |
|---------|--------|
| **Bulk Buying** | Qty selector (1–10), atomic batch claim |
| **Phone Delivery** | WhatsApp notification with redeem URL post-payment |
| **Effortless Reorders** | `/customer/orders` lookup by phone (no login) |
| **Cleaner Listings** | Admin image upload for product guides |

**Effort:** 3 weeks

---

## Sequencing & Dependencies

```
Initiative 1 (Reliability) ─────────→ Initiative 3 (Growth)
        │                                   ▲
        └──→ Initiative 2 (Safety) ────────┘
```

1. **Initiative 1 first:** Protects MVP launch.
2. **Initiative 2 next:** Reuses `proxy.ts` (low risk), unblocks growth.
3. **Initiative 3 last:** Modifies checkout (highest risk), ships onto tested base.

---

## Phase → Initiative Mapping

| Phase | Absorbs Into | Status |
|-------|--------------|--------|
| Phase 1 (Testing) | Initiative 1 + CI | ✅ |
| Phase 2 (Security) | Initiative 2 | 50% |
| Phase 3 (Observability) | Initiative 1 | ⏳ |
| Phase 4 (DB indexes) | Initiative 3 | ⏳ |
| Phase 5 (Revenue) | Initiative 3 | ⏳ |

---

## Version History

| Version | Description |
|---------|-------------|
| v0.1.0 | Foundation (Phase 1, 2) ✅ |
| v0.2.0 | Testing suite (Phase 1) ✅ |
| v0.3.0 | `proxy.ts` + auth (Phase 2) ✅ |
| v0.4.0 | Initiative 1: Observability (Phase 3) ⏳ |
| v0.5.0 | Initiatives 2 & 3: Security + Revenue (MVP) ⏳ |

---

**Roadmap v2.0 · Next.js 16.3.4 · Boundary: `proxy.ts` · Business-Centric Initiatives**
