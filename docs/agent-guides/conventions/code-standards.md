# 📋 Code Standards Quick Reference

Quick style guide for VendingLink code.

---

## 🔤 TypeScript

**Strict mode — no `any`**

```typescript
✅ GOOD:
function claim(quantity: number): StockClaim | null {
  if (!isValidQuantity(quantity)) return null;
  return new StockClaim(quantity);
}

❌ BAD:
function claim(quantity: any): any {
  return new StockClaim(quantity);
}
```

**Use proper types:**
```typescript
✅ User: { id: string; name: string; role: 'ADMIN' | 'AGENT' }
❌ User: any
```

---

## 🧪 Testing

**Test coverage >80%**

```typescript
✅ GOOD:
test('claimStock with valid qty returns claim', () => {
  const claim = claimStock(5);
  expect(claim).toBeDefined();
  expect(claim.quantity).toBe(5);
});

test('claimStock with invalid qty returns null', () => {
  expect(claimStock(0)).toBeNull();
  expect(claimStock(100)).toBeNull();
});

❌ BAD:
test('claimStock works', () => {
  const claim = claimStock(5);
  expect(claim).toBeDefined();
});
```

---

## 🔐 Security

**No hardcoded values, no secrets**

```typescript
✅ GOOD:
const timeout = process.env.API_TIMEOUT_MS || 5000;
const apiKey = await getSecureToken('external-api');

❌ BAD:
const timeout = 5000; // hardcoded
const apiKey = 'sk_live_abc123'; // secret in code
```

---

## 📝 Comments

**Comments explain WHY, not WHAT**

```typescript
✅ GOOD:
// Use batch claim instead of loop to prevent race conditions
async function claimStockBatch(qty: number) {
  return db.transaction(async (tx) => {
    return await tx.stock.updateMany({
      where: { available: true },
      data: { claimed: true },
      take: qty,
    });
  });
}

❌ BAD:
// Loop through items
for (let i = 0; i < qty; i++) {
  claim(items[i]);
}
```

---

## 🎯 Functions

**Single responsibility, <50 LOC**

```typescript
✅ GOOD:
function isValidQuantity(qty: number): boolean {
  return qty >= 1 && qty <= 10;
}

❌ BAD:
function processOrder(qty: number) {
  if (qty < 1) return null;
  if (qty > 10) return null;
  const stock = db.stock.find();
  const claim = new Claim();
  // ... 100 lines
}
```

---

## 🚀 Performance

**No N+1 queries, optimize loops**

```typescript
✅ GOOD:
const orders = await db.order.findMany({
  include: { items: true, customer: true }, // Eager load
});

❌ BAD:
const orders = await db.order.findMany();
for (const order of orders) {
  order.items = await db.orderItem.findMany(); // N+1 query!
}
```

---

## 🔄 Error Handling

**Explicit errors, meaningful messages**

```typescript
✅ GOOD:
if (quantity > maxAllowed) {
  throw new Error(
    `Quantity ${quantity} exceeds maximum ${maxAllowed}`
  );
}

❌ BAD:
if (quantity > maxAllowed) throw new Error('Invalid qty');
```

---

## 📝 Logging

**Use structured logging, no console.log**

```typescript
✅ GOOD:
logger.info('Stock claimed', { quantity, userId, claimId });

❌ BAD:
console.log('qty:', qty);
console.error('error claiming stock');
```

---

## 🔗 Imports

**Use absolute paths, organize**

```typescript
✅ GOOD:
import { claimStock } from '@/lib/stock';
import { User } from '@/types';
import { supabase } from '@/lib/db';

❌ BAD:
import { claimStock } from '../../../lib/stock';
import User from './types.js';
```

---

## 🎯 Style Checklist

- ✅ No `any` types
- ✅ Tests present (>80% coverage)
- ✅ No hardcoded values
- ✅ No console.log in production
- ✅ No secrets in code
- ✅ Comments explain WHY
- ✅ Functions are small
- ✅ Errors are explicit
- ✅ No N+1 queries
- ✅ Imports use absolute paths

---

**See Also:** [Naming Conventions](./naming-conventions.md) | [File Headers](./file-headers.md)
