# VendingLink - Vending Machine Digital Redeem System

**VendingLink** adalah platform web untuk distribusi digital voucher dan stok mesin vending. Pelanggan dapat membeli redeem code melalui Midtrans, sementara agen/reseller mendapatkan akses kredit setelah disetujui admin.

## 🚀 Quick Start (Manusia)

### Prerequisites
- Node.js 18+
- PostgreSQL (local atau Neon cloud)
- npm 9+

### Setup Lokal
```bash
# 1. Clone & install
git clone https://github.com/your-org/vending-machine-link-redeem.git
cd vending-machine-link-redeem
npm install --legacy-peer-deps

# 2. Setup database
cp .env.example .env
# Edit .env dengan DATABASE_URL kamu

# 3. Setup database & seed
npx prisma migrate dev
npx prisma db seed

# 4. Jalankan dev server
npm run dev
```

**Akses di:** `http://localhost:3000`

### Login Credentials (Development)
- **Admin:** username `admin`, password lihat output seed
- **Agent:** username `agent01`, password lihat output seed
- **Customer:** No login needed, browse `/` directly

---

## 📚 Documentation

**Full documentation in `/docs` folder. Choose by role:**

### For Developers
- **[AI_CONTEXT.md](docs/AI_CONTEXT.md)** ⭐ *Start here if you're an AI*
- **[SETUP.md](docs/SETUP.md)** — Local dev environment & setup
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Codebase structure, naming conventions
- **[CONTRIBUTING.md](docs/CONTRIBUTING.md)** — Git workflow & code review

### For Admins & Operators
- **[ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md)** — Admin setup & password management
- **[FEATURES.md](docs/FEATURES.md)** — Feature breakdown & admin dashboard

### For DevOps & Deployment
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** — Production checklist & Vercel setup
- **[PRD.md](docs/PRD.md)** — Product requirements & tech stack

### Full Navigation
- **[docs/INDEX.md](docs/INDEX.md)** — Complete documentation index

---

## 🔍 For AI Assistants

**If you're Claude, ChatGPT, Cline, or another AI assistant**, start with [`docs/AI_CONTEXT.md`](docs/AI_CONTEXT.md) for:
- Quick project overview & key data models
- File structure & naming conventions
- Common development tasks & commands
- Security & type safety best practices

---

## 🛠️ Development Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npm run test:run     # Unit & integration tests (Vitest)
npm run test:e2e     # E2E tests (Playwright)
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database with test data
```

---

## 📁 Project Structure

```
vending-machine-link-redeem/
├── app/                   # Next.js App Router (pages & API routes)
│   ├── admin/            # Admin dashboard pages
│   ├── agent/            # Agent portal pages
│   ├── api/              # API routes
│   └── page.tsx          # Public homepage
├── components/           # Reusable React components
├── lib/                  # Utility functions & helpers
├── prisma/               # Database schema & migrations
├── public/               # Static assets
├── docs/                 # Documentation (READ THIS!)
├── scripts/              # Utility scripts (password reset, etc)
├── .env.example          # Environment variables template
├── next.config.mjs       # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS config
└── tsconfig.json         # TypeScript config
```

---

## 🔐 Security

- Gunakan `.env` untuk semua secrets — **jangan commit ke git**
- Validate semua input user (form + API)
- Admin password: Setup via seed dev, atau `scripts/change-password.js` untuk production
- Lihat [docs/DEPLOYMENT.md](/docs/DEPLOYMENT.md) untuk security checklist production

---

## 🤝 Contributing

1. **Baca** [`docs/CONTRIBUTING.md`](/docs/CONTRIBUTING.md) untuk branching & PR rules
2. **Buat branch:** `git checkout -b feat/your-name/feature-description`
3. **Commit:** `git commit -m "Add clear message"`
4. **Push & PR:** `git push -u origin your-branch` → buat PR ke `main`
5. **Merge** setelah review & CI pass

---

## 📞 Support

- **Bug report?** Open an issue di GitHub
- **Question?** Check docs atau ask di team chat
- **Password reset?** See [docs/ADMIN_GUIDE.md](/docs/ADMIN_GUIDE.md)

---

**Last Updated:** 2026-09-15 | **Status:** Phase 2 Complete ✅
