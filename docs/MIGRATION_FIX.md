# Database Disappearance Fix (Deployment)

## Problem

Every time the application was deployed to Vercel, the database would be lost or corrupted. Root causes:

1. **`.gitignore` ignored migrations** — `prisma/migrations/` folder was not tracked in git
2. **Build script didn't run migrations** — `npm run build` only generated Prisma client and built Next.js, but didn't run `prisma migrate deploy`
3. **No Vercel post-build configuration** — No `vercel.json` to tell Vercel to run migrations after build
4. **Development vs Production schema mismatch** — Local development used SQLite (`dev.db`), production expected PostgreSQL

## Solution

### 1. Track Migrations in Git
- Removed `prisma/migrations/` from `.gitignore`
- Created initial migration `0_init` that captures current schema (all 7 models)
- Migrations are now version-controlled and reproducible

### 2. Create `vercel.json` with Build Configuration
```json
{
  "buildCommand": "npm run build && npx prisma migrate deploy --skip-generate",
  "installCommand": "npm install --legacy-peer-deps",
  "outputDirectory": ".next",
  "env": {
    "NODE_ENV": "production",
    "ENVIRONMENT": "production"
  }
}
```

Key: `buildCommand` includes `prisma migrate deploy` which runs **after** Next.js build, ensuring:
- Next.js is compiled first
- Then Prisma applies pending migrations to production database
- Application starts with correct schema

### 3. Update Build Scripts in `package.json`
- Added `build:prod` script: `prisma generate && next build && npx prisma migrate deploy --skip-generate`
- Default `build` script remains unchanged (for local development)
- Vercel uses `build:prod` via `vercel.json`

### 4. Database Connection Strategy
Production requires **two** PostgreSQL URLs:

- `DATABASE_URL` — Pooled connection (for app queries, serverless-friendly)
- `DIRECT_URL` — Direct connection (for `prisma migrate deploy`, needs persistent connection)

Example with Neon:
```env
DATABASE_URL=postgresql://user:pass@pooler.region.neon.tech:6543/db?sslmode=require
DIRECT_URL=postgresql://user:pass@direct.neon.tech:5432/db?sslmode=require
```

### 5. Documentation Updates
- **`DEPLOYMENT.md`** — Comprehensive production deployment guide with Vercel setup, database strategy, troubleshooting
- **`.env.production.example`** — Template for production environment variables
- **`.gitignore`** — Updated with comments explaining why migrations are tracked

## Files Created/Modified

```
Created:
- vercel.json (Vercel build configuration)
- prisma/migrations/0_init/migration.sql (Schema snapshot)
- .env.production.example (Production env template)

Modified:
- .gitignore (Removed prisma/migrations/ ignore)
- package.json (Added build:prod script)
- docs/DEPLOYMENT.md (Comprehensive guide)
```

## How It Works on Vercel

1. **Install:** `npm install --legacy-peer-deps`
2. **Build:** `npm run build` (generates Prisma, builds Next.js)
3. **Migrate:** `npx prisma migrate deploy --skip-generate` (applies pending migrations)
4. **Start:** Application runs with migrated database schema

If migrations are already applied, step 3 is a no-op (idempotent).

## Migration Best Practices

### Adding New Migrations

```bash
# After modifying prisma/schema.prisma
npx prisma migrate dev --name describe_your_change

# Review generated SQL
cat prisma/migrations/[timestamp]_describe_your_change/migration.sql

# Commit & push
git add prisma/migrations/
git commit -m "feat: add migration for your change"
git push
```

Vercel auto-deploys and applies the migration.

### Local Development

```bash
# Create or update local database with latest schema
npx prisma migrate dev

# Push schema to database (if no migrations exist yet)
npx prisma db push

# See database with GUI
npx prisma studio

# Seed test data (skipped in production auto)
npx prisma db seed
```

## Production Verification

After deploying to Vercel:

1. Check Vercel build logs for: `✔ Migrations applied`
2. Verify database connection: Visit admin dashboard, check data loads
3. Test payment webhook: Make a test transaction
4. Confirm no database errors: Monitor Vercel logs

## Why This Matters

This fix ensures:
- **Reproducibility:** Same schema every deploy
- **Auditability:** Schema changes tracked in git history
- **Safety:** Rollback capability (previous migrations preserved)
- **Scalability:** Works with serverless (Vercel, Lambda, etc.)
- **Maintainability:** Clear migration history for team

---

**Last Updated:** 2026-09-15  
**Related:** PR #29, Issue: Database lost on Vercel deploy
