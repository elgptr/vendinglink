# 🛑 Rule Violations: Never Do This

Hard stops — breaking these has serious consequences.

---

## 🚨 Critical: Stop Immediately

### 1. Commit Secrets/Credentials

**❌ NEVER:**
```
Git commit with:
- API keys
- Database passwords
- Private keys
- Tokens
- Credentials
```

**WHAT HAPPENS:**
- Security breach
- Credential rotation required
- Audit trail forever
- Potential unauthorized access

**IF YOU ACCIDENTALLY DO:**
1. Alert @lead-dev immediately
2. Rotate the credential (new key, password, etc.)
3. Remove from git history
4. Add to .gitignore

---

### 2. Push Directly to Main

**❌ NEVER:**
```bash
git push origin main
# or
git commit --amend && git push -f origin main
```

**WHAT HAPPENS:**
- Bypasses code review
- Breaks for other developers
- Deploys untested code
- Hard to trace who broke what

**CORRECT:**
```bash
git checkout -b feat/yourname/description
# make changes
git push -u origin feat/yourname/description
# Create PR → Get approval → Merge
```

---

### 3. Delete Production Data

**❌ NEVER:**
```typescript
// Don't ever:
await db.user.deleteMany(); // Deletes ALL users!
db.order.update({ data: { history: null } }); // Wipes history!
```

**WHAT HAPPENS:**
- Data loss
- Can't undo
- Business impact
- Compliance issues

**CORRECT:**
```typescript
// Always use transaction + backup first
const backup = await db.user.findMany();
await db.backup.create({ data: backup });
// Then carefully update specific records
await db.user.updateMany({
  where: { id: { in: userIds } },
  data: { status: 'INACTIVE' }
});
```

---

### 4. Disable Security Checks

**❌ NEVER:**
```bash
npm install package --no-audit
# or disable security in code
// @ts-ignore-security-warning
const value = eval(userInput);
```

**WHAT HAPPENS:**
- Vulnerabilities introduced
- Potential breach
- Audit failures

---

### 5. Skip Tests Before Deploying

**❌ NEVER:**
```bash
# Don't do this:
npm run build
git push  # without running tests!
```

**WHAT HAPPENS:**
- Bugs reach production
- Breaks for customers
- Emergency fixes needed

**CORRECT:**
```bash
npm run test:run   # All pass
npm run test:e2e   # All pass
npm run build      # Succeeds
npm run lint       # No warnings
# Then push
```

---

## ⚠️ High Risk: Checkpoint Required

### 6. Making Database Schema Changes

**❌ WITHOUT CHECKPOINT:**
```typescript
// Don't change schema without discussing:
schema.prisma → removing column
schema.prisma → renaming table
schema.prisma → changing relationships
```

**REQUIRED:**
1. Document the change
2. Request checkpoint
3. Wait for approval
4. Create migration
5. Test migration

---

### 7. Breaking API Changes

**❌ WITHOUT CHECKPOINT:**
```typescript
// Changing API contract without notice:
GET /api/orders → change to POST
Response: { orders } → Response: { results }
POST /api/checkout → remove qty parameter
```

**REQUIRED:**
1. Design deprecation plan
2. Request checkpoint
3. Add deprecation warning
4. Keep old endpoint for migration period
5. Get approval

---

### 8. Adding Production Secrets to Code

**❌ NEVER:**
```typescript
const dbPassword = 'prod_password_123'; // In source code!
const apiKey = process.env.API_KEY || 'hardcoded_fallback'; // Bad fallback!
```

**REQUIRED:**
```typescript
const dbPassword = process.env.DATABASE_PASSWORD;
if (!dbPassword) throw new Error('DATABASE_PASSWORD not set');
```

---

## 📋 Rule Violations Checklist

### 🚨 CRITICAL (Never)
- [ ] Secrets in code
- [ ] Direct push to main
- [ ] Delete production data
- [ ] Disable security
- [ ] Skip tests before deploy

### ⚠️ HIGH RISK (Checkpoint)
- [ ] Database schema changes
- [ ] Breaking API changes
- [ ] Production config changes
- [ ] Removing features

### 🟡 CAUTION (Ask)
- [ ] Major refactoring
- [ ] Third-party integration
- [ ] Performance changes
- [ ] Security-sensitive code

---

## 🚨 If You Break a Rule

### Immediately:
1. Alert @lead-dev
2. Explain what happened
3. Stop making changes
4. Await guidance

### Don't:
- ❌ Try to hide it
- ❌ Keep working
- ❌ Make it worse
- ❌ Delete evidence

### Do:
- ✅ Be transparent
- ✅ Take responsibility
- ✅ Help investigate
- ✅ Learn from mistake

---

**See Also:** [Agent Rules](../agent-rules.md) | [Anti-Patterns](./ANTI-PATTERNS.md)
