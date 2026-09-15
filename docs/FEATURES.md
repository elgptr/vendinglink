# VendingLink Features & User Flows

**Complete breakdown of all features, user roles, and workflows.**

---

## 1. User Roles & Access

### 1.1 Customer (Public / No Login)
- Browse product catalog
- Add to cart & checkout via Midtrans
- Multiple payment methods: QRIS, bank transfer, e-wallet, credit card
- No account creation needed
- Receive redeem URL after payment

### 1.2 Agent (Reseller / B2B)
- Registration via `/agent/register` → awaits admin approval
- Once approved: access `/agent` dashboard
- Browse & purchase products on credit (no payment gateway)
- Track outstanding debt & sales
- Can view redeem URLs for purchased items

### 1.3 Admin (Back-office)
- Full access to `/admin` dashboard
- Manage products (CRUD)
- Bulk upload redeem URLs via CSV
- Approve/reject agent registrations
- Track & settle agent debt
- Manage system settings & AI configuration

---

## 2. Customer Flow (B2C / Public Checkout)

### 2.1 Browse & Select Product

**Path:** `/` → Click product card

- All active products displayed
- Shows price, description, stock status
- Usage guide image preview

### 2.2 Checkout

**Path:** `/checkout` OR `/payment`

1. Enter Name (required)
2. Enter Phone (optional)
3. Apply voucher code (if available)
4. View final price after discount
5. Click "Bayar Sekarang" → Redirects to Midtrans payment

**Supported Payments:**
- QRIS
- Bank Transfer / Virtual Account (VA)
- E-wallet (GCash, OVO, DANA)
- Credit Card
- Other methods enabled in Midtrans dashboard

### 2.3 Payment Confirmation

- Midtrans popup shows payment method options
- Customer completes payment
- Webhook from Midtrans confirms payment

### 2.4 Success / Redemption

**Path:** `/payment/success`

- Display redeem URL with Copy button
- Show usage guide image
- Instructions on how to use the link


---

## 4. Admin Dashboard Features

### 4.1 Dashboard (`/admin`)

**Widgets:**
- System Health: Database status, app version, uptime
- Recent Transactions: Last 10 customer purchases
- Top Agents: By sales volume & debt
- Pending Tasks: Pending approvals, low stock alerts

### 4.2 Inventory Management (`/admin/inventory`)

#### 4.2.1 View Products

- Table of all products
- Columns: Name, Price, Stock Count, Created Date, Actions
- Filter by category (if applicable)
- Search by name

#### 4.2.2 Add Product

Form fields:
- Product name (required)
- Description (optional)
- Price (required, in Rupiah)
- Category (optional)
- Usage guide image (optional)
- SKU (optional, for tracking)

#### 4.2.3 Edit/Delete Product

- Click Edit on product → Modify fields
- Click Delete → Archive product (soft delete)
- Cannot delete if active stock exists

#### 4.2.4 Bulk Upload Redeem URLs (CSV)

**Path:** `/admin/inventory` → "Upload Stock"

Steps:
1. Prepare CSV file
2. Click Upload
3. Select file from computer
4. Preview & validate
5. Confirm upload

**CSV Format:**
```csv
productId,redeemUrl,notes
prod_001,https://example.com/code/abc123,Batch 1
prod_001,https://example.com/code/def456,Batch 1
prod_002,https://example.com/code/ghi789,Batch 2
```

### 4.3 Agent Management (`/admin/agents`)

#### 4.3.1 Pending Approvals
- List of new agent registrations
- View registration details
- Approve button → Agent gains access
- Reject button → Send rejection reason

#### 4.3.2 Approved Agents
- List of active agents
- Columns: Name, Username, Email, Sales, Debt, Status
- Click agent → View detailed profile

#### 4.3.3 Settle Agent Debt
1. Find agent in list
2. View outstanding debt amount
3. Agent transfers payment to bank
4. Click "Mark as Paid" / "Lunasi"
5. System updates debt to zero

### 4.4 Reports (`/admin/reports`)

- Sales Report: Total revenue, by product, by agent
- Agent Performance: Sales trend, debt aging, approval rate
- Stock Status: Low stock alerts
- Export: Download reports as CSV/PDF

### 4.5 Settings (`/admin/settings`)

- **Change Password:** Update admin password
- **AI Configuration:** Anthropic/Google API keys
- **System Info:** Version, environment, database status

---

## 5. Security Features

- **Authentication:** NextAuth.js v5 with Prisma adapter
- **Authorization:** Role-based access control (ADMIN, AGENT)
- **Data Protection:** CSRF tokens, rate limiting, SQL injection prevention
- **Payment Security:** Webhook signature verification

---

**Last Updated:** 2026-09-15 | **For:** Team Members

- Order reference number for support

---

## 3. Agent Flow (B2B / Reseller)

### 3.1 Agent Registration

**Path:** `/agent/register` OR `/` → "Daftar sebagai Agen"

1. Fill registration form:
   - Username (unique)
   - Password (min 8 chars)
   - Email
   - Phone number
   - Business name
   - Location (optional)

2. Submit → Awaits admin approval
3. Cannot access agent features until approved

### 3.2 Agent Login

**Path:** `/login`

- Enter username & password
- If approved: access `/agent` dashboard
- If pending approval: see "Awaiting Admin Approval" message

### 3.3 Agent Dashboard

**Path:** `/agent`

**Sections:**

| Section | Content |
|---------|---------|
| Overview | Total sales, outstanding debt, recent orders |
| Products | Browse all active products with inventory |
| Purchase | Select product → Instant checkout (credit) |
| Orders | History of all purchases & redemptions |
| Debt Status | Total owed, payment history, settlement status |

### 3.4 Agent Checkout (Credit Purchase)

1. Browse products in agent dashboard
2. Click "Pesan" on product
3. System bypasses Midtrans (credit purchase)
4. Instantly receive redeem URL + usage guide
5. Order recorded as debt to agent account
6. Admin tracks & settles debt later

### 3.5 Agent Redemption

Agent uses redeem URL to distribute to end customers (self-managed).
