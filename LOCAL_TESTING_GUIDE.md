# 🚀 LOCAL TESTING GUIDE - VendingLink

**Step-by-step guide to run and test VendingLink locally.**

---

## ✅ Current Status

### Database & Seed
- ✅ **Database:** PostgreSQL Neon connected
- ✅ **Schema:** All tables created
- ✅ **Seeded:** Admin, Agent, Products, Stock links, Vouchers

### Test Accounts (Just Created)

| Role | Username | Password | Purpose |
|------|----------|----------|---------|
| **Admin** | `admin` | `0.nbxe1bjaix` | Admin dashboard |
| **Agent** | `agent01` | `.r42sahjc2cc` | Agent portal |
| **Customer** | — | No login | Public checkout |

### Seeded Data
- ✅ 1 Admin (active)
- ✅ 1 Agent (approved)
- ✅ 1 Product
- ✅ 5 Stock links
- ✅ 1 Voucher

---

## 🎯 QUICK START

### Terminal 1: Start Dev Server

```bash
cd D:\Tools\Antigrav
npm run dev
```

Wait for:
```
✓ Ready in 1.5s
○ Localhost:3000
```

### Browser: Access Application

- **Homepage:** http://localhost:3000
- **Login:** http://localhost:3000/login
- **Admin:** http://localhost:3000/admin
- **Agent:** http://localhost:3000/agent

---

## 🧪 Testing Scenarios

### Scenario 1: Customer Checkout (Public)

1. Go to http://localhost:3000
2. See product card
3. Click "Buy" or product name
4. Enter Name, Phone
5. Click "Continue to Payment"
6. Should show Midtrans or payment form

**Success if:** Checkout page loads without errors

### Scenario 2: Admin Login & Dashboard

1. Go to http://localhost:3000/login
2. Username: `admin`
3. Password: `0.nbxe1bjaix`
4. Click "Login"
5. Should see dashboard

**Success if:** Redirects to `/admin` without errors

### Scenario 3: Admin Features

**Inventory Page** (`/admin/inventory`)
- [ ] Product list visible
- [ ] Edit/Delete buttons work
- [ ] Stock count shows

**Agents Page** (`/admin/agents`)
- [ ] agent01 in list
- [ ] Status: Approved
- [ ] Sales data visible

**Settings Page** (`/admin/settings`)
- [ ] Change Password form present
- [ ] AI config section present
- [ ] System Info visible

### Scenario 4: Agent Login & Portal

1. Go to http://localhost:3000/login
2. Username: `agent01`
3. Password: `.r42sahjc2cc`
4. Click "Login"
5. Should see agent dashboard

**In Agent Dashboard:**
- [ ] Sales overview visible
- [ ] Product list visible
- [ ] Order history visible
- [ ] Debt status shows

---

## 🔧 Database Inspection

Open Prisma Studio:

```bash
npm run db:studio
```

Access: http://localhost:5555

**Verify in Prisma Studio:**
- [ ] User table: admin + agent01
- [ ] Product table: 1 product
- [ ] RedeemStock table: 5 links
- [ ] Voucher table: 1 voucher
- [ ] Transaction table: (for checkout records)

---

## 🔐 Security Tests

### Test 1: CSRF Protection
- Form submits should include CSRF token
- Invalid token → form fails

### Test 2: Password Change
1. Logged in as admin
2. Go to `/admin/settings`
3. Change password to `NewPassword123`
4. Logout
5. Login with new password
- **Should succeed** with new password

### Test 3: Role-Based Access
1. Logged in as agent01
2. Try to access `/admin`
3. **Should redirect to /login** (access denied)

---

## 📊 API Tests (curl/Postman)

### Health Check

```bash
curl http://localhost:3000/api/admin/health
```

Expected: `{ "status": "healthy", "database": "connected" }`

### Checkout (Simulated)

```bash
curl -X POST http://localhost:3000/api/checkout/customer \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod_xxx","customerName":"Test","customerPhone":"+62812345678"}'
```

---

## ✨ Visual Checklist

- [ ] Homepage renders without errors
- [ ] Product catalog displays
- [ ] Navigation bar works
- [ ] Footer displays
- [ ] Forms validate input
- [ ] Error messages clear
- [ ] Admin pages load
- [ ] Agent pages load
- [ ] Mobile-friendly layout

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| Port 3000 in use | `npm run dev -- -p 3001` |
| Can't connect database | Check `.env` DATABASE_URL |
| Prisma Client missing | `npx prisma generate` |
| Login fails | Verify credentials above |
| Admin access denied | Check you're logged in as admin |
| "Build not found" error | Run `npm run build` |

---

## 📋 Final Checklist

- [ ] Dev server starts: `npm run dev`
- [ ] Homepage loads: http://localhost:3000
- [ ] Admin login works: credentials above
- [ ] Admin dashboard displays
- [ ] Inventory page works
- [ ] Agents page works
- [ ] Settings page works
- [ ] Agent login works
- [ ] Agent dashboard displays
- [ ] Database connected (Prisma Studio)
- [ ] No console errors in browser
- [ ] No errors in terminal

---

**Status:** ✅ **READY TO TEST** | **Seed Date:** 2026-09-15

**Next:** Run `npm run dev` and test!
