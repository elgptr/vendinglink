# Dokumentasi Payment Gateway: Midtrans, DOKU, & Kasera Pay

VendingLink dilengkapi dengan arsitektur **Triple Gateway** yang fleksibel, memungkinkan Admin untuk beralih antara **Midtrans Snap**, **DOKU Checkout**, dan **Kasera Pay (QRIS Only)** secara instan melalui Admin Panel.

---

## 1. Quick Switch (Admin Panel)

Admin dapat berpindah gateway kapan saja tanpa perlu restart aplikasi atau redeploy:
1. Masuk ke **Admin Panel** (`/admin`).
2. Buka menu **Pengaturan** (`/admin/settings`).
3. Pada kartu **Payment Gateway Aktif**, klik gateway yang ingin digunakan:
   - **Midtrans Snap**: Mode default popup pembayaran Snap (QRIS, VA Bank, GoPay, dsb).
   - **DOKU Checkout**: Integrasi hosted checkout resmi DOKU.
   - **Kasera Pay**: Integrasi Direct QRIS instan dengan verifikasi otomatis & expiry 15 menit.

---

## 2. Spesifikasi Gateway

### Kasera Pay (QRIS Direct API)
- **Model Produk:** Direct QRIS API (`POST /v1/transactions` dengan `payment_methods: ["qris"]`).
- **Masa Berlaku QRIS:** 15 Menit (`expires_in_minutes: 15`).
- **Verifikasi Webhook:** HMAC-SHA256 timestamped (`Kasera-Signature-V1`) dengan toleransi 5 menit.
- **Idempotensi:** Header `Idempotency-Key` menggunakan `orderId`.

### DOKU Checkout (Jokul)
- **Model Produk:** DOKU Checkout (Jokul Hosted Payment Page).
- **Metode Pembayaran:** Otomatis mendukung QRIS, Virtual Account (BCA, Mandiri, BRI, BNI, Permata, dll), E-Wallet (OVO, DANA, ShopeePay), dan Gerai Retail (Alfamart/Indomaret).
- **MCC (Merchant Category Code):**
  - **`5817`** — *Digital Goods: Applications (Excluding Games)* (Rekomendasi Utama)
  - **`5818`** — *Digital Goods: Multi-Category Merchant*
  - **`5734`** — *Computer Software Stores*

### Midtrans Snap
- **Model Produk:** Snap Popup Modal / Redirect.
- **Metode Pembayaran:** QRIS, GoPay, Virtual Account, Kartu Kredit.

---

## 3. Konfigurasi Environment Variable (`.env`)

### Kasera Pay:
```env
KASERA_API_KEY="kp_live_..."
KASERA_WEBHOOK_SECRET="whsec_..."
KASERA_MERCHANT_CODE="9E7EC9L5"
KASERA_MERCHANT_ID="8c9cca17-1833-4ebd-9f78-f6d989d6f987"
```

### DOKU:
```env
DOKU_CLIENT_ID="BRN-0275-1789521531580"
DOKU_SECRET_KEY="SK-..."
DOKU_IS_PRODUCTION="false" # Ubah ke "true" jika sudah live
```

### Midtrans:
```env
MIDTRANS_SERVER_KEY="SB-Mid-server-..."
MIDTRANS_CLIENT_KEY="SB-Mid-client-..."
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="SB-Mid-client-..."
MIDTRANS_IS_PRODUCTION="false"
NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION="false"
```

---

## 4. Konfigurasi Webhook / Callback URL

Pastikan URL berikut terdaftar di dashboard masing-masing payment gateway:

| Gateway | Notification / Webhook URL | Target Dashboard |
|---|---|---|
| **Kasera Pay** | `https://toko.txsiber.online/api/kasera/webhook` | Dashboard Kasera > *Developer > Webhook Endpoints* |
| **DOKU** | `https://toko.txsiber.online/api/doku/webhook` | Dashboard DOKU > *Settings > Notification URL* |
| **Midtrans** | `https://toko.txsiber.online/api/midtrans/webhook` | Dashboard Midtrans > *Settings > Configuration > Payment Notification URL* |

---

## 5. Alur Transaksi & Keamanan Stok

1. **Checkout**: Route `/api/checkout/customer` membaca gateway aktif (`getActivePaymentGateway()`).
2. **Sesi Pembayaran**:
   - Jika Kasera: Membuat pembayaran QRIS 15 menit via Direct API Kasera, menyimpan QR string dan token checkout URL.
   - Jika DOKU: Membuat `paymentUrl` via signature HMAC-SHA256 & Digest resmi DOKU.
   - Jika Midtrans: Membuat `snapToken`.
3. **Pelunasan (Webhook Callback)**:
   - Signature callback diverifikasi menggunakan secret key masing-masing gateway.
   - Status transaksi diubah menjadi `PAID` secara atomik (`prisma.$transaction`).
   - Stok link otomatis dialokasikan dan dikirimkan ke pembeli di layar sukses order (`/customer/order/[orderId]`).