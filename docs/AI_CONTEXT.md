# AI Context & Quick Reference

**For AI assistants (Claude, ChatGPT, Cline, etc.)**

---

## 1. Project Overview

- **Name:** VendingLink (vending-machine-link-redeem)
- **Stack:** Next.js 16, TypeScript, Prisma, PostgreSQL, Tailwind, NextAuth.js v5-beta
- **Purpose:** B2C customer + B2B agent reseller platform for digital vouchers
- **Status:** Phase 2 Complete ✅ (241 tests passing, build successful)

**Core Rule:** 100% TypeScript. No `any` types. All input validated with Zod.

---

## 2. Key Data Models

### User (Admin & Agent)
- `username` (unique), `passwordHash` (bcrypt)
- `role` "ADMIN" | "AGENT"
- `isApproved` (false = pending, agents only)
- `totalDebt` (for agents, in Rupiah)

### Product
- `name`, `price` (Rupiah), `guideImageUrl`
- `isActive`, `category`

### RedeemStock (Redeem URL)
- `redeemUrl` (unique), `status` (AVAILABLE | SOLD)
- `claimedByAgentId` (if agent purchased)

### Transaction (Order)
- `productId`, `agentId` (null for customer)
- `paymentType` (MIDTRANS | AGENT_CREDIT)
- `status` (PENDING | PAID | EXPIRED)
- `snapToken` (Midtrans reference), `redeemUrl`

---

## 3. File Structure

```
app/admin/          Admin dashboard (ADMIN role only)
app/agent/          Agent portal (AGENT + approved)
app/api/            API endpoints
components/         React UI components
lib/                Utils & helpers (auth, db, validators)
prisma/             Database schema & migrations
docs/               All documentation
```

---

## 4. API Endpoints

| POST | `/api/auth/[...nextauth]` | NextAuth login/logout |
| POST | `/api/auth/register` | Agent registration |
| GET | `/api/admin/health` | Health check (ADMIN) |
| PUT | `/api/admin/agents/{id}/approve` | Approve agent (ADMIN) |
| POST | `/api/checkout/customer` | Customer checkout (Midtrans) |
| POST | `/api/checkout/agent` | Agent credit checkout (AGENT) |
| POST | `/api/midtrans/webhook` | Payment webhook |

---

## 5. Code Rules

- **Validation:** All API input validated with Zod
- **Auth:** Admin routes check `role === "ADMIN"`, agents check `isApproved === true`
- **Database:** Use Prisma ORM (no raw SQL), avoid N+1 with `.include()`
- **Naming:** `camelCase` vars, `PascalCase` components
- **Error Handling:** Specific error types, return appropriate HTTP status codes

---

## 6. Common Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run test:run         # All tests
npm run lint             # ESLint check

npx prisma migrate dev   # Create migration
npx prisma db seed       # Seed dev data
npx prisma studio       # Database UI
```

---

## 7. Quick Task Reference

### Add API Endpoint
Create `app/api/{feature}/{action}/route.ts`:
- Validate input with Zod
- Query database with Prisma
- Return `Response.json(data)`

### Add Page
Create `app/{path}/page.tsx`:
- Check auth if protected route
- Use server component by default

### Add Component
Create `components/{section}/{Name}.tsx`:
- Type props interface
- Export as `React.FC<Props>`

### Update Database Schema
1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name "description"`

### Add Test
Create `tests/{unit|integration}/{feature}.test.ts`:
- Use Vitest (Jest-compatible)
- Run `npm run test:run`

---

## 8. Security

- No hardcoded secrets (use .env)
- All input validated (Zod)
- Prisma prevents SQL injection
- NextAuth handles CSRF
- Seed production-safe: `NODE_ENV === "production"` guard

---

**Documentation to Read:**
- [SETUP.md](./SETUP.md) — Dev environment setup
- [FEATURES.md](./FEATURES.md) — Feature breakdown
- [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) — Admin account management
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Full codebase details
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Git & PR workflow

---

**Last Updated:** 2026-09-15
