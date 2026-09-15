# Production Deployment Guide

**For DevOps & deployment team — production setup, security checklist, and Vercel configuration.**

---

## 1. Pre-Deployment Checklist

Before deploying to production, verify:

### 1.1 Code & Build
- [ ] All tests passing: `npm run test:run`
- [ ] Build successful: `npm run build`
- [ ] No lint errors: `npm run lint`
- [ ] TypeScript check: `npx tsc --noEmit`
- [ ] All PRs reviewed & merged to `main`

### 1.2 Security
- [ ] `.env.production` created with production secrets
- [ ] `.env` file in `.gitignore` (never commit)
- [ ] `NEXTAUTH_SECRET` set to random 32+ char string
- [ ] `MIDTRANS_SERVER_KEY` kept private (backend only)
- [ ] No API keys or passwords hardcoded in code
- [ ] Database connection uses encrypted connection (SSL/TLS)
- [ ] Dependency audit clean: `npm audit` reports **0 vulnerabilities**
- [ ] Admin rate limit active (mutations only) — see `lib/adminRateLimit.ts`

### 1.3 Environment Variables
- [ ] `NODE_ENV=production` set
- [ ] `ENVIRONMENT=production` set (extra guard for seed)
- [ ] `DATABASE_URL` points to production PostgreSQL
- [ ] `NEXTAUTH_URL` set to production domain (e.g., https://vendinglink.com)
- [ ] All payment keys (Midtrans) configured
- [ ] AI API keys optional (can be left blank)

### 1.4 Database
- [ ] Production database created & accessible
- [ ] Migrations run: `npx prisma migrate deploy`
- [ ] No seed run in production (disabled by NODE_ENV guard)
- [ ] Admin account created: `node scripts/change-password.js admin YourSecurePassword`
- [ ] Database backups configured

### 1.5 Monitoring
- [ ] Error tracking configured (e.g., Sentry, LogRocket)
- [ ] Uptime monitoring set up
- [ ] Logging strategy defined

---

## 2. Vercel Deployment (Recommended)

### 2.1 Initial Setup

1. **Connect GitHub repository:**
   - Go to vercel.com → Import Project
   - Select GitHub repository
   - Authorize Vercel

2. **Configure Build Settings:**
   - **Framework Preset:** Next.js


---

## 4. Production Security

### 4.1 Seed Guard (Production-Safe)

```typescript
// prisma/seed.ts
if (process.env.NODE_ENV === "production") {
  console.log("⚠️  Seed skipped in production.");
  return;
}
```

Running `npx prisma db seed` in production is **safe** (will skip automatically).

### 4.2 Security Headers

Next.js automatically adds:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block

### 4.3 Database Security

- **Neon Cloud:** Automatic SSL + backups
- **Self-hosted:** Enable SSL, strong passwords, VPC isolation, automatic backups

---

## 5. Post-Deployment Verification

### 5.1 Smoke Tests

- [ ] Homepage loads: `curl https://your-domain.com`
- [ ] Customer checkout works
- [ ] Admin login works
- [ ] API health: `curl https://your-domain.com/api/admin/health`

### 5.2 Monitoring

- [ ] Error tracking active
- [ ] Database connected
- [ ] Payment webhook listening
- [ ] No 5xx errors

---

## 6. Troubleshooting

| Issue | Fix |
|-------|-----|
| Seed ran in production | Set `NODE_ENV=production` |
| Database connection failed | Verify DATABASE_URL |
| Admin can't login | `node scripts/change-password.js admin newpass` |
| SSL cert invalid | Add domain in Vercel |
| 502 errors | Check Vercel build logs |

---

## Environment Variables (Reference)

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
NEXTAUTH_SECRET=random-32-char-string
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=key
MIDTRANS_SERVER_KEY=server-key
```

---

**Last Updated:** 2026-09-15 | **For:** DevOps Engineers

   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install --legacy-peer-deps`

3. **Set Environment Variables (Vercel Dashboard):**
   ```
   NODE_ENV=production
   ENVIRONMENT=production
   DATABASE_URL=postgresql://...
   NEXTAUTH_SECRET=your-random-32-char-secret
   NEXTAUTH_URL=https://your-domain.com
   NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=key
   MIDTRANS_SERVER_KEY=server-key
   ```

4. **Deploy:** Click "Deploy" and wait for completion

### 2.2 Custom Domain Setup

1. Vercel Dashboard → Settings → Domains
2. Add domain (e.g., vendinglink.com)
3. Update DNS records per Vercel instructions
4. SSL auto-provisioned (Let's Encrypt)

### 2.3 Auto-Deployment

Every push to `main` triggers auto-deploy. PRs create preview deployments.

---

## 3. Database Migration (Production)

```bash
# Apply pending migrations
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# Create admin account
node scripts/change-password.js admin SecurePassword123!
```

**Seed Production-Safe:** Seed guard prevents accidental data wipe when `NODE_ENV=production`.
