# Product Requirement Document (PRD) - VendingLink

## 1. Project Overview

**Project Name:** VendingLink (`vending-machine-link-redeem`)  
**Type:** Web Application (B2B / Field Sales & Vending Machine Digital Redeem System)  
**Target Audience:** System Administrators and Field Sales Agents  

VendingLink is a web-based platform designed to streamline digital voucher and vending machine stock distribution. Field agents can sell digital redeem codes/links to customers using direct QRIS payments powered by Midtrans. Administrators can manage product inventories, upload redeem URL stocks in bulk via CSV, configure discount vouchers, manage field agents, and track transaction analytics in real-time. Additionally, field agents have access to an AI Sales Assistant to inquire about products and operational guidance.

---

## 2. Technology Stack & Architecture

- **Frontend Framework:** Next.js 14 (App Router, Server & Client Components)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Lucide React Icons
- **Database & ORM:** PostgreSQL, Prisma ORM
- **Authentication:** NextAuth.js (v5 Beta) with Prisma Adapter
- **Payment Gateway:** Midtrans (Snap API & QRIS Callback Handling)
- **AI Integration:** Anthropic AI SDK & Google GenAI (`@google/genai`)
- **Utilities:** `qrcode` (QR Code Generator), `papaparse` (CSV Parser), `zod` (Validation)

---

## 3. User Roles & Authentication

### 3.1 Admin (`ROLE = 'ADMIN'`)
- Full access to back-office dashboard (`/admin`).
- Manages products, stock inventory (Redeem URLs), field agents, and discount vouchers.
- Views sales reports, transaction logs, and revenue metrics.

### 3.2 Agent (`ROLE = 'AGENT'`)
- Access to agent portal (`/agent`).
- Browses available product catalog.
- Initiates orders for customers, applies voucher discounts, and generates Midtrans QRIS payment links/QR codes.
- Receives instant redeem URLs upon successful customer payment.
- Interacts with AI Assistant for quick support.

---

## 4. Core Features & Functional Requirements

### 4.1 Admin Portal (`/admin`)

1. **Dashboard & Financial Reports (`/admin/reports`)**
   - Summary cards: Total Revenue, Total Transactions, Active Agents, Available Stock.
   - Transaction list with search and filter by status (`PENDING`, `PAID`, `EXPIRED`).
   - Export reports for bookkeeping.

2. **Inventory & Stock Management (`/admin/inventory`)**
   - Create, edit, and toggle active state for products (Name, Price, Description).
   - Bulk upload redeem links/URLs via CSV file (`productId`, `redeemUrl`).
   - Track available vs claimed stock counts per product.

3. **Agent Management (`/admin/agents`)**
   - Create agent accounts with username and initial password.
   - Enable/disable agent accounts.
   - Reset agent credentials.

4. **Voucher Management (`/admin/vouchers`)**
   - Create promotional vouchers (Code, Discount Amount, Quota, Expiry Date).
   - Track voucher usage metrics (`usedCount` / `quota`).

---

### 4.2 Agent Portal (`/agent`)

1. **Product Catalog (`/agent/catalog`)**
   - Grid view of active products with price and stock availability indicator.
   - One-click order initiation.

2. **Order Checkout & Payment Flow (`/agent/order`)**
   - Customer details input (Customer Name).
   - Optional voucher code entry with real-time validation and price calculation.
   - Order creation triggering Midtrans QRIS/Snap transaction.
   - Real-time modal displaying payment QR Code / Link.

3. **Automated Redeem URL Release (`/api/midtrans`)**
   - Midtrans Webhook handler processes payment notification (`settlement` / `capture`).
   - Upon successful payment, transaction status updates to `PAID`.
   - An available `RedeemStock` is automatically assigned to the transaction and marked as `SOLD`.
   - Customer/Agent instantly gets access to the release redeem URL and QR Code.

4. **AI Sales Assistant (`/agent/chat`)**
   - Conversational AI interface for agents.
   - Answers questions regarding product details, pricing, voucher eligibility, and system guidelines.

---

## 5. Database Schema (Prisma)

```prisma
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  role         String   @default("AGENT") // 'ADMIN' | 'AGENT'
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())

  transactions  Transaction[]
  claimedStocks RedeemStock[]

  @@map("users")
}

model Product {
  id          String   @id @default(cuid())
  name        String
  price       Int
  description String?
  isActive    Boolean  @default(true)
  updatedAt   DateTime @updatedAt

  stocks       RedeemStock[]
  transactions Transaction[]

  @@map("products")
}

model RedeemStock {
  id               String    @id @default(cuid())
  productId        String
  redeemUrl        String
  status           String    @default("AVAILABLE") // 'AVAILABLE' | 'SOLD'
  claimedByAgentId String?
  customerName     String?
  claimedAt        DateTime?
  createdAt        DateTime  @default(now())

  product        Product @relation(fields: [productId], references: [id])
  claimedByAgent User?   @relation(fields: [claimedByAgentId], references: [id])

  @@map("redeem_stocks")
}

model Voucher {
  id             String    @id @default(cuid())
  code           String    @unique
  discountAmount Int
  quota          Int
  usedCount      Int       @default(0)
  isActive       Boolean   @default(true)
  expiresAt      DateTime?
  createdAt      DateTime  @default(now())

  transactions Transaction[]

  @@map("vouchers")
}

model Transaction {
  id             String    @id @default(cuid())
  orderId        String    @unique
  productId      String
  agentId        String
  voucherId      String?
  customerName   String?
  originalPrice  Int
  discountAmount Int       @default(0)
  finalAmount    Int
  status         String    @default("PENDING") // 'PENDING' | 'PAID' | 'EXPIRED'
  redeemUrl      String?
  qrString       String?
  qrCodeUrl      String?
  createdAt      DateTime  @default(now())
  paidAt         DateTime?

  product Product  @relation(fields: [productId], references: [id])
  agent   User     @relation(fields: [agentId], references: [id])
  voucher Voucher? @relation(fields: [voucherId], references: [id])

  @@map("transactions")
}
```

---

## 6. API Endpoints Specification

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/[...nextauth]` | Public | NextAuth authentication handler |
| `GET/POST` | `/api/admin/inventory` | Admin | Fetch products & bulk upload stock links |
| `GET/POST` | `/api/admin/agents` | Admin | Manage field agent accounts |
| `GET/POST` | `/api/admin/vouchers` | Admin | Manage discount vouchers |
| `POST` | `/api/checkout` | Agent | Create transaction & generate Midtrans QRIS payment |
| `POST` | `/api/voucher/validate` | Agent | Validate voucher code and compute discount |
| `POST` | `/api/midtrans` | Webhook | Process Midtrans payment notifications |
| `POST` | `/api/chat` | Agent | Interface with AI Sales Assistant |

---

## 7. Security & Non-Functional Requirements

- **Authentication & Authorization:** Secure session handling via NextAuth JWT/Prisma tokens with role-based route protection via Next.js Middleware (`middleware.ts`).
- **Data Integrity:** Database transactions ensure stock link double-claiming is prevented during concurrent orders.
- **Payment Verification:** Webhook signatures verified against Midtrans Server Key to prevent tampering.
- **Responsiveness:** Mobile-first layout for agent portal for easy use on smartphones/tablets in field environments.

---

## 8. Development Scripts

- `npm run dev`: Launch local development server.
- `npm run build`: Generate Prisma client and build Next.js application for production.
- `npm run db:migrate`: Run Prisma migrations.
- `npm run db:seed`: Seed initial admin credentials and default products.
