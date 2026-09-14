# Admin Password Management Guide

## Overview
Admin password di VendingLink dapat di-set melalui seed script atau change-password script.

## Development (Local Setup)

### Cara 1: Seed Database dengan Password Random
```bash
npx prisma db seed
```
Output akan menampilkan password yang di-generate:
```
✅ Admin created: admin
   Dev password: abc123xyz789
```

### Cara 2: Seed dengan Password Spesifik
Tambahkan `SEED_ADMIN_PASSWORD` ke `.env`:
```bash
SEED_ADMIN_PASSWORD="your-secure-password"
SEED_AGENT_PASSWORD="agent-secure-password"
```
Kemudian jalankan:
```bash
npx prisma db seed
```

Output:
```
✅ Admin created: admin
   Dev password: your-secure-password
```

### Login di Development
```
URL: http://localhost:3000/login
Username: admin
Password: [sesuai seed output]
```

---

## Production Setup

### ⚠️ PENTING: Jangan Gunakan Seed di Production!
Seed script memiliki guard untuk mencegah seed di production environment:
```typescript
if (process.env.NODE_ENV === "production" || process.env.ENVIRONMENT === "production") {
  console.log("⚠️  Seed skipped in production. Use change-password.js for password changes.");
  return;
}
```

### Cara Set Password di Production
Gunakan script `scripts/change-password.js`:

```bash
node scripts/change-password.js admin newPassword123
```

**Syntax:**
```bash
node scripts/change-password.js <username> <newPassword> [database_url]
```

**Contoh:**
```bash
# Dengan DATABASE_URL dari .env
node scripts/change-password.js admin SuperSecurePassword123!

# Dengan DATABASE_URL eksplisit
node scripts/change-password.js admin SuperSecurePassword123! \
  "postgresql://user:pass@host:5432/db"
```

### Vercel Production
1. Set environment variable: `NODE_ENV=production`
2. Gunakan script change-password.js di CI/CD pipeline atau secara manual
3. Simpan password di Vercel Secrets atau password manager

---

## Akun Seed Default

### Admin Account
- **Username:** `admin`
- **Password:** Generated/Sesuai SEED_ADMIN_PASSWORD
- **Role:** ADMIN
- **Status:** Approved & Active

### Agent Account
- **Username:** `agent01`
- **Password:** Generated/Sesuai SEED_AGENT_PASSWORD
- **Role:** AGENT
- **Status:** Approved & Active

---

## Workflow Perubahan Password

### Admin Ganti Password Sendiri
Admin dapat mengubah password di `/admin/settings` page dengan form "Change Password"

**File yang relevan:**
- `components/admin/ChangePasswordForm.tsx` - UI form
- `app/api/admin/profile/change-password/route.ts` - API endpoint

### Change Password di Backend
Gunakan script untuk testing atau setup:
```bash
node scripts/change-password.js admin newPassword
```

---

## Security Best Practices

### Development
✅ Gunakan password sederhana untuk dev  
✅ Jangan commit .env dengan password ke git  
✅ Ubah password sebelum push ke production  

### Production
✅ Gunakan strong password (min 16 chars, mix case, numbers, symbols)  
✅ Simpan di password manager atau Vercel Secrets  
✅ Ubah password secara berkala  
✅ Audit log perubahan password (implementasi di TODO)  
✅ Jangan expose password di logs atau error messages  

---

## Troubleshooting

### Lupa Admin Password
1. Database lokal (dev):
   ```bash
   npx prisma db seed
   ```
   Password baru akan di-generate

2. Production:
   - Hubungi DevOps/Admin
   - Gunakan database backups
   - Reset via secure channel

### Seed Gagal
```bash
# Clear database & reseed
npx prisma migrate reset
# Atau manual
npx prisma db push
npx prisma db seed
```

### Password Hash Corruption
Jika password hash rusak:
```bash
node scripts/change-password.js admin newTemporaryPassword
```

---

## File Relevan
- `prisma/seed.ts` - Seed script
- `scripts/change-password.js` - Password change script
- `app/api/admin/profile/change-password/route.ts` - Change password API
- `components/admin/ChangePasswordForm.tsx` - Change password UI
- `.env.example` - Environment variables template

---

## Kontribusi
Jika ada saran improvement untuk password management, please open issue atau PR!
