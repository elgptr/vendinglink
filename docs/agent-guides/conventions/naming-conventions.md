# 📛 Naming Conventions

Consistent naming across the codebase.

---

## 🌿 Branch Names

**Format:** `type/agentname/description`

### Types
- `feat/` — New feature
- `fix/` — Bug fix
- `test/` — Tests only
- `chore/` — Dependencies, refactoring
- `docs/` — Documentation

### Examples
```
feat/dev-alice/multi-qty-checkout
fix/dev-bob/race-condition-stock-claim
test/qa-eve/admin-upload-scenarios
docs/dev-alice/update-readme
chore/dev-bob/upgrade-vitest
```

### Rules
- ✅ Lowercase
- ✅ Hyphens for spaces
- ✅ Descriptive
- ✅ Starts with type

---

## 📝 Commit Messages

**Format:** `type: description (reason)`

### Types
- `feat:` — New feature
- `fix:` — Bug fix
- `test:` — Tests
- `chore:` — Refactoring, deps
- `docs:` — Documentation

### Examples
```
✅ GOOD:
  feat: add batch stock claim (fixes race condition)
  fix: sanitize filename to prevent path traversal
  test: add edge case for concurrent claims
  chore: upgrade vitest to 2.0

❌ BAD:
  update
  fix bug
  work in progress
```

### Rules
- ✅ Present tense
- ✅ Specific
- ✅ Add reason in parentheses
- ✅ Under 50 chars (title)

---

## 📌 PR Titles

**Format:** `type: description`

### Examples
```
✅ feat: Multi-quantity checkout for agents
✅ fix: Prevent race condition in stock claims
✅ test: Add E2E scenario for admin upload

❌ Update
❌ Fix stuff
❌ WIP
```

### Rules
- ✅ Under 70 characters
- ✅ Starts with type
- ✅ Descriptive

---

## 📁 File Names

### Variables & Functions
```
camelCase
✅ claimAvailableStock
✅ calculateShippingCost
❌ claim_available_stock
❌ ClaimAvailableStock
```

### Classes & Types
```
PascalCase
✅ StockClaim
✅ AdminUser
❌ stockClaim
❌ admin_user
```

### Constants
```
CONSTANT_CASE
✅ MAX_QUANTITY = 10
✅ API_TIMEOUT_MS = 5000
❌ maxQuantity
❌ api_timeout_ms
```

### Files
```
kebab-case or descriptive.ts
✅ sanitize-filename.ts
✅ stock-claim.ts
✅ types.ts
❌ sanitizeFilename.ts
❌ StockClaim.ts
```

---

## 🏷️ Database

### Table Names
```
snake_case, plural
✅ stock_claims
✅ admin_users
❌ StockClaim
❌ admin_user
```

### Column Names
```
snake_case
✅ created_at
✅ updated_by
❌ createdAt
❌ updatedBy
```

### Enum Values
```
UPPER_CASE_SNAKE
✅ CLAIM_STATUS: 'PENDING' | 'APPROVED'
✅ USER_ROLE: 'ADMIN' | 'AGENT'
❌ ClaimStatus: 'pending' | 'approved'
```

---

## 🏷️ React Components

```
PascalCase, descriptive

✅ StockClaimForm.tsx
✅ AdminDashboard.tsx
✅ AgentCheckout.tsx
❌ stockClaimForm.tsx
❌ admin_dashboard.tsx
```

---

## 🔐 Environment Variables

```
UPPER_CASE_SNAKE

✅ DATABASE_URL
✅ API_SECRET_KEY
✅ MAX_UPLOAD_SIZE_MB
❌ databaseUrl
❌ api-secret-key
```

---

## 📝 Summary Table

| Item | Style | Example |
|------|-------|---------|
| Branch | type/name/desc | `feat/dev-alice/feature` |
| Commit | type: desc (why) | `feat: add feature (faster)` |
| PR title | type: desc | `feat: Add feature` |
| Variable | camelCase | `stockQuantity` |
| Function | camelCase | `claimStock()` |
| Class | PascalCase | `StockClaim` |
| Type | PascalCase | `StockStatus` |
| Constant | CONSTANT_CASE | `MAX_QTY` |
| File | kebab-case.ts | `stock-claim.ts` |
| DB table | snake_case plural | `stock_claims` |
| DB column | snake_case | `created_at` |
| Enum | UPPER_CASE | `'PENDING'` |
| Component | PascalCase | `StockForm.tsx` |
| Env var | UPPER_CASE | `API_KEY` |

---

**See Also:** [Code Standards](./code-standards.md)
