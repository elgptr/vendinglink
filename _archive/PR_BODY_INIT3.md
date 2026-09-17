feat: Initiative 3 QA — Growth Features (Multi-Qty Checkout + Admin Upload)

## Summary

QA implementation for Initiative 3 ("Buy More, Come Back, Tell a Friend") with comprehensive test coverage covering multi-quantity checkout, admin image upload, and backward compatibility.

## What's Included

### Implementation (Iqbal)
- **lib/storage.ts** — Secure file upload utility with path traversal/XSS prevention, MIME validation, 5MB cap
- **app/api/admin/upload/route.ts** — Admin-guarded upload endpoint with rate limiting (5/min)

### Tests (29 Total)
- **22 Unit Tests** covering storage, validation, and batch stock claiming
- **4 Integration Tests** covering auth guards, rate limits, persistence
- **3 E2E Tests** covering agent qty checkout, customer backward compat, admin upload

## Test Results

✅ 272/272 tests passing (100%)
✅ Build succeeds (TypeScript clean)
✅ Zero regressions (all Phase 1+2 tests pass)

## Features Tested

### Multi-Quantity Checkout
- Agent can order 1–10 units
- Customer defaults to qty=1 (backward compatible)
- Batch stock claiming is atomic (all-or-nothing)
- FIFO ordering respected
- Validation rejects qty=0 and qty>10

### Admin Image Upload
- PNG/JPEG only, ≤5MB
- Filenames sanitized (path traversal/XSS prevention)
- Product guideImageUrl persisted
- Rate-limited and auth-guarded

## Security Verified

✅ Path traversal prevention
✅ XSS sanitization
✅ File size boundaries
✅ MIME type validation
✅ Auth guards
✅ Rate limiting
✅ Concurrent batch atomicity

## Documentation
- TESTING_REPORT_INITIATIVE3.md — Full metrics & deployment checklist
- INITIATIVE3_QA_SUMMARY.md — Executive summary

## Files Changed

- lib/storage.ts (NEW)
- app/api/admin/upload/route.ts (NEW)
- __tests__/lib/storage.test.ts (NEW, 15 tests)
- __tests__/lib/stock-batch.test.ts (NEW, 7 tests)
- __tests__/api/admin-upload.test.ts (NEW, 4 tests)
- e2e/revenue-admin-upload.spec.ts (NEW)
- e2e/revenue-agent-bulk.spec.ts (NEW)
- e2e/revenue-customer-compat.spec.ts (NEW)

## Verification

Run locally:
```bash
npm run test:run  # All 272 tests passing
npm run build     # TypeScript clean
npm run test:e2e  # E2E scenarios
```

## Ready for Deployment ✅

All code tested, documented, and production-ready.
