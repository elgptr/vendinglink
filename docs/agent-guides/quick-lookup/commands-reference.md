# 🔧 Commands Reference

Common CLI commands for VendingLink.

---

## 🚀 Development

```bash
# Start dev server
npm run dev

# Runs at http://localhost:3000

# Install dependencies
npm install

# Update dependencies
npm update
```

---

## 🧪 Testing

```bash
# Run all unit & integration tests
npm run test:run

# Run tests in watch mode (re-run on change)
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run single test file
npm run test:run -- filename.test.ts

# Run with coverage
npm run test:run -- --coverage
```

---

## 🔨 Build & Lint

```bash
# Build for production
npm run build

# Check for TypeScript errors
npm run type-check

# Run linter
npm run lint

# Fix linting errors
npm run lint:fix

# Format code
npm run format
```

---

## 🌿 Git

```bash
# Create feature branch
git checkout -b feat/yourname/description

# View changes
git status
git diff

# Stage changes
git add .
git add file.ts  # specific file

# Commit
git commit -m "feat: description (why)"

# Push to remote
git push -u origin branch-name

# View commit history
git log --oneline

# Switch branch
git checkout branch-name

# Delete branch
git branch -D branch-name  # local
git push origin --delete branch-name  # remote
```

---

## 🗄️ Database

```bash
# Create migration
npx prisma migrate dev --name migration_name

# View database
npx prisma studio

# Reset database (dev only!)
npx prisma migrate reset

# Generate Prisma types
npx prisma generate
```

---

## 📝 Environment

```bash
# Copy example env
cp .env.example .env.local

# View env vars (don't log secrets!)
cat .env.local

# Set env var for single command
DATABASE_URL=... npm run dev
```

---

## 🆘 Troubleshooting

```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Kill port 3000
lsof -ti:3000 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :3000   # Windows

# View git logs
git log --oneline -n 10
git show commit-hash
```

---

## 📚 Help Commands

```bash
# Help for npm
npm help

# Help for vitest
npm run test:run -- --help

# Help for git
git --help
git commit --help
```

---

**See Also:** [Development Setup](../../guides/development-setup.md)
