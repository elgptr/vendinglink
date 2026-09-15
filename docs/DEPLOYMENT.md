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


---

## 2. Vercel Deployment (Recommended)

### 2.1 Initial Setup

1. **Connect GitHub repository:**
   - Go to vercel.com → Import Project
   - Select GitHub repository
   - Authorize Vercel

2. **Build Settings Auto-Configured via `vercel.json`:**
   The repository includes a `vercel.json` file that automatically sets:
   ```json
   {
     "buildCommand": "npm run build && npx prisma migrate deploy ",
     "installCommand": "npm install --legacy-peer-deps",
     "outputDirectory": ".next",
     "env": { "NODE_ENV": "production", "ENVIRONMENT": "production" }
   }
   ```
   
   Key insight: **Migrations run automatically after build** via `npx prisma migrate deploy`.

3. **Set Environment Variables in Vercel Dashboard:**
   Navigate to Project Settings → Environment Variables and add:
   ```
   NODE_ENV = production
   ENVIRONMENT = production
   DATABASE_URL = postgresql://user:pass@pooler.region.com:6543/db?sslmode=require
   DIRECT_URL = postgresql://user:pass@host.region.com:5432/db?sslmode=require
   NEXTAUTH_SECRET = [generate: openssl rand -base64 32]
   NEXTAUTH_URL = https://your-domain.com
   NEXT_PUBLIC_APP_URL = https://your-domain.com
   NEXT_PUBLIC_MIDTRANS_CLIENT_KEY = [your midtrans key]
   MIDTRANS_SERVER_KEY = [your midtrans server key]
   MIDTRANS_IS_PRODUCTION = true
   NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION = true
   ```

4. **Deploy:** Click "Deploy" and wait for completion

### 2.2 Database Connection (Neon Recommended)

Why two database URLs? Next.js serverless functions can't hold persistent connections.

1. **Create Neon PostgreSQL database:**
   - Go to https://neon.tech
   - Create new project → copy connection strings:
   - **Pooling connection** (for app queries) → Set as `DATABASE_URL`
   - **Direct connection** (for migrations) → Set as `DIRECT_URL`

2. **In Vercel, set both URLs:**
   - `DATABASE_URL` — pooled connection (for serverless functions)
   - `DIRECT_URL` — direct connection (for `prisma migrate deploy`)

### 2.3 Custom Domain Setup

1. Vercel Dashboard → Settings → Domains

---

## 3. Database Migration Strategy

### 3.1 Why Migrations Are Version-Controlled

**CRITICAL FIX:** Migrations (`prisma/migrations/`) are now **tracked in git** because:

1. **Reproducibility:** Vercel needs schema definition to deploy
2. **Auditability:** See who changed database schema and when
3. **Rollback capability:** Revert to previous schema if needed
4. **Serverless compatibility:** Functions can't generate migrations on-the-fly

### 3.2 Creating a New Migration (After Schema Changes)

```bash
# 1. Update prisma/schema.prisma with new model/field
# 2. Generate migration
npx prisma migrate dev --name describe_your_change

# 3. Review generated SQL in prisma/migrations/[timestamp]_describe_your_change/migration.sql
# 4. Commit & push
git add prisma/migrations/
git commit -m "feat: add migration for your change"
git push origin main

# 5. Vercel auto-deploys and runs the migration on production database
```

### 3.3 Production-Safe Seed Guard

```typescript
// prisma/seed.ts
if (process.env.NODE_ENV === "production" || process.env.ENVIRONMENT === "production") {
  console.log("⚠️ Seed skipped in production.");
  return;
}
```

Running `npx prisma db seed` is safe in any environment—it auto-skips in production.

---

## 4. Production Security

### 4.1 Security Headers (Auto-Configured)

Next.js automatically adds (see `next.config.mjs`):
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: enforced
- Content-Security-Policy: strict

### 4.2 Database Security

- **Neon Cloud:** Automatic SSL + 30-day backups
- **Self-hosted:** Enable SSL, strong passwords, VPC isolation, daily backups

### 4.3 API Rate Limiting

Admin mutations are rate-limited (see `lib/adminRateLimit.ts`):
- Applied to `/api/admin/*` endpoints
- Prevents accidental/malicious bulk operations

---

## 5. Post-Deployment Verification

### 5.1 Smoke Tests

After deploying, verify:
- [ ] Homepage loads: `curl https://your-domain.com`
- [ ] Customer checkout works
- [ ] Admin login works
- [ ] API health: `curl https://your-domain.com/api/admin/health`

### 5.2 Database Verification

- [ ] Migrations applied: Check Vercel build logs for "✔ Applied migrations"
- [ ] Can query users: `psql DATABASE_URL -c "select count(*) from users;"`

### 5.3 Monitoring

- [ ] Error tracking active
- [ ] Database connected
- [ ] Payment webhook listening
- [ ] No 5xx errors

---

## 6. Troubleshooting

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| **Database lost after deploy** | Migrations not running or DATABASE_URL/DIRECT_URL not set | Check Vercel build logs. Ensure `prisma/migrations/` in git. Set both DATABASE_URL and DIRECT_URL. |
| **"Migrations pending" on deploy** | Check `vercel.json` buildCommand | Verify `vercel.json` includes `npx prisma migrate deploy` in buildCommand |
| **"Seed ran in production"** | NODE_ENV not set | Set both `NODE_ENV=production` and `ENVIRONMENT=production` in Vercel |
| **Database connection failed** | DATABASE_URL or firewall issue | Verify `DATABASE_URL` (pooling) and `DIRECT_URL` (direct). Check Neon firewall allows Vercel IPs. |
| **Admin can't login** | No admin user in production DB | Run: `DATABASE_URL="..." node scripts/change-password.js admin NewPassword123!` |
| **SSL cert invalid** | Domain not configured | Add domain in Vercel dashboard. Wait 5-10 min for cert provisioning. |
| **502 errors** | Application crash or build failure | Check Vercel build logs and application error logs. |

---

## 7. Environment Variables (Complete Reference)

### Required

```env
NODE_ENV=production
ENVIRONMENT=production
DATABASE_URL=postgresql://user:pass@pooler.region.com:6543/db?sslmode=require
DIRECT_URL=postgresql://user:pass@host.region.com:5432/db?sslmode=require
NEXTAUTH_SECRET=[32-char random string]
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=[from midtrans]
MIDTRANS_SERVER_KEY=[from midtrans]
MIDTRANS_IS_PRODUCTION=true
NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=true
```

### Optional

```env
GEMINI_API_KEY=[if using AI features]
ANTHROPIC_API_KEY=[if using AI features]
ENCRYPTION_KEY=[for encrypting AI keys, 64-char hex]
WHATSVA_DEVICE_TOKEN=[if using WhatsApp notifications]
WHATSVA_MODE=live
```

---

## 8. Scaling & Operations

### 8.1 Monitoring Performance

- **Database:** Monitor in Neon dashboard (query performance, connection count)
- **Application:** Vercel analytics (function duration, edge requests)
- **Errors:** Set up Sentry or similar for production error tracking

### 8.2 Backups

- **Neon:** Automatic daily backups (30-day retention on pro plan)
- **Manual:** `pg_dump DATABASE_URL > backup.sql` && upload to secure storage

### 8.3 Zero-Downtime Deployments

Vercel handles automatically:
1. New version deployed alongside old
2. Migrations run (schema updates only if needed)
3. Traffic routed to new version
4. Old version cleaned up

---

**Last Updated:** 2026-09-15 | **For:** DevOps Engineers & Platform Teams

2. Add domain (e.g., vendinglink.com)
3. Update DNS records per Vercel instructions
4. SSL auto-provisioned (Let's Encrypt)

### 2.4 Auto-Deployment

Every push to `main` triggers auto-deploy. PRs create preview deployments.

- [ ] Admin rate limit active (mutations only) — see `lib/adminRateLimit.ts`

### 1.3 Environment Variables
- [ ] `NODE_ENV=production` set
- [ ] `ENVIRONMENT=production` set (extra guard for seed)
- [ ] `DATABASE_URL` points to production PostgreSQL (pooling connection)
- [ ] `DIRECT_URL` points to production PostgreSQL (direct connection for migrations)
- [ ] `NEXTAUTH_URL` set to production domain (e.g., https://vendinglink.com)
- [ ] All payment keys (Midtrans) configured
- [ ] AI API keys optional (can be left blank)

### 1.4 Database
- [ ] Production PostgreSQL database created & accessible
- [ ] Migrations tracked in git: `prisma/migrations/` folder committed
- [ ] No seed run in production (disabled by NODE_ENV guard)
- [ ] Admin account created: `node scripts/change-password.js admin YourSecurePassword`
- [ ] Database backups configured
- [ ] SSL/TLS enabled on database connection

### 1.5 Monitoring
- [ ] Error tracking configured (e.g., Sentry, LogRocket)
- [ ] Uptime monitoring set up
- [ ] Logging strategy defined
