# Dokumentasi Payment Gateway: Midtrans & DOKU Checkout

VendingLink dilengkapi dengan arsitektur **Dual Gateway** yang fleksibel, memungkinkan Admin untuk beralih antara **Midtrans Snap** dan **DOKU Checkout** secara instan melalui Admin Panel.

---

## 1. Quick Switch (Admin Panel)

Admin dapat berpindah gateway kapan saja tanpa perlu restart aplikasi atau redeploy:
1. Masuk ke **Admin Panel** (`/admin`).
2. Buka menu **Pengaturan** (`/admin/settings`).
3. Pada kartu **Payment Gateway Aktif**, klik gateway yang ingin digunakan:
   - **Midtrans Snap**: Mode default popup pembayaran Snap.
   - **DOKU Checkout**: Integrasi hosted checkout resmi DOKU.

---

## 2. Spesifikasi Merchant DOKU (Jokul)

- **Model Produk:** DOKU Checkout (Jokul Hosted Payment Page).
- **Metode Pembayaran:** Otomatis mendukung QRIS, Virtual Account (BCA, Mandiri, BRI, BNI, Permata, dll), E-Wallet (OVO, DANA, ShopeePay), dan Gerai Retail (Alfamart/Indomaret).
- **MCC (Merchant Category Code):**
  - **`5817`** — *Digital Goods: Applications (Excluding Games)* (Rekomendasi Utama)
  - **`5818`** — *Digital Goods: Multi-Category Merchant*
  - **`5734`** — *Computer Software Stores*

---

## 3. Konfigurasi Environment Variable (`.env`)

### DOKU:
```env
DOKU_CLIENT_ID="BRN-0275-1789521531580"
DOKU_SECRET_KEY="SK-..."
DOKU_PUBLIC_KEY="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQE..."
DOKU_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
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
| **DOKU** | `https://toko.txsiber.online/api/doku/webhook` | Dashboard DOKU > *Settings > Notification URL* |
| **Midtrans** | `https://toko.txsiber.online/api/midtrans/webhook` | Dashboard Midtrans > *Settings > Configuration > Payment Notification URL* |

---

## 5. Alur Transaksi & Keamanan Stok

1. **Checkout**: Route `/api/checkout/customer` membaca gateway aktif (`getActivePaymentGateway()`).
2. **Sesi Pembayaran**:
   - Jika Midtrans: Membuat `snapToken`.
   - Jika DOKU: Membuat `paymentUrl` via signature HMAC-SHA256 & Digest resmi DOKU.
3. **Pelunasan (Webhook Callback)**:
   - Signature callback diverifikasi menggunakan secret key.
   - Status transaksi diubah menjadi `PAID` secara atomik (`prisma.$transaction`).
   - Stok link otomatis dialokasikan dan dikirimkan ke pembeli di layar sukses order (`/customer/order/[orderId]`).