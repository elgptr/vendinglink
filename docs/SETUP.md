# Setup & Development Environment Guide

## Prerequisites

- **Node.js** 18+ (verify: `node --version`)
- **npm** 9+ (verify: `npm --version`)
- **PostgreSQL** 13+ or **Neon Cloud** account
- **Git** 2.20+
- **VS Code** (recommended) with Prettier + ESLint extensions

---

## 1. Initial Setup (First Time)

### 1.1 Clone Repository

```bash
git clone https://github.com/your-org/vending-machine-link-redeem.git
cd vending-machine-link-redeem
```

### 1.2 Install Dependencies

```bash
npm install --legacy-peer-deps
```

**Why `--legacy-peer-deps`?** NextAuth.js v5-beta has loose peer dependency ranges. This flag allows compatible versions to coexist.

### 1.3 Environment Configuration

```bash
cp .env.example .env
```

**Edit `.env`** with your local setup:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/vendinglink"
# OR use Neon Cloud:
DATABASE_URL="postgresql://user:password@ep-name.neon.tech/dbname?sslmode=require"

# NextAuth (for dev, any random string works)
NEXTAUTH_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Midtrans (get from Midtrans Dashboard)
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="your-midtrans-client-key"
MIDTRANS_SERVER_KEY="your-midtrans-server-key"

# AI (optional, leave blank if not using)
ANTHROPIC_API_KEY=""
GOOGLE_GENAI_API_KEY=""
```

### 1.4 Initialize Database

```bash
# Run migrations
npx prisma migrate dev

# Seed with test data
npx prisma db seed
```

**Output will show:**
```
✅ Admin created: admin
   Dev password: abc123xyz789
✅ Agent created: agent01
   Dev password: xyz789abc123
✅ 3 sample products created
```

---

## 2. Development Server

### 2.1 Start Dev Server

```bash
npm run dev
```

**Output:**
```
> next dev
  ▲ Next.js 16.0.0
  ✓ Ready in 2.1s
  ○ Localhost:3000
```

**Access at:** `http://localhost:3000`

### 2.2 Stop Dev Server

Press `Ctrl+C` in terminal.

---

## 3. Common Development Tasks

### 3.1 Database Operations

```bash
# View database schema (interactive Prisma Studio)
npx prisma studio

# Push schema changes (development only)
npx prisma db push

# Run migration (after schema.prisma changes)
npx prisma migrate dev --name add_new_field

# Reset database (wipes all data!)
npx prisma migrate reset
```

### 3.2 Code Quality

```bash
# Lint check (ESLint)
npm run lint

# Format code (Prettier)
npx prettier --write .

# Type check (TypeScript)
npx tsc --noEmit
```

### 3.3 Testing

```bash
# Run all unit + integration tests (Vitest)
npm run test:run

# Watch mode (auto-rerun on file change)
npm run test:watch

# Run E2E tests (Playwright)
npm run test:e2e
```

### 3.4 Build & Verification

```bash
# Production build (catches TypeScript + build errors)
npm run build

# Inspect build size
npm run build --analyze  # (if available)

# Start production build locally
npm start
```

---

## 4. Database Connection Issues

### 4.1 Connection Refused

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
1. Ensure PostgreSQL is running locally: `pg_isready`
2. OR use Neon Cloud (recommended):
   ```bash
   # Get connection string from Neon dashboard
   DATABASE_URL="postgresql://user:pass@ep-xxxx.neon.tech/dbname?sslmode=require"
   ```
3. Restart dev server: `npm run dev`

### 4.2 Auth Error / Wrong Credentials

**Error:** `error: password authentication failed`

**Solution:**
- Check `.env` DATABASE_URL spelling
- Verify PostgreSQL user exists: `psql -U postgres -l`
- Reset password (PostgreSQL):
  ```bash
  psql -U postgres
  \password vendinglink_user
  # Enter new password
  \q
  ```

### 4.3 Prisma Client Out of Sync

**Error:** `PrismaClientInitializationError: The `NODE_ENV` environment is not set and defaults to development`

**Solution:**
```bash
npx prisma generate
npm run dev
```

---

## 5. Hot Reload & Live Updates

### 5.1 File Changes Auto-Reload

VendingLink uses Next.js Fast Refresh:
- **React components** (`.tsx` files) → Auto-reload in browser
- **API routes** (`app/api/`) → Auto-restart on save
- **`.env` changes** → Restart dev server manually

### 5.2 Manual Restart

If changes don't reflect:
```bash
# Press Ctrl+C to stop dev server
# Then restart:
npm run dev
```

---

## 6. Troubleshooting Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Port 3000 already in use | Another process on :3000 | `npx kill-port 3000` OR use `npm run dev -- -p 3001` |
| Module not found (e.g., `@/components`) | TypeScript paths config | Restart VS Code or run `npx tsc --noEmit` |
| `.env` not loading | File format | Remove BOM, use CRLF → LF, no spaces around `=` |
| Prisma migration fail | Schema conflict | `npx prisma migrate resolve --rolled-back <migration-name>` |
| `Cannot find module 'next'` | node_modules corrupted | `rm -rf node_modules package-lock.json && npm install` |

---

## 7. IDE Setup (VS Code)

### 7.1 Recommended Extensions

- **Prettier** (esbenp.prettier-vscode)
- **ESLint** (dbaeumer.vscode-eslint)
- **Prisma** (Prisma.prisma)
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)

### 7.2 Workspace Settings

Create `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[prisma]": {
    "editor.defaultFormatter": "Prisma.prisma"
  },
  "prisma.outputChannel": "Prisma"
}
```

---

## Next Steps

✅ Setup complete! Now:

1. **Understand features:** Read [`docs/FEATURES.md`](/docs/FEATURES.md)
2. **Explore codebase:** See [`docs/ARCHITECTURE.md`](/docs/ARCHITECTURE.md)
3. **Start development:** Read [`docs/CONTRIBUTING.md`](/docs/CONTRIBUTING.md)
4. **Admin setup:** See [`docs/ADMIN_GUIDE.md`](/docs/ADMIN_GUIDE.md)

---

**Last Updated:** 2026-09-15
