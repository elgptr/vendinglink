# 🚫 Anti-Patterns: Code to Avoid

Common mistakes and patterns NOT to use.

---

## 1️⃣ Using `any` Type

**❌ ANTI-PATTERN:**
```typescript
function processOrder(order: any): any {
  return order.total * 1.1;
}
```

**✅ CORRECT:**
```typescript
interface Order {
  id: string;
  total: number;
}

function processOrder(order: Order): number {
  return order.total * 1.1;
}
```

**Why:** `any` defeats TypeScript's type safety. Errors slip through.

---

## 2️⃣ N+1 Database Queries

**❌ ANTI-PATTERN:**
```typescript
const orders = await db.order.findMany();
for (const order of orders) {
  order.customer = await db.customer.findUnique({
    where: { id: order.customerId }
  });
}
```

**✅ CORRECT:**
```typescript
const orders = await db.order.findMany({
  include: { customer: true } // Eager load!
});
```

**Why:** Queries in loops are extremely slow (100 orders = 101 queries!).

---

## 3️⃣ Hardcoded Values

**❌ ANTI-PATTERN:**
```typescript
if (order.total > 1000) { // Magic number!
  applyDiscount(order);
}

const apiUrl = 'https://api.example.com/'; // Hardcoded!
```

**✅ CORRECT:**
```typescript
const MAX_ORDER_TOTAL = 1000;
if (order.total > MAX_ORDER_TOTAL) {
  applyDiscount(order);
}

const apiUrl = process.env.API_BASE_URL || 'https://api.example.com/';
```

**Why:** Hard to change, easy to miss, makes testing harder.

---

## 4️⃣ Swallowing Errors

**❌ ANTI-PATTERN:**
```typescript
try {
  await claimStock(qty);
} catch (e) {
  // Do nothing
}
```

**✅ CORRECT:**
```typescript
try {
  await claimStock(qty);
} catch (e) {
  logger.error('Failed to claim stock', { qty, error: e.message });
  throw e; // Re-throw or handle
}
```

**Why:** Silent failures are hard to debug.

---

## 5️⃣ Mutating Parameters

**❌ ANTI-PATTERN:**
```typescript
function updateUser(user: User) {
  user.name = 'New Name'; // Mutates caller's object!
  user.email = 'new@example.com';
}
```

**✅ CORRECT:**
```typescript
function updateUser(user: User): User {
  return {
    ...user,
    name: 'New Name',
    email: 'new@example.com'
  };
}
```

**Why:** Mutations are unpredictable, make testing hard.

---

## 6️⃣ Not Handling Async Errors

**❌ ANTI-PATTERN:**
```typescript
async function fetchData() {
  const data = await api.get('/data'); // What if it fails?
  return data.json();
}
```

**✅ CORRECT:**
```typescript
async function fetchData() {
  try {
    const data = await api.get('/data');
    if (!data.ok) {
      throw new Error(`API returned ${data.status}`);
    }
    return data.json();
  } catch (e) {
    logger.error('Failed to fetch data', { error: e });
    throw e;
  }
}
```

**Why:** Network calls can fail. Must handle it.

---

## 7️⃣ Console.log in Production

**❌ ANTI-PATTERN:**
```typescript
function claimStock(qty: number) {
  console.log('Claiming:', qty); // Log to console
  // ... code
  console.error('Error claiming'); // Even worse!
}
```

**✅ CORRECT:**
```typescript
import { logger } from '@/lib/logger';

function claimStock(qty: number) {
  logger.info('Claiming stock', { qty }); // Structured logging
  // ... code
  logger.error('Failed to claim stock', { qty, reason });
}
```

**Why:** console.log doesn't go to production logs. Structured logging is searchable.

---

## 8️⃣ Too Many Responsibilities

**❌ ANTI-PATTERN (God Function):**
```typescript
async function processOrder(order: Order) {
  // Validate
  if (!order.items.length) throw new Error('No items');
  
  // Calculate tax
  const tax = order.total * 0.1;
  
  // Process payment
  const payment = await stripe.charge(order.total + tax);
  
  // Update inventory
  for (const item of order.items) {
    await db.stock.decrement(item.id, item.qty);
  }
  
  // Send email
  await email.send(order.customer.email, 'Order Confirmed');
  
  // Update database
  order.status = 'COMPLETED';
  await db.order.update(order);
}
```

**✅ CORRECT (Single Responsibility):**
```typescript
async function processOrder(order: Order) {
  validateOrder(order);
  await chargePayment(order);
  await updateInventory(order);
  await sendConfirmationEmail(order);
  await markOrderComplete(order);
}
```

**Why:** Functions should do ONE thing well. Easier to test, reuse, modify.

---

## 9️⃣ Race Conditions

**❌ ANTI-PATTERN:**
```typescript
const stock = await db.stock.findUnique({ where: { id } });
if (stock.quantity > 0) {
  // Another request might update stock here! ⚠️
  await db.stock.update({
    where: { id },
    data: { quantity: stock.quantity - 1 }
  });
}
```

**✅ CORRECT (Atomic):**
```typescript
const result = await db.stock.updateMany({
  where: { id, quantity: { gt: 0 } },
  data: { quantity: { decrement: 1 } }
});
if (result.count === 0) throw new Error('Stock unavailable');
```

**Why:** Separate read & write can cause concurrency bugs.

---

## 🔟 Missing Tests

**❌ ANTI-PATTERN:**
```typescript
export function calculateShipping(weight: number, distance: number) {
  return (weight * 2 + distance * 0.5) * 1.1;
}
// No tests!
```

**✅ CORRECT:**
```typescript
describe('calculateShipping', () => {
  it('calculates shipping with weight', () => {
    expect(calculateShipping(10, 100)).toBe(176);
  });
  
  it('handles edge cases', () => {
    expect(calculateShipping(0, 0)).toBe(0);
    expect(calculateShipping(1000, 1000)).toBeCloseTo(3300, -1);
  });
});
```

**Why:** Without tests, bugs reach production.

---

## 📋 Anti-Patterns Checklist

- ❌ `any` types
- ❌ N+1 queries
- ❌ Hardcoded values
- ❌ Swallowed errors
- ❌ Mutating params
- ❌ Unhandled async errors
- ❌ console.log in production
- ❌ Functions with too many responsibilities
- ❌ Race conditions
- ❌ Missing tests

---

**See Also:** [Code Standards](../conventions/code-standards.md) | [Rule Violations](./RULE_VIOLATIONS.md)
