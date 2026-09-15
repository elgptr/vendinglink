# Admin Setup & Management Guide

**This guide is for humans setting up and managing the admin account.**

---

## 1. First-Time Admin Setup (Development)

### 1.1 Automatic Setup (Easiest)

When you run seed script in development:

```bash
npx prisma db seed
```

Output will show:

```
✅ Admin account created
   Username: admin
   Dev Password: abc123xyz789
```

**Use these credentials to login at:** `http://localhost:3000/login`

### 1.2 Custom Admin Password (Development)

To set a specific password during seed:

1. **Edit `.env`:**
   ```env
   SEED_ADMIN_PASSWORD=\"MySecurePassword123\"
   SEED_AGENT_PASSWORD=\"AgentPassword456\"
   ```

2. **Run seed:**
   ```bash
   npx prisma db seed
   ```

3. **Output:**
   ```
   ✅ Admin created: admin


### 3.3 Forgot Password Recovery

**Development (Local):**
```bash
# Option 1: Reseed database (wipes all data)
npx prisma migrate reset
npx prisma db seed

# Option 2: Use CLI script
node scripts/change-password.js admin temporary-password-123
```

**Production:**
- Use CLI script above with your production DATABASE_URL
- OR contact DevOps/System Admin
- Do NOT use seed in production (has safety guard)

---

## 4. Production Admin Setup

### 4.1 Prevent Accidental Seed

Seed script has built-in production guard:

```typescript
// prisma/seed.ts
if (process.env.NODE_ENV === \"production\" || 
    process.env.ENVIRONMENT === \"production\") {
  console.log(\"⚠️  Seed skipped in production. Use change-password.js\");
  return;
}
```

**This means:**
- ✅ Safe to run `npx prisma db seed` in prod (will skip)
- ✅ Use `node scripts/change-password.js` for password changes
- ✅ No data loss risk from accidental seed

### 4.2 Initial Production Admin Setup

When deploying to production:

1. **Set environment variables in Vercel/host:**
   ```env
   NODE_ENV=production
   ENVIRONMENT=production
   NEXTAUTH_SECRET=very-random-string-here
   DATABASE_URL=postgresql://...production...
   ```

2. **Initial admin password (one-time):**
   ```bash
   # Run from your local machine with production DATABASE_URL
   node scripts/change-password.js admin SuperSecureAdminPassword123!
   ```

3. **Store password securely:**
   - ✅ Password manager (1Password, Bitwarden, etc.)
   - ✅ Vault system (HashiCorp, AWS Secrets Manager)
   - ❌ NOT in code, NOT in env vars exposed in logs

### 4.3 Regular Password Rotation

**Recommended:** Change admin password every 90 days

```bash
node scripts/change-password.js admin NewRotatedPassword789
```

---

## 5. Seed Default Accounts

When you run seed, these accounts are created:

### Admin Account
- **Username:** `admin`
- **Password:** Auto-generated or from `SEED_ADMIN_PASSWORD`
- **Role:** `ADMIN`
- **Status:** Active & Approved
- **Email:** `admin@vendinglink.local` (for dev reference)

### Agent Account
- **Username:** `agent01`
- **Password:** Auto-generated or from `SEED_AGENT_PASSWORD`
- **Role:** `AGENT`
- **Status:** Active & Approved
- **Email:** `agent01@vendinglink.local` (for dev reference)

### Sample Products
- **3 sample products** with pricing
- **No initial stock** (upload via inventory page)

---

## 6. Troubleshooting

### 6.1 Admin Can't Login

**Error:** "Invalid username or password"

**Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| Wrong password | Use change-password script to reset |
| Account not created | Run `npx prisma db seed` |
| Database not synced | Run `npx prisma migrate dev` |

### 6.2 Seed Fails

**Error:** `Unique constraint failed on the fields: (username)`

**Fix:**
```bash
# Option 1: Clear & reseed
npx prisma migrate reset

# Option 2: Delete existing admin manually via Studio
npx prisma studio
# Open UI, delete user, close
npx prisma db seed
```

### 6.3 Password Script Not Found

**Error:** `node: command not found scripts/change-password.js`

**Fix:**
```bash
# Verify file exists
ls scripts/change-password.js

# Run from project root
cd /path/to/vending-machine-link-redeem
node scripts/change-password.js admin newpass
```

---

**Last Updated:** 2026-09-15 | **For:** Team Members & Admins

      Dev password: MySecurePassword123
   ```

---

## 2. Admin Dashboard Overview

**Access:** `http://localhost:3000/admin`

Requires login as admin. Features available:

### 2.1 Dashboard (`/admin`)

- System health status
- Recent transactions
- Agent performance stats
- Quick actions (add product, manage inventory, etc.)

### 2.2 Inventory (`/admin/inventory`)

- **View products:** All active products with pricing & stock
- **Add product:** New product form
- **Edit/Delete:** Modify existing products
- **Bulk upload:** CSV upload for redeem URLs

**CSV Format for stock upload:**

```csv
productId,redeemUrl,notes
prod_001,https://example.com/code/abc123,Batch 1
prod_001,https://example.com/code/def456,Batch 1
prod_002,https://example.com/code/ghi789,Batch 2
```

### 2.3 Agents (`/admin/agents`)

- **Pending approvals:** New agent registrations awaiting approval
- **Approved agents:** Active agents with sales data & debt tracking
- **Settle debt:** Mark payments as "Lunas" (settled)

### 2.4 Settings (`/admin/settings`)

- **Change password:** Update admin password
- **AI configuration:** Configure Anthropic or Google GenAI keys
- **System info:** Database health, app version, env

---

## 3. Admin Password Management

### 3.1 Change Password (Web UI)

1. Login as admin
2. Go to `/admin/settings`
3. Find **"Change Password"** form
4. Enter current password + new password
5. Click **Save**

**File references:**
- UI: `components/admin/ChangePasswordForm.tsx`
- API: `app/api/admin/profile/change-password/route.ts`

### 3.2 Change Password (CLI Script)

For automation or emergency reset:

```bash
node scripts/change-password.js <username> <newPassword> [databaseUrl]
```

**Examples:**

```bash
# Use DATABASE_URL from .env
node scripts/change-password.js admin NewSecurePass123

# Explicit database URL
node scripts/change-password.js admin NewSecurePass123 \
  "postgresql://user:pass@host:5432/db"

# Agent account
node scripts/change-password.js agent01 AgentNewPass456
```

**Output:**
```
✅ Password updated for: admin
```
