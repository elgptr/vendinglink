# 🔧 Bug Fix Plan: Promo & Banner Save Failure

**Date:** 2026-10-15 (revised)
**Branch:** `feat/ditgimanadit/promo-payout-refinements`
**Severity:** High — admin reports "klik Simpan, tidak ada respon/error"

---

## 1. Reproduction (do this FIRST — fixes are speculative without it)

Goal: confirm which failure path the admin actually hits before changing code.

1. Open `/admin/voucher-rules`, open DevTools → Console + Network.
2. **Case A — missing dates:** leave "Mulai Berlaku"/"Berakhir" empty, click Simpan.
   - Expected today: native `required` blocks submit. If it does NOT (programmatic
     state, autofill, browser quirk), `new Date("").toISOString()` throws
     `RangeError: Invalid time value` → uncaught in async `submit()` → no UI feedback.
3. **Case B — network/server drop:** throttle to "Offline" in Network tab, click Simpan.
   - Expected today: `fetch` rejects → uncaught → no UI feedback. **This matches the
     "tidak ada respon apapun" report most precisely.**
4. **Case C — server validation:** submit a PERCENT voucher with no maxDiscount.
   - Expected today: 400 with Zod detail; message DOES show (already works in tree).

Record which case reproduces. The primary fix (A) addresses Cases A + B.

---

## 2. Root Cause (primary) + contributing issues

### PRIMARY — `submit()` has no error handling (page.tsx ~206-239)
`new Date(form.validFrom).toISOString()` can throw, and `fetch` can reject. Neither
is wrapped in try/catch, and the function is `async`, so failures become unhandled
promise rejections. No `setMessage()` runs → the UI appears frozen. This is the
most consistent explanation for "no response at all."

### CONTRIBUTING #1 — PATCH leaks `categoryId` into `...rest` (route.ts line 88)
`const { validFrom, validUntil, ...rest } = parsed.data;` lets `categoryId` fall
into `rest`, then into `updateMany({ data: { ...rest } })`.
Correctness note: Prisma `updateMany` DOES accept scalar `categoryId`, so this does
NOT corrupt data today. It's a consistency fix (align PATCH with POST), not the
blocker. Priority: medium.

### CONTRIBUTING #2 — Banner first-paint flash (CustomerTopBanner.tsx line 28)
`useState(0)` means `now = 0` until `useEffect` runs. Hydration-safe (component
returns null while `promos` is empty on both SSR and first client render), but a
lazy initializer removes the needless 1-frame gap once promos arrive. Priority: low.

### NON-ISSUES (verified, documented so we don't re-litigate)
- `validUntil DateTime?` nullable vs Zod required: `promos/active` uses
  `validUntil: { gt: now }`, which excludes nulls in Prisma. Safe. No change.
- `.strict()` + extra fields: front-end `form` keys all exist in schema; `id` is
  stripped before `safeParse` in PATCH. No strict violation.
- `bannerType` default mismatch (FE `FULL_STRIP` vs Zod `BADGE_COMPOSED`): both are
  valid enum members; no validation failure. Leave as-is (optional UX note).

### ALREADY DONE in working tree (reconcile, don't re-apply)
`git diff` confirms route.ts already added `bad(detail?)`, POST `categoryId` via
`category: { connect }`, and Zod issue surfacing in POST + PATCH. Plan only needs the
PATCH destructure.

---

## 3. Fixes

### Fix A (PRIMARY) — guard dates + wrap fetch in try/catch — page.tsx
- Early-return with a message if `form.validFrom` or `form.validUntil` is empty.
- Wrap date→ISO conversion in try/catch → "Format tanggal tidak valid…".
- Wrap `fetch`/response handling in try/catch → "Koneksi ke server gagal…".
- Keeps existing FULL_STRIP CTA check and success/reset/`load()` behavior.

### Fix B — PATCH destructures `categoryId` — route.ts line 88
Change to: `const { validFrom, validUntil, categoryId, ...rest } = parsed.data;`
Then in `updateMany({ data: ... })` add `categoryId` directly (NOT a `!== undefined`
guard — the field is `.nullable()`, always defined; spreading it lets admins clear
the category to null). Keep `validFrom`/`validUntil` `new Date(...)` conversions.

### Fix C — lazy-init `now` — CustomerTopBanner.tsx line 28
`const [now, setNow] = useState(() => Date.now());`
Rationale incl. hydration-safety note above.

---

## 4. Tests (add regressions, then run full suite)

- `__tests__/api/admin-voucher-rules.test.ts`: add a PATCH case asserting a rule's
  `categoryId` updates (set to an id, then cleared to null) and persists correctly.
- page.tsx `submit` guard: add/extend a component or unit test asserting empty dates
  produce a user message and NO fetch call; and that a rejected fetch shows the
  "Koneksi ke server gagal" message. Match existing test setup/mocking style.
- Run: `npm run test:run`, `npm run lint`, `npm run build` — all green before done.

---

## 5. Impact / blast radius

| Area | Risk | Note |
|------|------|------|
| Discount engine | NONE | value/discountType/maxDiscount untouched |
| POST create | NONE | no change (already correct in tree) |
| PATCH update | LOW | adds categoryId to data; scalar FK, same as POST intent |
| Checkout/payment/payout | NONE | isolated |
| Banner display | LOW | state init only; hydration-safe |
| Prisma schema | NONE | zero schema changes |

---

## 6. Order of work

1. Reproduce (Section 1) and record the failing case.
2. Fix A (primary) — restores UI feedback regardless of case.
3. Fix B (PATCH categoryId).
4. Fix C (banner init).
5. Add regression tests.
6. `test:run` + `lint` + `build`.
7. Manual verify: create promo, edit promo, `/customer` banner render + dismiss + CTA.

---

## 7. Open questions for the user

- Which reproduction case (A/B/C) matches what you saw? That confirms the primary fix.
- Do you want the uncommitted route.ts working-tree changes committed as part of this
  fix, or kept separate?
- Should an empty `categoryId` on edit mean "clear the category" (assumption) or
  "leave unchanged"? This changes Fix B's semantics.
