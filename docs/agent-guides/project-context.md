# 🔍 Project Context: Tech Stack & Architecture

Essential context for understanding VendingLink.

---

## 🏗️ What VendingLink Does

VendingLink is a **vending machine management system** that enables:
- Agents to claim available stock
- Admins to manage inventory & uploads
- Customers to browse & purchase items
- Real-time stock synchronization

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript (strict mode)
- **Styling:** TailwindCSS
- **Forms:** React Hook Form + Zod validation

### Backend
- **Runtime:** Node.js
- **Language:** TypeScript (strict mode)
- **ORM:** Prisma (database abstraction)
- **Database:** PostgreSQL
- **Authentication:** NextAuth.js

### Testing
- **Unit & Integration:** Vitest
- **E2E:** Playwright
- **Coverage Target:** >80%

### DevOps
- **Version Control:** Git + GitHub
- **CI/CD:** GitHub Actions
- **Deployment:** Vercel (frontend) + Cloud Run (backend)

---

## 📦 Key Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| Next.js | React framework | 14.x |
| TypeScript | Type safety | 5.x |
| Prisma | Database ORM | 5.x |
| NextAuth.js | Authentication | 4.x |
| Zod | Schema validation | 3.x |
| Vitest | Test framework | 1.x |
| Playwright | E2E testing | 4.x |

---

## 🗄️ Database Schema

### Core Tables
- **users** — App users (admin, agent, customer)
- **stock** — Inventory items
- **orders** — Purchases & claims
- **uploads** — CSV imports for stock data

### Key Relationships
```
User → Orders (one-to-many)
User → StockClaims (one-to-many)
Stock → Orders (many-to-many)
```

See full schema: [Database Schema](../../architecture/database-schema.md)

---

## 🌐 API Structure

### Public Endpoints
```
GET  /api/health          — Health check
GET  /api/stock           — List available stock
POST /api/auth/signin     — Login
POST /api/auth/signout    — Logout
```

### Agent Endpoints
```
POST /api/agents/checkout — Claim stock
GET  /api/agents/orders   — View orders
```

### Admin Endpoints
```
POST /api/admin/upload    — Upload CSV
GET  /api/admin/users     — List users
POST /api/admin/approve   — Approve claims
```

---

## 🔐 Authentication

- **Method:** NextAuth.js with email/password
- **Sessions:** JWT + database
- **Roles:** ADMIN, AGENT, CUSTOMER
- **Role-based Access:** Middleware enforces per route

---

## 📁 Project Structure

```
/app/api              — API routes (Next.js App Router)
/lib                  — Business logic & utilities
/prisma              — Database schema & migrations
/__tests__            — Unit & integration tests
/e2e                 — End-to-end tests
/docs                — Documentation
```

See detailed layout: [Directory Structure](../conventions/directory-structure.md)

---

## 🔄 Data Flow

### Checkout Flow (Agent)
```
1. Agent selects stock (qty 1-10)
2. POST /api/agents/checkout {stockId, quantity}
3. API validates & claims stock atomically
4. Order created in database
5. Response sent with order ID
6. Frontend confirms
```

### Upload Flow (Admin)
```
1. Admin uploads CSV with stock data
2. POST /api/admin/upload {csvFile}
3. API parses CSV & validates data
4. Stock records created/updated
5. Existing orders notified
6. Response sent with summary
```

---

## 🚀 Key Architecture Decisions

| Decision | Why |
|----------|-----|
| Next.js App Router | Modern, type-safe, built-in API routes |
| Prisma ORM | Type-safe DB queries, migrations |
| Zod validation | Runtime validation + TypeScript types |
| Vitest + Playwright | Fast testing, good DX |
| NextAuth.js | Industry standard, well-maintained |
| PostgreSQL | Reliable, ACID transactions |

---

## 📊 Performance Characteristics

- **Stock query:** <100ms (indexed)
- **Checkout:** <500ms (atomic transaction)
- **CSV upload:** <2s (per 1000 rows)
- **Test suite:** <30s (full run)

---

## 🔒 Security Features

- ✅ Password hashing (bcrypt)
- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection (React escaping)
- ✅ CSRF tokens (NextAuth)
- ✅ Role-based access control
- ✅ Environment variable secrets

---

## 🧪 Testing Coverage

| Layer | Tool | Target |
|-------|------|--------|
| Unit | Vitest | >80% |
| Integration | Vitest | >80% |
| E2E | Playwright | Critical paths |

---

## 📈 Scaling Considerations

- **Database:** Connection pooling with PgBouncer
- **API:** Horizontal scaling via replicas
- **Caching:** Redis for session/stock data
- **CDN:** Cloudflare for static assets

---

## 🎯 Development Workflow

1. Create feature branch
2. Write tests first (TDD)
3. Implement feature
4. All tests pass locally
5. Create PR
6. Code review
7. CI checks pass
8. Merge to main
9. Deploy via GitHub Actions

---

## 📞 Learning Resources

- **Next.js:** https://nextjs.org/docs
- **Prisma:** https://www.prisma.io/docs
- **Vitest:** https://vitest.dev
- **Playwright:** https://playwright.dev
- **TypeScript:** https://www.typescriptlang.org/docs

---

**See Also:** [System Design](../../architecture/system-design.md) | [API Architecture](../../architecture/api-architecture.md)
