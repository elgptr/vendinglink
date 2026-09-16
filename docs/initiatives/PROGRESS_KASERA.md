# Progress Report: Inisiatif Integrasi Kasera Pay (QRIS Only)

| Field | Value |
|---|---|
| **Inisiatif** | Integrasi Gateway Pembayaran ke-3: Kasera Pay (QRIS Direct API) |
| **Branch** | `feat/dev-agent/kasera-pay-qris` |
| **Tanggal Selesai** | 2026-09-16 |
| **Status** | ✅ **Selesai (Completed & Verified)** |
| **Pelaksana** | Developer Agent (`docs/agent-guides/roles/dev-agent.md`) |
| **Reviewer / Lead** | iqbal.fawzan |

---

## 1. Latar Belakang & Tujuan

VendingLink sebelumnya mengimplementasikan Dual Gateway Architecture (Midtrans Snap & DOKU Checkout). Inisiatif ini menambahkan **Kasera Pay** sebagai opsi gateway pembayaran ke-3 dengan fokus khusus pada pembayaran instan **QRIS Direct API** untuk meningkatkan tingkat konversi pembayaran, kecepatan scan QR, dan fleksibilitas merchant.

---

## 2. Fitur & Spesifikasi yang Diimplementasikan

1. **Client API Kasera Pay (`lib/kasera.ts`)**:
   - Pembuatan transaksi Direct QRIS via endpoint `POST /v1/transactions` dengan parameter `payment_methods: ["qris"]` dan `expires_in_minutes: 15`.
   - Idempotency-Key menggunakan `orderId` unik pesanan.
   - Pengecekan status transaksi via `GET /v1/transactions/:id` untuk keperluan fallback polling reconciliation.
   - Verifikasi signature webhook aman dengan algoritma HMAC-SHA256:
     - Header modern `Kasera-Signature-V1` (`t=<unix>,v1=<hex>`) dengan toleransi timestamp maksimal 5 menit (300 detik) untuk pencegahan serangan replay.
     - Dukungan grace period rotasi secret (multi-entry `v1`).
     - Fallback ke legacy `Kasera-Signature` (`<hex>`).
     - Komparasi waktu-konstan (`crypto.timingSafeEqual`) untuk mitigasi timing attack.

2. **Webhook Handler (`app/api/kasera/webhook/route.ts`)**:
   - Menerima event `payment.paid` dari Kasera Pay dan memetakan ke status internal `settlement`.
   - Memetakan event `payment.expired` atau `payment.failed` ke status `expire`.
   - Menggunakan fungsi atomik `applyMidtransStatusUpdate` (`prisma.$transaction`) untuk klaim stok FIFO yang aman dari *race condition*.
   - Idempoten: aman menerima pengiriman webhook berulang (at-least-once delivery).

3. **Perlindungan Rute (`lib/routeProtection.ts`)**:
   - Menambahkan `/api/kasera/webhook` dan `/api/doku/webhook` ke `PUBLIC_ROUTES` agar webhook payment gateway tidak diblokir oleh edge proxy/middleware.

4. **Admin Gateway Toggle 3-Arah (`components/admin/PaymentGatewaySettingsCard.tsx` & `app/api/admin/settings/route.ts`)**:
   - Memperluas tipe gateway `PaymentGatewayType = "MIDTRANS" | "DOKU" | "KASERA"`.
   - Antarmuka Admin Panel (`/admin/settings`) dengan 3 kartu pilihan (Midtrans Snap, DOKU Checkout, Kasera Pay) beserta indikator status kredensial `.env`.
   - Perubahan berlaku instan secara real-time tanpa restart server.

5. **Customer Checkout & QRIS Display UI (`components/customer/CustomerSnapPayment.tsx`)**:
   - Peringatan visual batas waktu pembayaran 15 menit kepada pengguna sesuai spesifikasi.
   - Live countdown timer interaktif (15:00 mundur ke 00:00) yang memberikan tanda bahaya jika waktu tersisa < 3 menit.
   - Rendering QR code QRIS interaktif dan tombol pembuka halaman pembayaran Kasera.
   - Polling status otomatis setiap 2 detik yang langsung mengarahkan ke halaman sukses jika pembayaran terkonfirmasi.

6. **Fallback Polling Reconciliation (`app/api/customer/order/status/route.ts`)**:
   - Secara aktif mengecek status pembayaran ke API Kasera Pay ketika pesanan berstatus `PENDING` jika webhook dari gateway terlambat atau terhalang jaringan.

---

## 3. Konfigurasi Lingkungan (.env)

```env
# ─── Kasera Pay (Live Only) ───────────────────────────────────────────────────
KASERA_API_KEY="kp_live_..."
KASERA_WEBHOOK_SECRET="whsec_..."
KASERA_MERCHANT_CODE="9E7EC9L5"
KASERA_MERCHANT_ID="8c9cca17-1833-4ebd-9f78-f6d989d6f987"
```

Webhook Endpoint yang didaftarkan di Dashboard Kasera:
`https://toko.txsiber.online/api/kasera/webhook`

---

## 4. Hasil Pengujian & Verifikasi

- **Unit & Integration Test Suite (`vitest`)**:
  - `__tests__/lib/kasera.test.ts`: 11 passed (100%)
  - `__tests__/api/kasera-webhook.test.ts`: 6 passed (100%)
  - Total: **17 passed, 0 failed**.
- **Next.js Production Build (`npm run build`)**:
  - Sukses tanpa error TypeScript maupun Turbopack bundling (29 rute terkompilasi sempurna).
