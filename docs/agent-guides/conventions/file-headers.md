# 📄 File Headers Template

Standard header for all new files.

---

## 🔤 TypeScript/React Files

**Use this template for .ts, .tsx files:**

```typescript
/**
 * [filename]
 *
 * [One-line description of what this file does]
 *
 * @module lib/stock  (for libraries: specify module name)
 * @see ../types.ts (if depends on other files)
 *
 * Example:
 * ```ts
 * const claim = await claimAvailableStock(5);
 * ```
 */

// Implementation here
```

---

## 📝 SQL Files

**Use this template for database files:**

```sql
-- filename: migration_name.sql
--
-- Description: What this migration does
-- Date: 2026-01-01
-- Author: agent-name
--
-- Example:
-- This adds a `status` column to stock_claims table
-- and creates an index for faster querying.

-- Migration SQL here
```

---

## 🧪 Test Files

**Use this template for .test.ts files:**

```typescript
/**
 * filename.test.ts
 *
 * Tests for [module being tested]
 *
 * @see ../filename.ts (the actual implementation)
 */

import { describe, it, expect } from 'vitest';
import { functionToTest } from '../filename';

describe('functionToTest', () => {
  it('should [behavior] when [condition]', () => {
    // test
  });
});
```

---

## 📖 Documentation Files

**Use this template for .md files:**

```markdown
# [Title]

[One sentence description]

---

[Content]
```

---

## ✅ Checklist for New Files

- [ ] Header added (type, description)
- [ ] Clear function/module description
- [ ] Example usage (if applicable)
- [ ] References to related files
- [ ] Proper imports organized
- [ ] No hardcoded values
- [ ] No console.log statements

---

**Example: Complete File**

```typescript
/**
 * stock.ts
 *
 * Stock management utilities. Handles claiming and validating
 * stock availability with concurrent access protection.
 *
 * @module lib/stock
 * @see types.ts (for StockClaim type)
 * @see db.ts (for database client)
 *
 * Example:
 * ```ts
 * const claim = await claimAvailableStock(5);
 * if (claim) console.log('Claimed', claim.id);
 * ```
 */

import { db } from './db';
import type { StockClaim } from '../types';

/**
 * Claims available stock items atomically.
 * Uses database transaction to prevent race conditions.
 *
 * @param quantity - Number of items to claim (1-10)
 * @returns The created claim, or null if insufficient stock
 */
export async function claimAvailableStock(
  quantity: number
): Promise<StockClaim | null> {
  // Implementation
}
```

---

**See Also:** [Code Standards](./code-standards.md) | [Naming Conventions](./naming-conventions.md)
