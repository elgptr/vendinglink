# 🌐 API Architecture — VendingLink Storefront

Dokumentasi spesifikasi antarmuka pemrograman aplikasi (REST API) VendingLink Storefront, mencakup endpoint pelanggan, integrasi pembayaran, webhook komunikasi dua arah dengan Hermes Bridge, serta endpoint administratif.

---

## 1. Standar & Konvensi Global

### Format & Header
- **Request / Response Body:** JSON (`application/json; charset=utf-8`).
- **Autentikasi Sesi:** NextAuth JWT via HTTP-only Cookies untuk rute `/admin/*` dan `/agent/*`.
- **Autentikasi Antar-Sistem (M2M):** Bearer Token (`Authorization: Bearer <BRIDGE_SECRET_KEY>`) untuk rute `/api/bridge/*`.
- **Rute Publik Tanpa Autentikasi:** Endpoint katalog publik, tracking token pre-order (`/api/customer/product-requests/track/*`), dan inisiasi checkout customer.

### Standar Status Kode HTTP
| Kode | Makna | Penggunaan Umum |
|------|-------|-----------------|
| `200 OK` | Sukses | Permintaan pembacaan atau update berhasil |
| `201 Created` | Berhasil Dibuat | Entitas baru berhasil dibuat (pre-order, topup stok) |
| `400 Bad Request` | Permintaan Tidak Valid | Parameter kurang, Zod schema validation gagal |
| `401 Unauthorized` | Autentikasi Gagal | Ketiadaan session JWT atau Bearer token tidak valid |
| `403 Forbidden` | Akses Ditolak | Role pengguna tidak memenuhi prasyarat (e.g. non-admin) |
| `404 Not Found` | Data Tidak Ditemukan | Token tracking, ID produk, atau resource tidak ada |
| `409 Conflict` | Konflik Status | Pelanggan masih memiliki pre-order aktif berjalan |
| `429 Too Many Requests` | Rate Limit Terlampaui | Melebihi kuota request per menit / IP |
| `500 Internal Error` | Kesalahan Server | Galat database atau kegagalan internal |

---

## 2. On-Demand Pre-Order & Live Tracking APIs

### 2.1 Buat Permintaan Pre-Order
Membuat permintaan pengadaan produk baru ketika stok fisik kosong.

- **Endpoint:** `POST /api/customer/product-requests`
- **Autentikasi:** Publik
- **Rate Limit:** 5 request / menit per IP

**Request Body:**
```json
{
  "productId": "cmv1234567890abcdef",
  "phone": "08123456789",
  "query": "Request lisensi Canva Pro 1 Bulan"
}
```

**Guard Server-Side:**
1. Nomor WhatsApp dinormalisasi otomatis menjadi format `628123456789`.
2. `getActivePreOrderForPhone(phone)`: Menolak request jika nomor telah memiliki request aktif berstatus `PENDING_SOURCING`, `AGENT_PURCHASING`, atau `STOCKED` (HTTP 409 Conflict).
3. `checkExistingStockRedirect(productId)`: Memeriksa apakah ada stok fisik `AVAILABLE` di `RedeemStock`. Jika ada, sistem menolak pre-order dan mengembalikan flag redirect ke checkout langsung.

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Permintaan pre-order berhasil dibuat",
  "requestId": "cmvb123abc456",
  "trackingToken": "trk_010c71cdc485cb907e41efb2ed21027e",
  "trackingUrl": "/pre-order/track/trk_010c71cdc485cb907e41efb2ed21027e",
  "status": "PENDING_SOURCING"
}
```

---

### 2.2 Pantau Status Tracking Pre-Order (Zero-Login Public)
Membaca progres langsung pencarian agen berdasarkan token unik tanpa login.

- **Endpoint:** `GET /api/customer/product-requests/track/:trackingToken`
- **Autentikasi:** Publik (Token Opaque)
- **Cache:** `no-store, max-age=0`

**Response (200 OK):**
```json
{
  "success": true,
  "request": {
    "id": "cmvb123abc456",
    "status": "AGENT_PURCHASING",
    "productId": "cmv1234567890abcdef",
    "productName": "Canva Pro 1 Bulan",
    "productSlug": "canva-pro-1-bulan",
    "productImageUrl": "/images/products/canva.png",
    "estimatedPrice": 25000,
    "strikethroughPrice": 42000,
    "discountPercent": 40,
    "agentStatusLabel": "bagian Purchasing kami",
    "updatedAt": "2026-10-17T12:00:00.000Z",
    "createdAt": "2026-10-17T11:45:00.000Z"
  }
}
```

> **🛡️ Invarian Privasi (Strict Redaction):**  
> Response ini **TIDAK PERNAH** memuat properti:
> - `quotedPrice` (harga modal supplier)
> - `foundSupplierCode` (kode supplier, misal: `RZK`)
> - `foundProductId` (SKU supplier)
> Nilai `estimatedPrice` selalu diambil dari `product.price` etalase.

---

## 3. Checkout & Payment APIs

### 3.1 Inisiasi Pembayaran Retail (Customer Checkout)
Membuat order dan menerbitkan Midtrans Snap Token.

- **Endpoint:** `POST /api/checkout/customer`
- **Autentikasi:** Publik
- **Query Parameter Opsional:** `?requestId=cmvb123abc456`

**Request Body:**
```json
{
  "productId": "cmv1234567890abcdef",
  "customerName": "Budi Santoso",
  "customerPhone": "08123456789",
  "paymentType": "MIDTRANS",
  "discountCode": "PROMOHEMAT",
  "requestId": "cmvb123abc456"
}
```

**Logika Penanganan Stok & Pre-Order:**
- **Jalur Reguler (tanpa `requestId`):** Memeriksa ketersediaan minimal 1 item `RedeemStock(AVAILABLE)`. Jika 0, mengembalikan HTTP 400 "Stok habis".
- **Jalur Pre-Order (dengan `requestId`):** Memverifikasi bahwa `ProductRequest` berstatus `STOCKED`, cocok dengan `productId`, dan belum pernah ditautkan ke transaksi lain (`orderId === null`). Validasi stok fisik lokal dilewati karena pesanan menggunakan stok JIT agen.
- **Harga yang Ditagihkan:** Selalu menggunakan harga jual katalog (`product.price`) setelah dikurangi diskon voucher jika ada (harga modal supplier `quotedPrice` tidak pernah dipakai sebagai nominal tagihan).

**Response (200 OK):**
```json
{
  "success": true,
  "transactionId": "TRX-20261017-ABC123",
  "snapToken": "snap-token-midtrans-xyz",
  "redirectUrl": "https://app.midtrans.com/snap/v2/vtweb/..."
}
```

---

### 3.2 Midtrans Webhook Callback
Menerima notifikasi status pembayaran dari Midtrans Payment Gateway.

- **Endpoint:** `POST /api/midtrans/webhook`
- **Autentikasi:** Signature Hash Verification (`SHA512(order_id + status_code + gross_amount + server_key)`)

**Aksi Saat Status Settlement (`PAID`):**
1. Status `Transaction` diubah menjadi `PAID`.
2. Mengklaim item `RedeemStock` (jika jalur fisik).
3. **JIT Handshake Pre-Order:** Jika transaksi terhubung dengan `ProductRequest`:
   - Status request diubah menjadi `ORDERED` / `FULFILLED`.
   - Mengirim notifikasi WhatsApp rincian pembayaran ke pembeli via SaungWA.
   - Menjalankan pemanggilan asinkron ke Hermes Bridge `confirmBridgeRequest(requestId)` untuk memicu auto-purchasing di supplier hulu.
   - Mencatat event audit `TRACKING_TOKEN_FULFILLED`.

---

## 4. Bridge Inbound & Webhook APIs

### 4.1 Update Status Request dari Hermes Bridge
Menerima notifikasi perubahan status pencarian stok dari Bridge worker.

- **Endpoint:** `POST /api/bridge/webhook/request-update`
- **Autentikasi:** `Authorization: Bearer <BRIDGE_SECRET_KEY>`

**Request Body:**
```json
{
  "requestId": "cmvb123abc456",
  "status": "FOUND",
  "customerRef": "cust_opaque_id",
  "quotedPrice": 18000,
  "supplierCode": "RZK",
  "foundProductId": "rzk-canva-1m",
  "idempotencyKey": "req_update_idemp_key"
}
```

**Perilaku Server:**
- Memperbarui kolom internal `ProductRequest` (`status`, `quotedPrice`, `foundSupplierCode`, `foundProductId`).
- Mengirim pesan WhatsApp pembaruan status ke pelanggan via SaungWA.
- Memberikan respon HTTP 200 dalam waktu < 5 detik.

---

### 4.2 Webhook Topup Stok dari Bridge
Menyuntikkan stok lisensi/kode hasil pembelian otomatis ke database Storefront.

- **Endpoint:** `POST /api/bridge/webhook/stock/topup`
- **Autentikasi:** `Authorization: Bearer <BRIDGE_SECRET_KEY>`
- **Header Tambahan:** `Idempotency-Key: BRG-YYYYMMDD-XXXXXX`

**Request Body:**
```json
{
  "transaction_id": "BRG-20261017-001",
  "product_id": "cmv1234567890abcdef",
  "supplier_code": "RZK",
  "supplier_product_id": "rzk-canva-1m",
  "added_qty": 1,
  "items": ["https://redeem.canva.com/license-key-here"],
  "source": "BRIDGE_BOT"
}
```

---

### 4.3 Registrasi Pemetaan SKU Produk
Mendaftarkan relasi antara SKU VendingLink dan ID produk supplier eksternal.

- **Endpoint:** `POST /api/bridge/mappings`
- **Autentikasi:** `Authorization: Bearer <BRIDGE_SECRET_KEY>`

---

## 5. Ringkasan Endpoint Keseluruhan

| Method | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| `POST` | `/api/customer/product-requests` | Publik | Inisiasi pre-order on-demand baru |
| `GET` | `/api/customer/product-requests/track/:token` | Publik | Cek live status tracking pre-order |
| `POST` | `/api/checkout/customer` | Publik | Inisiasi pembayaran retail Midtrans |
| `POST` | `/api/midtrans/webhook` | Publik (Sig) | Webhook status pembayaran Midtrans |
| `GET` | `/api/customer/orders` | Publik (Rate) | Challenge riwayat pesanan (5 opsi produk) |
| `POST` | `/api/customer/orders` | Publik (Rate) | Verifikasi bukti pembelian & rilis order |
| `GET` | `/api/promos/active` | Publik | Daftar voucher & promo terjadwal aktif |
| `POST` | `/api/bridge/webhook/request-update` | M2M Bearer | Update status request dari Bridge |
| `POST` | `/api/bridge/webhook/stock/topup` | M2M Bearer | Injeksi stok otomatis dari Bridge |
| `POST` | `/api/bridge/mappings` | M2M Bearer | Manajemen mapping SKU produk supplier |
| `GET/POST`| `/api/admin/products` | ADMIN | CRUD katalog produk |
| `GET/POST`| `/api/admin/stock` | ADMIN | Manajemen & upload stok CSV |
| `GET` | `/api/admin/reports` | ADMIN | Laporan transaksi & unifikasi diskon |
| `GET/POST`| `/api/admin/voucher-rules` | ADMIN | Aturan promo berjadwal & referee discount |
| `GET/POST`| `/api/admin/payout-batches` | ADMIN | Batch payout komisi referral |

---

**See Also:** [System Design](./system-design.md) | [Database Schema](./database-schema.md)
