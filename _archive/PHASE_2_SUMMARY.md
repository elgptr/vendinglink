# Phase 2 — Middleware & Security Hardening (Elang) Summary

**Branch:** `feat/dev-elang/phase-2-middleware-security`
**Version target:** v0.2.0 → v0.3.0
**Role:** Security Hardener (Elang) — per Task_Assignment Phase 2
**Status:** COMPLETE (implementation)

---

## Scope (Elang — Security Hardener)

Berdasarkan `TASK_ASSIGNMENT.md` Phase 2, peran Elang adalah **Security Hardener**: CSRF protection, input sanitization, security headers, dan security-related route validation. Bagian **middleware.ts refactor / auth hardening adalah milik Jiwo** (Lead/Tech) dan tidak disentuh di branch ini (prasyarat Track B merge — file `middleware.ts` belum ada di main).

## Files Created (NEW)

| File | Purpose |
|------|---------|
| `lib/csrf.ts` | CSRF double-submit cookie utilities: token gen, constant-time compare, single-use replay protection, fail-open request guard, cookie/header extraction |
| `lib/inputValidation.ts` | Input sanitization (XSS), payload size guard, safe JSON parse + Zod schema validation, SQL-injection heuristics |
| `lib/rateLimit.ts` | Reusable sliding-window in-memory rate limiter + default endpoint limits *(co-owned with Jiwo per plan)* |
| `__tests__/lib/csrf.test.ts` | 14 CSRF unit tests |
| `__tests__/lib/inputValidation.test.ts` | 19 input validation unit tests |
| `__tests__/lib/rateLimit.test.ts` | 8 rate limiter unit tests |

## Files Modified (MODIFY)

| File | Change |
|------|--------|
| `next.config.mjs` | Added security headers: CSP, X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy |
| `app/api/auth/register/route.ts` | Refactored inline rate-limit to `lib/rateLimit`, added CSRF guard + payload size check |
| `app/api/checkout/customer/route.ts` | Added rate limiting (20/min), CSRF guard, payload size check (financial endpoint) |
| `app/api/checkout/agent/route.ts` | Added rate limiting (20/min per user), CSRF guard, payload size check |

## Security Approach

- **CSRF:** Double-submit cookie pattern. `verifyCsrfRequest` **fails open only when both cookie + header tokens are absent** (legacy clients, no bootstrap yet), but **strictly rejects** any mismatch or single-sided token. This hardens financial/high-impact endpoints without breaking existing clients.
- **Rate limiting:** 5/min on register, 20/min on checkout (per IP / user). Sliding window, auto-expiry, no unbounded memory.
- **Input validation:** Existing Zod schemas retained; added payload size guard (413), CSRF enforcement (403), centralized sanitization + injection heuristics.
- **Security headers:** CSP allows Midtrans Snap domains; blocks inline script injection; nosniff, DENY framing, HSTS, referrer & permissions policies.

## Verification

- `npx tsc --noEmit` — PASS
- `npx eslint <files>` — PASS
- `npm run build` — PASS
- `npm run test:run` — **84 tests passed** (41 new + 43 Phase 1)
- No protected files touched (prisma/schema.prisma, package.json untouched)

## Out of Scope (Jiwo — Tech Lead)

- `middleware.ts` rewrite / auth hardening / route matrix
- `lib/auth.ts` extension
- `e2e/security-*.spec.ts` (Iqbal — QA)

## Notes for Review

- `lib/rateLimit.ts` overlaps Jiwo's Phase 2 deliverable — flagged for review/co-ownership.
- Register rate limiter is a **module-level singleton**; in Next.js serverless the in-memory store resets per warm instance (documented limitation, fine for per-instance hard limit).