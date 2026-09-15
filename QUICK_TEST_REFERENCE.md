# 🎯 QUICK REFERENCE - VendingLink Local Testing

**Print this or keep open while testing!**

---

## ⚡ START HERE

```bash
# Terminal
cd D:\Tools\Antigrav
npm run dev

# Browser
http://localhost:3000
```

---

## 🔑 Login Credentials

| Role | Username | Password | Portal |
|------|----------|----------|--------|
| 👨‍💼 Admin | `admin` | `0.nbxe1bjaix` | http://localhost:3000/admin |
| 👤 Agent | `agent01` | `.r42sahjc2cc` | http://localhost:3000/agent |
| 👥 Customer | — | No login | http://localhost:3000 |

---

## 🌐 Key URLs

| Page | URL | Notes |
|------|-----|-------|
| Homepage | http://localhost:3000 | Public, no login |
| Login | http://localhost:3000/login | For admin/agent |
| Admin Dashboard | http://localhost:3000/admin | Admin only |
| Inventory | http://localhost:3000/admin/inventory | Product list |
| Agents | http://localhost:3000/admin/agents | Approve/manage agents |
| Settings | http://localhost:3000/admin/settings | Change password, AI config |
| Agent Portal | http://localhost:3000/agent | Agent dashboard |
| Database UI | http://localhost:5555 | Run: `npm run db:studio` |

---

## 📋 Commands

```bash
# Start dev server
npm run dev

# Build app
npm run build

# Run tests
npm run test

# Run tests (headless)
npm run test:run

# E2E tests
npm run test:e2e

# View database
npm run db:studio

# Seed database
npm run db:seed

# Lint code
npm run lint
```

---

## ✅ Quick Test Flow

### 1️⃣ Customer Flow (No Login)
- [ ] Visit http://localhost:3000
- [ ] See product
- [ ] Click buy
- [ ] Enter name/phone
- [ ] Checkout works

### 2️⃣ Admin Flow
- [ ] Visit http://localhost:3000/login
- [ ] Login: `admin` / `0.nbxe1bjaix`
- [ ] See admin dashboard
- [ ] Click Inventory → products visible
- [ ] Click Agents → agent01 visible

### 3️⃣ Agent Flow
- [ ] Visit http://localhost:3000/login
- [ ] Login: `agent01` / `.r42sahjc2cc`
- [ ] See agent dashboard
- [ ] Products visible
- [ ] Can order products

---

## 🗄️ Database Inspection

```bash
# Open Prisma Studio (database UI)
npm run db:studio

# Then visit: http://localhost:5555
```

**Check:**
- User table: 2 records (admin, agent01)
- Product table: 1 record
- RedeemStock table: 5 records
- Voucher table: 1 record

---

## 🔒 Security Checklist

- [ ] Forms have CSRF tokens
- [ ] Agent cannot access `/admin`
- [ ] Password change works
- [ ] Logout clears session
- [ ] Database connection secure

---

## 🐛 Troubleshooting

**Port 3000 in use?**
```bash
npm run dev -- -p 3001
```

**Database not connecting?**
```bash
# Check .env file has DATABASE_URL
# Or run:
npx prisma db push
```

**Rebuild needed?**
```bash
npm run build
```

**Tests failing?**
```bash
npm run test:run
```

---

## 📊 Test Credentials Decoded

**Admin Account:**
- Username: `admin`
- Password: `0.nbxe1bjaix` ← 12-char random (dev only!)
- Role: Full access to admin panel

**Agent Account:**
- Username: `agent01`
- Password: `.r42sahjc2cc` ← 12-char random (dev only!)
- Role: Agent portal access, make credit purchases
- Status: Approved (ready to use)

**⚠️ PRODUCTION NOTE:**
Change all passwords before deploying!

---

## 📱 Browser Console Tips

Press F12 in browser → Console tab

**Check for errors:**
- No red errors = good
- Red XHR errors = API issue
- Red JS errors = app issue

**Check network:**
- Network tab → ensure all requests 200 OK
- If 401/403 → authentication issue

---

## 🎯 What to Test

### Must Work
- [ ] App starts without errors
- [ ] All pages load
- [ ] Admin can login
- [ ] Agent can login
- [ ] Database connected
- [ ] Buttons clickable
- [ ] Forms submit

### Nice to Have
- [ ] Mobile responsive
- [ ] All links work
- [ ] Images load
- [ ] No console warnings
- [ ] Fast page load

---

## 📞 Still Stuck?

**Check docs:**
- `docs/SETUP.md` — Setup guide
- `docs/ARCHITECTURE.md` — Code structure
- `docs/ADMIN_GUIDE.md` — Admin operations
- `LOCAL_TESTING_GUIDE.md` — Detailed testing

---

**Last Updated:** 2026-09-15 | **Status:** ✅ READY

**Ready?** 👉 Run: `npm run dev`
