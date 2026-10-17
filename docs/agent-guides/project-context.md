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
- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript (strict mode)
- **Styling:** TailwindCSS
- **Forms:** React Hook Form + Zod validation

### Backend
- **Runtime:** Node.js
- **Language:** TypeScript (strict mode)
- **ORM:** Prisma (database abstraction)
- **Database:** PostgreSQL
- **Authentication:** NextAuth.js v5 (beta)
- **AI Integration:** OpenAI-compatible API (configurable: OpenRouter, 9Router, dll)
- **Cloud Storage:** Google Drive API (optional, untuk export laporan)

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
| Next.js | React framework | 16.x |
| TypeScript | Type safety | 5.x |
| Prisma | Database ORM | 5.x |
| NextAuth.js | Authentication | 5.x (beta) |
| Zod | Schema validation | 3.x |
| Vitest | Test framework | 5.x |
| Playwright | E2E testing | 1.x |
| googleapis | Google Drive API | 182.x |
| @anthropic-ai/sdk | Anthropic SDK (opsional) | 0.123.x |
| @google/genai | Google AI SDK (opsional) | 2.x |

---

## 🗄️ Database Schema

### Core Tables
- **users** — App users (admin & agent), role: `ADMIN` | `AGENT`
- **products** — Produk digital (LINK | KODE), dengan harga, deskripsi, panduan penggunaan
- **redeem_stocks** — Item stok individual (URL/kode), status: `AVAILABLE` | `SOLD`, source: `MANUAL` | `BRIDGE`
- **transactions** — Riwayat transaksi, payment: `MIDTRANS` | `AGENT_CREDIT` | `FREE_PROMO`
- **customer_product_requests** — Permintaan pre-order on-demand saat stok habis, token pelacakan publik unik, status pencarian agen (`PENDING_SOURCING`, `AGENT_PURCHASING`, `STOCKED`, `ORDERED`, `FULFILLED`)
- **supplier_product_mappings** — Relasi mapping SKU supplier upstream dengan katalog produk Storefront
- **voucher_rules** — Aturan promo terjadwal & referee discount engine baru
- **referral_codes** — Kode referral pelanggan (1 level, reward komisi)
- **customer_credits** — Buku besar komisi referral & refund stockout (`ACCRUED` ➔ `PAYABLE` 15 hari)
- **payout_batches** — Batch pencairan payout komisi referral (GoPay/OVO manual transfer)
- **vouchers** — Kode diskon legacy (dalam masa transisi & unifikasi laporan)
- **promo_codes** — Kode promo kompensasi saat stok habis (`STOCKOUT_REFUND`)
- **ai_configurations** — Konfigurasi AI provider (baseUrl, apiKey, model)
- **google_drive_configs** — Konfigurasi Google Drive untuk export laporan

### Key Relationships
```
User → Transactions (one-to-many)
User → RedeemStock via claimedByAgentId (one-to-many)
Product → RedeemStock (one-to-many)
Product → Transactions (one-to-many)
Product → CustomerProductRequest (one-to-many)
Customer → ReferralCode (one-to-one)
Customer → CustomerCredit (one-to-many)
PayoutBatch → CustomerCredit (one-to-many)
VoucherRule → VoucherRedemption (one-to-many)
```

See full schema: [Database Schema](../architecture/database-schema.md)

---

## 🌐 API Structure

### Public Endpoints
```
GET  /api/health                                — Health check
POST /api/auth/signin                           — Login
POST /api/auth/signout                          — Logout
POST /api/chat                                  — AI chatbot (customer & agent)
POST /api/checkout/customer                     — Checkout customer (Midtrans / FREE_PROMO, support ?requestId=...)
GET  /api/customer/orders                       — Challenge 5 opsi produk untuk riwayat pesanan
POST /api/customer/orders                       — Verifikasi jawaban & rilis riwayat pesanan
GET  /api/customer/order/status                 — Cek status pesanan pembeli
POST /api/customer/product-requests             — Pengajuan pre-order on-demand baru (guard: 1 per phone & stock redirect)
GET  /api/customer/product-requests/track/:tok  — Live tracking status publik (supplier HPP & code redacted)
GET  /api/promos/active                         — Polling promo & voucher aktif
```

### Bridge Integration Endpoints (M2M Bearer)
```
POST /api/bridge/webhook/request-update         — Menerima pembaruan status pencarian dari Hermes Bridge
POST /api/bridge/webhook/stock/topup            — Injeksi stok otomatis hasil pembelian agen ke RedeemStock
POST /api/bridge/mappings                       — Manajemen pemetaan SKU produk supplier
```

### Agent Endpoints
```
POST /api/agents/checkout                       — Checkout produk (Midtrans/Agent Credit)
GET  /api/agents/orders                         — View orders
```

### Admin Endpoints
```
GET/POST  /api/admin/products                   — CRUD produk
POST      /api/admin/products/generate-description — Generate AI description
GET/POST  /api/admin/stock                      — Upload & manage redeem stock (CSV)
GET       /api/admin/reports                   — Laporan transaksi + diskon terpadu & export CSV
POST      /api/admin/reports/insight           — AI sales insight (streaming)
GET/POST  /api/admin/voucher-rules              — Manage aturan promo & voucher berjadwal
GET/POST  /api/admin/vouchers                  — Manage voucher (legacy)
GET/POST  /api/admin/payout-batches             — Generate & riwayat batch payout referral
GET       /api/admin/payout-batches/summary      — Ringkasan kredit referrer & tracking 15 hari
POST      /api/admin/payout-batches/{id}/paid   — Konfirmasi transfer manual selesai
GET/POST  /api/admin/ai-config                 — Konfigurasi AI provider
POST      /api/admin/ai-config/test            — Test koneksi AI
GET/POST  /api/admin/google-drive-config       — Konfigurasi Google Drive
DELETE    /api/admin/cleanup                   — Cleanup data lama
GET/POST  /api/admin/users                     — Manage users & approval agent
```

---

## 🔐 Authentication

- **Method:** NextAuth.js with email/password
- **Sessions:** JWT + database
- **Roles:** ADMIN, AGENT, CUSTOMER
- **Role-based Access:** Middleware enforces per route
- **Public Routes Bypass:** Rute `/pre-order/track/[trackingToken]` dan API `/api/customer/product-requests/track/*` bebas autentikasi.

---

## 📁 Project Structure

```
/app/api              — API routes (Next.js App Router)
/app/pre-order        — Halaman pelacakan pre-order live
/components           — React components (admin/, customer/)
/lib                  — Business logic, guards, audit, & utilities
/prisma               — Database schema & migrations
/__tests__            — Unit & integration tests
/e2e                  — End-to-end tests
/docs                 — Documentation
```

See detailed layout: [Directory Structure](../architecture/directory-structure.md)

---

## 🔄 Data Flow

### On-Demand Pre-Order & Live Tracking Flow (Sprint P2a)
```
1. Customer clicks "Request Produk ini" on empty product card
2. RequestProductModal validates & normalizes phone (628xxx)
3. POST /api/customer/product-requests:
   - Evaluates preorderGuard (max 1 active pre-order per phone & in-stock redirect)
   - Generates unique trackingToken (trk_...) & records audit log
   - Dispatches request to Hermes Bridge with opaque customerRef
   - Sends instant WhatsApp notification with tracking link via SaungWA
4. Customer tracks progress live at /pre-order/track/[trackingToken]
   - API redacts supplier cost (quotedPrice) & supplier code (RZK)
   - Displays catalog price with 40% strikethrough marketing anchor
   - Displays agent status labeled as "bagian Purchasing kami"
5. When Bridge finds stock (status STOCKED):
   - WhatsApp alert notifies customer that stock is ready
   - Tracking page renders prominent "BELI SEKARANG" CTA
6. Customer checks out (/customer/checkout/[productId]?requestId=...):
   - Local stock validation is bypassed for valid STOCKED requestId
   - Order links requestId to Transaction.orderId
   - Customer pays catalog selling price product.price (protecting merchant margin)
7. On payment PAID (Midtrans webhook):
   - Asynchronously triggers JIT procurement handshake confirmBridgeRequest(requestId)
   - Fulfills request & logs tracking audit event
```

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
| NextAuth.js v5 | Industry standard, well-maintained |
| PostgreSQL | Reliable, ACID transactions |
| OpenAI-compatible API | Fleksibel: support OpenRouter, 9Router, OpenAI, dll |
| Google Drive API | Export laporan otomatis ke Drive admin |

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

## 🤖 AI System

- **Provider:** OpenAI-compatible API (configurable per deployment)
- **Konfigurasi:** Disimpan di DB (`AIConfiguration` model), bisa diubah via admin UI tanpa redeploy
- **Default:** `https://api.openai.com/v1` dengan model `gpt-4o-mini`
- **Custom:** Support OpenRouter, 9Router, txsiber, atau provider apapun yang compatible dengan OpenAI Chat Completions API
- **Fitur:**
  - `askChatbot()` — Chat assistant untuk customer & agent (`lib/ai.ts`)
  - `generateProductDescription()` — AI generate deskripsi produk
  - `streamSalesInsight()` — Analisis penjualan dengan streaming SSE
- **API Key:** Dienkripsi sebelum disimpan di DB (`lib/encryption.ts`)

---

## ☁️ Google Drive Integration

- **Tujuan:** Export laporan transaksi (CSV) otomatis ke Google Drive admin
- **Konfigurasi:** Service Account (`clientEmail` + `privateKey`) + Folder ID, disimpan di DB
- **Library:** `googleapis` v182.x
- **File:** `lib/gdrive.ts` → `uploadCsvToDrive(filename, csvContent)`
- **Trigger:** Tombol "Export ke Drive" di halaman Reports admin
- **Status:** Opsional — jika tidak dikonfigurasi, export ke Drive dinonaktifkan

---

## 🛡️ On-Demand Pre-Order & Supplier Privacy Invariants (Sprint P2a)

Aturan arsitektur kritis yang **WAJIB** dipatuhi oleh seluruh developer dan AI coding agents:

1. **Zero-Exposure Supplier Policy (HPP & Identitas):**
   - Kolom `quotedPrice` (harga modal supplier), `foundSupplierCode` (e.g. `RZK`), dan `foundProductId` (SKU supplier) **DILARANG KERAS** diekspos ke antarmuka atau API publik.
   - Endpoint `GET /api/customer/product-requests/track/:token` menyaring dan meredaksi data supplier sebelum response dikirim.
2. **Gross Profit Preservation (Penetapan Harga Customer):**
   - Customer yang melakukan checkout pre-order **SELALU** ditagih harga jual katalog (`product.price`).
   - Jangan pernah menagih customer menggunakan `quotedPrice` (modal supplier).
3. **Pemanis Marketing (Anchor Diskon 40%):**
   - Helper `getPreOrderDisplayPrices` (`lib/utils.ts`) menghitung harga coret acuan secara konsisten dengan markup diskon 40%.
4. **Branding Agen Customer-Facing:**
   - Seluruh teks dan notifikasi ke customer wajib menggunakan identitas **"bagian Purchasing kami"**.
   - Nama teknis internal seperti "Hermes", "Hermes Agent", atau istilah AI prompt **TIDAK BOLEH** tampil ke customer.
5. **Anti-Abuse Pre-Order Guards (`lib/guards/preorderGuard.ts`):**
   - **Maksimal 1 pre-order aktif per nomor WhatsApp:** Cegah spam pengadaan berulang.
   - **In-stock redirect:** Jika stok fisik `RedeemStock` untuk produk tersebut sudah tersedia, tolak pre-order dan arahkan pembeli langsung ke checkout.
6. **Zero-Stock Checkout Bypass:**
   - Pemeriksaan ketersediaan stok lokal di `/api/checkout/customer` hanya boleh dilewati jika `requestId` valid, berstatus `STOCKED`, cocok dengan `productId`, dan belum memiliki `orderId`.

---

**See Also:** [System Design](../architecture/system-design.md) | [API Architecture](../architecture/api-architecture.md) | [Database Schema](../architecture/database-schema.md)

**Last Updated:** 2026-10-17

