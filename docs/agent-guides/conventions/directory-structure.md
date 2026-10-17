# 📁 Directory Structure Guide

Where things live in VendingLink.

---

## 🏗️ Project Layout

```
vendinglink/
├── /app/                      Next.js app router
│   ├── /api/                 API endpoints
│   │   ├── /auth/           Authentication endpoints
│   │   ├── /admin/          Admin operations
│   │   ├── /agents/         Agent operations
│   │   ├── /bridge/         Bridge webhook & SKU mappings
│   │   ├── /customer/       Customer endpoints (orders, product-requests)
│   │   └── /checkout/       Midtrans checkout initiation
│   ├── /customer/checkout/  Checkout pages
│   ├── /pre-order/track/    Zero-login public pre-order live tracking
│   ├── layout.tsx           Root layout
│   └── page.tsx             Home page
│
├── /lib/                      Shared business logic & utilities
│   ├── audit/               Audit logging (trackingAudit.ts)
│   ├── guards/              Pre-order deduplication & stock guards (preorderGuard.ts)
│   ├── bridge/              Bridge client & topup processing (requestsClient.ts, topup.ts)
│   ├── ai.ts                AI chatbot, description gen, sales insight
│   ├── auth.ts              Authentication helpers
│   ├── auth.config.ts       NextAuth configuration
│   ├── cache.ts             Caching utilities
│   ├── csrf.ts              CSRF protection
│   ├── doku.ts              Doku payment gateway
│   ├── encryption.ts        API key encryption
│   ├── gdrive.ts            Google Drive upload
│   ├── inputValidation.ts   Input sanitization
│   ├── kasera.ts            Kasera payment gateway
│   ├── logger.ts            Structured logging
│   ├── midtrans.ts          Midtrans payment gateway
│   ├── paymentConfig.ts     Payment gateway config
│   ├── prisma.ts            Database client
│   ├── rateLimit.ts         Rate limiting
│   ├── routeProtection.ts   Route access control (public tracking bypass)
│   ├── stock.ts             Stock management
│   ├── storage.ts           File storage
│   ├── transactionStatus.ts Transaction polling, settlement & JIT handshake
│   ├── utils.ts             General utilities (getPreOrderDisplayPrices, formatRupiah)
│   └── whatsapp.ts          WhatsApp notification (SaungWA engine)
│
├── /components/               React components
│   ├── /admin/              Admin-specific UI components
│   └── /customer/           Customer-facing UI components (RequestProductModal, etc.)
│
├── /prisma/                  Database
│   ├── schema.prisma        Data schema
│   └── migrations/          Schema migrations
│
├── /__tests__/              Tests
│   ├── /lib/               Unit tests
│   ├── /api/               Integration tests
│   └── /utils/             Test utilities
│
├── /e2e/                    End-to-end tests (Playwright)
│
├── /public/                 Static assets
│
├── /docs/                   Documentation
│   ├── /guides/            Developer guides
│   ├── /agent-guides/      AI agent guides
│   ├── /architecture/      System design
│   ├── /operations/        Deployment & CI/CD
│   ├── /testing/           Testing strategy
│   ├── /initiatives/       Project phases
│   ├── /reference/         Requirements
│   └── /changelog/         Release notes
│
├── /.github/
│   └── /workflows/         CI/CD automation
│
├── package.json            Dependencies
├── tsconfig.json           TypeScript config
├── vitest.config.ts        Vitest config
├── playwright.config.ts    Playwright config
└── .env.example            Environment variables
```

---

## 🔍 Common Paths

| What | Location |
|------|----------|
| API routes | `/app/api/` |
| Business logic | `/lib/` |
| Pre-order guards | `/lib/guards/preorderGuard.ts` |
| Tracking audit | `/lib/audit/trackingAudit.ts` |
| Pre-order live tracking page | `/app/pre-order/track/[trackingToken]/` |
| Bridge client | `/lib/bridge/requestsClient.ts` |
| AI integration | `/lib/ai.ts` |
| Google Drive | `/lib/gdrive.ts` |
| Payment gateways | `/lib/midtrans.ts`, `/lib/doku.ts`, `/lib/kasera.ts` |
| Database schema | `/prisma/schema.prisma` |
| React components | `/components/` |
| Unit tests | `/__tests__/lib/` |
| Integration tests | `/__tests__/api/` |
| E2E tests | `/e2e/` |
| Documentation | `/docs/` |
| Static files | `/public/` |

---

## ✅ File Naming

| Type | Pattern | Example |
|------|---------|---------|
| API route | `route.ts` | `/app/api/admin/upload/route.ts` |
| Component | `Component.tsx` | `UserList.tsx` |
| Utility | `utility.ts` | `sanitize.ts` |
| Test | `*.test.ts` | `sanitize.test.ts` |
| Type def | `types.ts` | `Stock.ts` |
| Constant | `constants.ts` | `TIMEOUT_MS` |

---

## 📝 Adding New Files

### New API endpoint:
```
/app/api/[feature]/route.ts
```

### New utility function:
```
/lib/[feature].ts
```

### New test:
```
/__tests__/lib/[feature].test.ts  (unit)
/__tests__/api/[feature].test.ts  (integration)
/e2e/[feature].spec.ts            (E2E)
```

---

**See Also:** [Naming Conventions](./naming-conventions.md)
