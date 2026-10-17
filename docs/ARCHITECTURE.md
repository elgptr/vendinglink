# VendingLink Architecture & Codebase Structure

**Technical overview for developers — tech stack, file structure, naming conventions, and API endpoints.**

---

## 1. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | Next.js | 16 | React-based full-stack framework (App Router) |
| **Language** | TypeScript | 5+ | Type safety across codebase |
| **Styling** | Tailwind CSS | 3+ | Utility-first CSS framework |
| **Icons** | Lucide React | Latest | SVG icon library |
| **Database** | PostgreSQL | 13+ | Relational database (local or Neon Cloud) |
| **ORM** | Prisma | 5.22.0 | Database query builder & migrations |
| **Auth** | NextAuth.js | v5-beta | Session & JWT authentication |
| **Payments** | Midtrans | Latest | Payment gateway (QRIS, bank transfer, e-wallet, CC) |
| **AI** | Anthropic SDK | Latest | Claude integration (optional) |
| **AI** | Google GenAI | Latest | Gemini integration (optional) |
| **CSV Parser** | papaparse | Latest | CSV file parsing for bulk uploads |
| **Validation** | Zod | Latest | Runtime type validation |
| **Testing** | Vitest | Latest | Unit & integration tests |
| **E2E Testing** | Playwright | Latest | Browser automation for E2E tests |

---

## 2. Core Directory Structure

```
app/                    # Next.js App Router pages & routes
├── admin/             # Admin dashboard (ROLE=ADMIN only)
├── agent/             # Agent portal (ROLE=AGENT + isApproved=true)
├── api/               # API endpoints (JSON responses)
├── login/             # Authentication pages
└── page.tsx           # Homepage (public customer catalog)

components/            # React UI components
├── admin/             # Admin-specific components
├── agent/             # Agent-specific components
├── common/            # Reusable across all users
└── forms/             # Form components

lib/                  # Utility functions
├── auth.ts           # NextAuth config & helpers
├── middleware.ts     # Auth guards & RBAC
├── db.ts             # Prisma client
└── validators.ts     # Zod schemas

prisma/              # Database
├── schema.prisma    # Data models (single source of truth)
└── seed.ts          # Dev data (production-safe via NODE_ENV guard)

docs/                # Documentation
├── SETUP.md         # Dev environment setup
├── FEATURES.md      # Feature breakdown
├── ADMIN_GUIDE.md   # Admin account & password management
├── ARCHITECTURE.md  # THIS FILE
├── CONTRIBUTING.md  # Git & PR workflow
└── AI_CONTEXT.md    # For AI assistants
```

---

## 3. Naming Conventions

### 3.1 Files & Directories

- **Components:** `PascalCase.tsx` (e.g., `LoginForm.tsx`)
- **Utilities:** `camelCase.ts` (e.g., `hash-password.ts`)
- **API routes:** `route.ts` (Next.js requirement)
- **Pages:** `page.tsx` (Next.js requirement)
- **Layouts:** `layout.tsx` (Next.js requirement)

### 3.2 Variables & Functions

```typescript
// camelCase for variables & functions
const userName = "admin";
function validateEmail(email: string) { }

// CONSTANT_CASE for constants
const MAX_UPLOAD_SIZE = 10485760; // 10MB

// Boolean prefixes: is*, has*, can*
const isApproved = true;
const hasAccess = false;
const canEdit = true;
```

### 3.3 Database (Prisma)

- **Models:** PascalCase (e.g., `User`, `Product`, `Transaction`)
- **Fields:** camelCase (e.g., `firstName`, `createdAt`)
- **IDs:** `id String @id @default(cuid())`
- **Relations:** Singular noun (e.g., `product Product @relation(...)`)

### 3.4 API Endpoints

Pattern: `/api/{feature}/{action}`

Examples:
- `POST /api/checkout/customer` — Customer payment initiation
- `POST /api/checkout/agent` — Agent credit purchase
- `PUT /api/admin/agents/{id}/approve` — Approve agent
- `POST /api/midtrans/webhook` — Payment notification

---

## 4. API Endpoints Quick Reference

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/[...nextauth]` | — | NextAuth login/logout handler |
| POST | `/api/auth/register` | — | Agent registration |
| GET | `/api/admin/health` | ADMIN | System health check |
| GET | `/api/admin/agents` | ADMIN | List agents (pending/approved) |
| PUT | `/api/admin/agents/{id}/approve` | ADMIN | Approve new agent |
| PUT | `/api/admin/agents/{id}/settle` | ADMIN | Mark agent debt as settled |
| GET | `/api/admin/inventory` | ADMIN | List products & stock |
| POST | `/api/admin/inventory` | ADMIN | Add new product |
| PUT | `/api/admin/inventory/{id}` | ADMIN | Edit product |
| DELETE | `/api/admin/inventory/{id}` | ADMIN | Delete product |
| POST | `/api/admin/inventory/upload` | ADMIN | Bulk upload redeem URLs (CSV) |
| POST | `/api/admin/profile/change-password` | ADMIN | Change admin password |


---

## 5. Type Safety & Best Practices

### 5.1 Always Type Function Parameters & Returns

```typescript
// ✅ Good
function calculateTotal(items: Product[], taxRate: number): number {
  return items.reduce((sum, item) => sum + (item.price * taxRate), 0);
}

// ❌ Avoid `any`
function calculateTotal(items, taxRate) {
  return items.reduce((sum, item) => sum + (item.price * taxRate), 0);
}
```

### 5.2 Use Zod for Input Validation

```typescript
// lib/validators.ts
import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
});
```

### 5.3 Error Handling

```typescript
try {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
} catch (error) {
  return Response.json({ error: "Server error" }, { status: 500 });
}
```

---

## 6. Authentication & Authorization

### 6.1 NextAuth Configuration

- **Location:** `lib/auth.ts`
- **Provider:** Credentials (username + password)
- **Adapter:** Prisma with PostgreSQL


---

## 8. Testing (Vitest Framework)

```bash
# Run all tests once
npm run test:run

# Watch mode (auto-rerun)
npm run test:watch

# E2E tests (Playwright)
npm run test:e2e
```

**Test Example:**
```typescript
import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "@/lib/hash-password";

describe("Password Hashing", () => {
  it("should hash correctly", async () => {
    const hash = await hashPassword("test123");
    expect(hash).not.toBe("test123");
  });

  it("should verify correct password", async () => {
    const hash = await hashPassword("test123");
    const isValid = await comparePassword("test123", hash);
    expect(isValid).toBe(true);
  });
});
```

---

## 9. Common Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint check

# Database
npx prisma migrate dev   # Create migration
npx prisma db push       # Apply schema changes (dev)
npx prisma studio       # Open database UI

# Testing
npm run test:run         # Unit & integration tests
npm run test:e2e         # End-to-end tests

# Seeds (dev only)
npx prisma db seed      # Seed test data
```

---

---

## 7. Database Models (Prisma)

- **User:** Admin & Agent accounts (`ADMIN`, `AGENT`)
- **Product:** Digital products (`LINK`, `KODE`), category, guide
- **RedeemStock:** Individual stock codes/URLs (`AVAILABLE`, `SOLD`), source `MANUAL` or `BRIDGE`
- **Transaction:** Order records (`MIDTRANS`, `AGENT_CREDIT`, `FREE_PROMO`), status (`PENDING`, `PAID`, `EXPIRED`)
- **CustomerProductRequest:** On-demand pre-order requests with unique `trackingToken`, status (`PENDING_SOURCING`, `AGENT_PURCHASING`, `STOCKED`, `ORDERED`, `FULFILLED`)
- **Customer & CustomerCredit:** Customer records, 1-level referral system, 15-day accrual ledger
- **VoucherRule:** Scheduled promos and referee discount engine

---

## 8. Detailed Architectural Documentation

Untuk dokumentasi arsitektur sistem mendalam, silakan rujuk direktori [docs/architecture/](./architecture/README.md):
- [System Design & On-Demand Lifecycle](./architecture/system-design.md)
- [REST API Architecture](./architecture/api-architecture.md)
- [Database Schema & Data Models](./architecture/database-schema.md)
- [Tech Stack & Dependencies](./architecture/tech-stack.md)
- [Directory Structure Map](./architecture/directory-structure.md)

---

**Last Updated:** 2026-10-17 | **For:** Developers & AI Assistants

