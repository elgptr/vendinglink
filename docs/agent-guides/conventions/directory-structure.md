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
│   │   └── /utils/          Shared API utilities
│   ├── layout.tsx           Root layout
│   └── page.tsx             Home page
│
├── /lib/                      Shared business logic
│   ├── stock.ts             Stock management
│   ├── storage.ts           File storage
│   ├── auth.ts              Authentication
│   ├── db.ts                Database client
│   └── utils.ts             Utilities
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
| Database schema | `/prisma/schema.prisma` |
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
