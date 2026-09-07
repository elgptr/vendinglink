# 🚀 Branching Strategy — VendingLink (Model Track Paralel)

Panduan setup kolaborasi 3 developer **kerja bersamaan, tanpa saling menunggu**.

---

## Kenapa Model Ini?

Sebelumnya kita pakai "Stage 1 → 2 → 3 → ... → 6" berurutan — tapi itu bikin dev berikutnya harus nunggu dev sebelumnya selesai, padahal secara teknis banyak yang tidak saling bergantung. Model baru: **3 Track paralel**, masing-masing menyentuh file yang berbeda sama sekali, jadi bisa dikerjakan bersamaan mulai sekarang dari `main`.

Detail pembagian lengkap: lihat `TASK_ASSIGNMENT.md`.

| Track | Fokus | Files |
|-------|-------|-------|
| A | Agent Checkout UX | `components/agent/CheckoutForm.tsx`, `components/agent/OrderPageClient.tsx`, `app/agent/order/[orderId]/` |
| B | Agent Registration, Approval & Debt Settlement | `app/register/`, `app/api/auth/register/`, `app/admin/agents/`, `app/api/admin/agents/`, `middleware.ts`, `lib/auth.ts` |
| C | Product Guide Image & Inventory | `app/admin/inventory/`, `app/api/admin/products/` |

---

## Setup GitHub Branch Protection (Admin, Sekali Saja)

Repository → Settings → Branches → Add rule

**Pattern:** `main`
- ✅ Require pull request reviews: Min `1`
- ✅ Dismiss stale pull request approvals
- ✅ Require status checks: `build`, `lint`
- ✅ Require up to date before merge
- ✅ Restrict push: Admins only
- ❌ No force push, no deletions

Cukup satu branch (`main`) — tidak perlu setup `dev`/`staging` karena tidak dipakai.

---

## Cara Mulai (Setiap Developer)

```bash
git clone https://github.com/elgptr/vendinglink.git && cd vendinglink
npm install
cp .env.example .env.local   # isi credentials lokal

git checkout main && git pull origin main
git checkout -b feat/dev-yourname/track-x-feature-name
```

Kerja di file-file milik track kamu (lihat tabel di atas / `TASK_ASSIGNMENT.md`), commit sering, push, lalu buka PR ke `main` begitu siap — **tidak perlu menunggu track lain**.

---

## Kenapa Ini Aman Dikerjakan Bersamaan?

Ketiga track sudah dipetakan supaya **zero file overlap**:

```
Track A: components/agent/CheckoutForm.tsx, OrderPageClient.tsx, app/agent/order/*
Track B: app/register/, app/api/auth/register/, app/admin/agents/, app/api/admin/agents/, middleware.ts, lib/auth.ts
Track C: app/admin/inventory/, app/api/admin/products/
```

Selama masing-masing tetap di file miliknya, 3 PR bisa jalan paralel dan merge kapan pun siap tanpa saling tunggu.

## File yang Perlu Coordinate Dulu

| File | Kenapa | Aturan |
|------|--------|--------|
| `prisma/schema.prisma` | Skema sudah final untuk kebutuhan sekarang | Kalau butuh field baru → buka issue dulu |
| `package.json` | Bisa bikin dependency conflict | Jangan nambah dependency tanpa approval tech lead |

`middleware.ts` dan `lib/auth.ts` memang di daftar Track B, tapi itu **tidak menghalangi** Track A/C mulai kerja — mereka tidak menyentuh dua file itu sama sekali.

---

## FAQ

**Q: Track saya harus nunggu track lain selesai dulu?**
A: Tidak. Semua track independen, mulai kapan saja dari `main`.

**Q: PR saya konflik dengan PR track lain?**
A: Seharusnya tidak terjadi karena file terpisah. Kalau terjadi (biasanya di file netral seperti `lib/utils.ts`), rebase dan resolve manual, lalu lanjut merge — tidak perlu menunggu PR lain.

**Q: Boleh 3 PR dari 3 track merge di hari yang sama?**
A: Ya, silakan. Merge begitu masing-masing approved.

**Q: Ada dependency riil antar track?**
A: Tidak ada saat ini. Kalau nanti ternyata ada saat development (misal Track B butuh sesuatu dari Track A), buka issue dan koordinasi langsung — jangan diam-diam block.

---

**Last Updated:** 2026-09-07 | **Version:** 2.0 — Track paralel, single branch `main`
