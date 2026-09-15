# 🔧 Database Disappearance on Vercel - ROOT CAUSE & FIX

## Problem
Database lost/reset every time app deployed to Vercel.

## Root Cause (3 Issues)
1. **`prisma/migrations/` ignored** — Migrations folder not tracked in git
2. **Build script didn't migrate** — `npm run build` generated Prisma client + built Next.js, but didn't run `prisma migrate deploy`
3. **No Vercel post-build config** — No `vercel.json` to tell Vercel to run migrations after build

## Solution

### 1. Track Migrations in Git
- Removed `prisma/migrations/` from `.gitignore`
- Created initial migration `0_init/migration.sql` that captures all 7 tables (users, products, redeem_stocks, vouchers, transactions, ai_configurations, promo_codes)

### 2. Create `vercel.json` 
```json
{
  "buildCommand": "npm run build && npx prisma migrate deploy --skip-generate",
  "installCommand": "npm install --legacy-peer-deps",
  "outputDirectory": ".next",
  "env": { "NODE_ENV": "production", "ENVIRONMENT": "production" }
}
```

**Key:** `buildCommand` includes `prisma migrate deploy` which runs **after** Next.js build, ensuring:
- Next.js compiled first
- Then Prisma applies pending migrations to production database
- App starts with correct schema

### 3. Production Database URLs (2 Required)
Serverless (Vercel) requires both:

- **`DATABASE_URL`** — Pooled connection (for app queries, serverless-friendly)
- **`DIRECT_URL`** — Direct connection (for migrations, needs persistent connection)

Example with Neon:
```env
DATABASE_URL=postgresql://user:pass@pooler.region.neon.tech:6543/db?sslmode=require
DIRECT_URL=postgresql://user:pass@direct.neon.tech:5432/db?sslmode=require
```

Prisma automatically routes app queries to DATABASE_URL and migrations to DIRECT_URL.

## Files Changed

| File | Status | What |
|------|--------|------|
| `vercel.json` | ✨ Created | Vercel build configuration |
| `prisma/migrations/0_init/migration.sql` | ✨ Created | Initial schema migration |
| `.env.production.example` | ✨ Created | Production env template |
| `docs/MIGRATION_FIX.md` | ✨ Created | Technical explanation |
| `docs/DEPLOYMENT.md` | ✏️ Updated | Comprehensive deployment guide |
| `package.json` | ✏️ Updated | Added `build:prod` script |
| `.gitignore` | ✏️ Updated | Removed migrations ignore + added comment |

## How It Works on Vercel (Now)

1. **Install:** `npm install --legacy-peer-deps`
2. **Build:** `npm run build` (generates Prisma, builds Next.js)
3. **Migrate:** `npx prisma migrate deploy --skip-generate` ← **THE FIX**
4. **Start:** App runs with migrated schema

If migrations already applied: step 3 is idempotent (no-op).

## Deployment Verification

✅ **Local Build:** `npm run build` succeeds  
✅ **Tests:** 296/296 passing  
✅ **TypeScript:** No type errors  
✅ **Migrations Tracked:** Git now tracks `prisma/migrations/`  
✅ **Vercel Config:** `vercel.json` valid and in place  

## Production Deployment Checklist

- [ ] Create PostgreSQL database (Neon recommended)
- [ ] Set in Vercel dashboard:
  ```
  NODE_ENV = production
  ENVIRONMENT = production
  DATABASE_URL = [pooling URL]
  DIRECT_URL = [direct URL]
  NEXTAUTH_SECRET = [random 32 chars]
  NEXTAUTH_URL = https://your-domain.com
  ... other env vars
  ```
- [ ] Verify Vercel auto-deploys from main branch
- [ ] Check Vercel build logs for: `✔ Migrations applied`
- [ ] Test: login, checkout, data persistence

## Migration Best Practices (Going Forward)

### Adding New Schema Changes

```bash
# After editing prisma/schema.prisma
npx prisma migrate dev --name describe_your_change

# Review generated SQL
cat prisma/migrations/[timestamp]_describe_your_change/migration.sql

# Commit & push
git add prisma/migrations/
git commit -m "feat: add migration for X"
git push

# Vercel auto-deploys and applies migration
```

## Key Learning: Serverless Database Deployment

❌ **Mistakes (Before):**
- Migrations folder in .gitignore
- Build didn't run migrations
- Single database URL (can't use with serverless pooling)

✅ **Best Practices (Now):**
- Migrations tracked in git
- Build includes `prisma migrate deploy`
- Two URLs: pooled (app) + direct (migrations)
- NODE_ENV guard prevents seed in production

---

**Last Updated:** 2026-09-15  
**Status:** ✅ Ready for deployment  
**Risk:** Low (backward compatible, only affects Vercel)
