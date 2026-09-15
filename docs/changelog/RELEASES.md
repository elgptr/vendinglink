# 📦 Release Notes

Version history and what changed in each release.

---

## [0.1.1] — 2026-09-15

### 🐛 Bug Fixes

- **Fixed admin inventory page crash (`/admin/inventory`).**
  - Root cause: the admin rate limiter (`lib/adminRateLimit.ts`) enforced a shared **5 requests/min/IP** across all `/api/admin/**` endpoints. A single dashboard + inventory load easily exceeded 5 requests, so `/api/admin/products` returned `429 { error: "Too many requests" }`. The page then called `setProducts(data)` on a non-array, and `products.map(...)` threw `TypeError: products.map is not a function`, white-screening the page.
  - **Fix A (rate limiter):** `checkAdminRateLimit` now skips rate limiting for **GET** requests, keeping the strict 5/min guard only on mutations (`POST`/`PATCH`/`DELETE`) where abuse protection matters.
  - **Fix B (defensive fetch):** `app/admin/inventory/page.tsx` — `fetchProducts` and `fetchStocks` now validate `res.ok`, confirm the payload is the expected array shape, keep state as `[]` on failure, log to console, and surface a `toast.error` instead of crashing.

- **Restored Next.js config correctness.**
  - `next.config.mjs` previously had a temporary `typescript: { ignoreBuildErrors: true }` hack that silently hid type errors, and had dropped the required `serverExternalPackages: ["bcryptjs"]`. Restored to compile type checking and the `bcryptjs` external server package.

- **Fixed TypeScript error in `__tests__/lib/logger-edge-cases.test.ts`.**
  - Added explicit type annotations for `call` and `idx` parameters (implicit `any`).

### 🔒 Security

- **Patched `minimatch` ReDoS vulnerability (GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74).**
  - `npm audit` reported 3 high-severity issues via `@typescript-eslint/typescript-estree@7.2.0` → `minimatch@9.0.3`.
  - Added an npm `override` in `package.json` forcing `minimatch → ^9.0.7` inside `@typescript-eslint/typescript-estree`, and regenerated `package-lock.json`.
  - Result: `npm audit` reports **0 vulnerabilities**.

### 🧰 Chores

- Reorganized top-level documentation into the `docs/` directory (references, initiatives, operations, agent guides, changelog).
- Added `README.md`, `SETUP_COMPLETE.md`, `.eslintignore`, `.prettierignore`, and local testing/quick reference guides.

---

**See also:** [← Back to Changelog](./README.md)