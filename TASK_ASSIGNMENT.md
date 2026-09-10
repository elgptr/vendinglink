# Task Assignment & Module Ownership

Dokumen ini memetakan tanggung jawab developer per **track paralel** — bukan stage berurutan. Ketiga track di bawah **tidak punya dependency teknis satu sama lain** dan **bisa dikerjakan bersamaan mulai sekarang** dari `main`, oleh 3 developer sekaligus, tanpa perlu saling menunggu.

---

## Status: 3 Developer Team

| Developer | Nickname | Track |
|-----------|----------|-------|
| Elang | dev-elang | Track A |
| Jiwo | dev-jiwo | Track B |
| Iqbal | dev-iqbal | Track C |

---

## ✅ Fondasi (Sudah Selesai — Tidak Perlu Dikerjakan Ulang)

Sudah live di `main`, jadi semua track di bawah bisa langsung dibangun di atasnya:

- Schema DB: `isApproved`, `outstandingDebt` di `User`; `guideImageUrl` di `Product`; `agentId` nullable + `paymentType`/`isSettled`/`customerPhone` di `Transaction`
- Public Customer (B2C) flow lengkap: `/customer`, `/customer/checkout/[productId]`, `/customer/order/[orderId]`, `/api/checkout/customer`, `/api/customer/order/*`
- Endpoint credit checkout agent: `/api/checkout/agent` (bypass Midtrans, langsung PAID, increment `outstandingDebt`) — backend sudah ada, tinggal disambungkan ke UI (lihat Track A)

---

## 🅰️ Track A: Agent Checkout UX (Sambungkan ke Credit Flow)

**Owner:** @dev-elang
**Bisa mulai:** Sekarang, dari `main`
**Tidak bergantung pada:** Track B, Track C

**Masalah saat ini:** `CheckoutForm.tsx` masih fetch ke `/api/checkout` yang sudah dihapus (sekarang `/api/checkout/agent`). Order page agent (`OrderPageClient.tsx`) masih didesain untuk flow Midtrans/Snap — tapi checkout agent sekarang instant PAID, tidak perlu polling/payment popup.

**Deliverables:**
- [ ] `CheckoutForm.tsx` — fetch ke `/api/checkout/agent`
- [ ] Redesign `app/agent/order/[orderId]/page.tsx` — instant PAID, langsung render success screen (redeem URL + guide image), tanpa Snap popup/polling
- [ ] Komponen baru untuk tampilkan redeem URL + `guideImageUrl` di sisi agent
- [ ] Update copy UI: "Order berhasil, link redeem langsung tersedia"

**Files Owned:**
```
components/agent/CheckoutForm.tsx
components/agent/OrderPageClient.tsx     (redesign besar)
components/agent/AgentSuccessScreen.tsx  (NEW, opsional)
app/agent/order/[orderId]/page.tsx
```

**Boleh dihapus jika tidak dipakai lagi:** `components/agent/SnapPayment.tsx` (cek dulu tidak ada import lain)

## 🅱️ Track B: Agent Registration, Approval & Debt Settlement

**Owner:** @dev-jiwo
**Bisa mulai:** Sekarang, dari `main`
**Tidak bergantung pada:** Track A, Track C

**Deliverables:**
- [ ] Halaman registrasi agent baru (`app/register/page.tsx`) — CTA "Daftar menjadi agen reseller"
- [ ] Endpoint `app/api/auth/register/route.ts` — buat user baru dengan `role: AGENT`, `isApproved: false`
- [ ] Extend `app/api/admin/agents/route.ts`:
  - GET: sertakan `isApproved`, `outstandingDebt` di response
  - PATCH: tambah aksi approve/reject (`isApproved`)
  - Endpoint baru untuk settle debt: reset `outstandingDebt` ke 0, mark transaksi terkait `isSettled: true`
- [ ] Extend `app/admin/agents/page.tsx`:
  - Badge "Menunggu Approval" untuk agent baru
  - Tombol Approve/Reject
  - Kolom outstanding debt + tombol "Tandai Lunas"
- [ ] Extend `middleware.ts` — tambahkan `/register` ke public routes, dan blokir agent `isApproved: false` dari `/agent/*`
- [ ] Extend `lib/auth.ts` — aktifkan pengecekan `isApproved` yang sudah di-comment (baris 36-39)

**Files Owned:**
```
app/register/                       (NEW)
app/api/auth/register/               (NEW)
app/api/admin/agents/route.ts        (extend)
app/admin/agents/page.tsx            (extend)
middleware.ts                        (extend — tambah 1 blok public route + isApproved check)
lib/auth.ts                          (extend — un-comment isApproved check)
```

**Protected (jangan diedit):** `prisma/schema.prisma`, `app/api/checkout/*`, `app/customer/*`, `app/admin/inventory/*`

---

## 🅲️ Track C: Support Kode Redeem & Panduan Penggunaan (Guide Text)

**Owner:** @dev-iqbal
**Bisa mulai:** Sekarang, dari `main`
**Tidak bergantung pada:** Track A, Track B

**Deliverables:**
- [ ] Extend DB Schema (`prisma/schema.prisma`): Tambahkan `type` (String, default "LINK") dan `guideText` (String, nullable) di model `Product`.
- [ ] Extend `app/api/admin/products/route.ts` — terima & simpan `type`, `guideText`, `guideImageUrl` di POST/PATCH.
- [ ] Extend `app/admin/inventory/page.tsx` — form tambah/edit produk:
  - Input dropdown/radio tipe produk ("Link" atau "Kode Redeem").
  - Textarea untuk instruksi "Cara Penggunaan (Step-by-step)".
  - **[TAMBAHAN]** Tambahkan tombol "Upload .md" di samping label textarea "Panduan Penggunaan (Opsional)". Saat admin mengklik dan memilih file `.md`, isi file tersebut langsung dimuat ke textarea `guideText` (gunakan `FileReader.readAsText()`). Tampilkan error toast jika file bukan `.md`. Berlaku di **modal Tambah Produk** dan **modal Edit Produk**.
  - Bypass validasi URL (`isValidUrl`) pada bulk input stock jika produk bertipe Kode Redeem.
- [ ] Modifikasi Halaman Sukses (`app/customer/order/[orderId]/page.tsx` & `app/agent/order/[orderId]/page.tsx`):
  - Ubah tombol "Buka Link" jadi "Salin Kode" jika tipe produk adalah "KODE".
  - Tambahkan tombol "Cara Penggunaan" yang saat diklik memunculkan modal/popup berisi `guideText` dan `guideImageUrl` produk terkait.

**Files Owned:**
```
prisma/schema.prisma                 (extend)
app/api/admin/products/route.ts      (extend)
app/admin/inventory/page.tsx         (extend — termasuk fitur upload .md)
app/customer/order/[orderId]/page.tsx(extend)
app/agent/order/[orderId]/page.tsx   (extend)
```

**Protected (jangan diedit):** `app/admin/agents/*`, `app/api/admin/agents/*`

---

## 📋 Aturan Kolaborasi

### ⚠️ WAJIB: Pull/Clone Terbaru Sebelum Mulai Kerja

> **PENTING:** Sebelum mulai mengerjakan track masing-masing, **WAJIB pull atau clone ulang** dari `main` terbaru. Sudah ada banyak perubahan (fix 404, fitur harga coret, merge conflict resolution, dll) yang belum tentu ada di branch lokal kalian.

```bash
# Jika sudah punya repo lokal:
git checkout main
git pull origin main

# Atau clone ulang dari awal:
git clone https://github.com/elgptr/vendinglink.git
cd vendinglink
npm install
```

> Jika tidak pull terbaru, **dijamin akan conflict** saat PR.

### File Bersama (Coordinate Dulu via Issue)

Track A/B/C sudah didesain **zero overlap**. Kalau ternyata butuh edit file di luar daftar "Files Owned" milikmu:

1. Cek dulu apakah file itu milik track lain di atas
2. Kalau iya → buka GitHub Issue, tag pemilik track, jangan langsung edit
3. Kalau file netral (`lib/utils.ts`, `components/ui/*`) → boleh edit langsung, kecil risiko konflik karena biasanya perubahan additive

### Protected Files (Berlaku untuk Semua Track)

- `prisma/schema.prisma` — sudah final untuk kebutuhan saat ini, kalau butuh field baru buka issue dulu
- `package.json` — tidak boleh nambah dependency tanpa approval tech lead

### Satu-satunya Titik yang Perlu Perhatian Ekstra

Track B (Jiwo) mengubah `middleware.ts` untuk nambah `isApproved` check dan public route `/register`. Ini **tidak menghalangi** Track A/C mulai kerja sama sekali — mereka tidak menyentuh `middleware.ts`. Jiwo cukup review diff-nya sendiri sebelum PR supaya tidak menghapus/rusak public routes yang sudah ada (`/customer`, `/api/customer`, dll).

---

## Git Branch Naming

```
feat/dev-elang/track-a-agent-checkout-ux
feat/dev-jiwo/track-b-agent-approval
feat/dev-iqbal/track-c-guide-image
```

Kalau 1 track butuh beberapa PR terpisah, pecah lagi:
```
feat/dev-elang/track-a-checkout-form-fix
feat/dev-elang/track-a-order-page-redesign
```

---

## PR Approval Workflow

Setiap PR butuh:
- ✅ Passing CI/CD (`build`, `lint`)
- ✅ ≥1 review dari dev lain
- ✅ Tidak ada conflict dengan `main`
- ✅ `.env.example` diupdate kalau ada env var baru

**Merge:** Squash and Merge (1 commit bersih per fitur)

---

## Communication Protocol

**Mulai kerja:** Buka GitHub Issue "Starting Track A/B/C — [deskripsi]", label `track-a`/`track-b`/`track-c`

**Kalau nemu overlap tak terduga:** Slack/comment issue segera, jangan diam-diam edit file track lain

**Selesai:** PR ke `main`, tag reviewer, tunggu approval — track lain **tidak perlu** menunggu status track ini

---

**Last Updated:** 2026-09-07 | **Version:** 2.1 — Track paralel dengan tim: Elang (Track A), Jiwo (Track B), Iqbal (Track C)


**Protected (jangan diedit):** `prisma/schema.prisma`, `lib/auth.ts`, `middleware.ts`, `app/api/checkout/agent/route.ts`

---
