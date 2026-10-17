# 🛠️ Tech Stack & Dependencies — VendingLink Storefront

Dokumentasi lengkap teknologi, runtime, pustaka, dan alasan teknis di balik arsitektur VendingLink Storefront.

---

## 1. Lapisan Inti Aplikasi

| Lapisan | Teknologi | Versi | Alasan Pemilihan & Fungsi |
|---------|-----------|-------|---------------------------|
| **Framework** | Next.js | 16 (App Router) | React Server Components, server actions, route handlers bawaan, serta rendering hybrid (SSR/SSG/ISR). |
| **Bahasa** | TypeScript | 5.x | Keamanan tipe data statis ketat (`strict: true`) di seluruh kode frontend dan backend. |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS dengan desain responsif, dark mode, dan performa bundle optimal tanpa runtime overhead. |
| **Icon Library** | Lucide React | Latest | Kumpulan ikon SVG konsisten, modern, dan ringan. |
| **Database** | PostgreSQL | 13+ | Database relasional dengan integritas ACID penuh, support connection pooling, dan performa tinggi (Neon Cloud / Local). |
| **ORM** | Prisma | 5.22.0 | Type-safe database queries, auto-generated TypeScript client, serta migrasi skema terkelola. |
| **Autentikasi** | NextAuth.js | v5 (beta) | Manajemen sesi JWT berbasis cookies aman (`HttpOnly`, `SameSite`), proteksi rute middleware RBAC. |
| **Validasi** | Zod | 3.x | Validasi skema runtime untuk semua input request body API dan parsing variabel lingkungan. |

---

## 2. Integrasi Layanan & Pihak Ketiga

### Payment Gateway — Midtrans
- **Pustaka:** `midtrans-client`
- **Fungsi:** Mengakomodasi berbagai metode pembayaran lokal Indonesia (QRIS, GoPay, ShopeePay, Virtual Account BCA/Mandiri/BRI/BNI, serta Kartu Kredit).
- **Keamanan:** Verifikasi tanda tangan digital (`SHA-512`) pada endpoint webhook pembayaran untuk mencegah pemalsuan callback.

### WhatsApp Notification Engine — SaungWA
- **Modul:** `lib/whatsapp.ts`
- **Fungsi:** Pengiriman pesan WhatsApp notifikasi instan:
  - Tautan pelacakan pre-order unik (`/pre-order/track/[trackingToken]`) saat request dibuat.
  - Pembaruan status live pencarian agen ("bagian Purchasing kami").
  - Peringatan kesiapan stok produk (`STOCKED`) disertai tombol beli.
  - Konfirmasi pembayaran dan rincian pesanan digital.

### Procurement & Agentic Bridge — Hermes Bridge
- **Arsitektur:** Terpisah di repo `vendinglink_bridge`.
- **Teknologi Bridge:** Node.js, Express, BullMQ, Redis, Telegraf (Telegram Bot), Anthropic Claude 3.5 Sonnet.
- **Protokol:** HTTP REST API asinkron dua arah dengan header `Authorization: Bearer <BRIDGE_SECRET_KEY>` dan `Idempotency-Key`.

### AI Assistant & Sales Insight
- **Pustaka:** OpenAI-compatible API client (`fetch` native)
- **Fungsi:** Chatbot bantuan pelanggan, auto-generate deskripsi produk, dan streaming analisis penjualan mingguan ke admin dashboard.

---

## 3. Pengujian & Kualitas Kode (Quality Assurance)

| Alat Pengujian | Kategori | Lingkup & Target |
|----------------|----------|------------------|
| **Vitest** | Unit & Integrasi | Pengujian logika bisnis (`lib/`), guard (`preorderGuard.ts`), sanitasi API, kalkulasi harga, dan webhook handler. (112+ test cases, target kelulusan 100%). |
| **Playwright** | End-to-End (E2E) | Pengujian alur pengguna nyata di peramban (pencarian katalog, checkout, pelacakan live pre-order). |
| **ESLint** | Analisis Statis | Memastikan kepatuhan terhadap standar sintaks dan mencegah code smells. |

---

## 4. Keamanan & Kriptografi

- **Hashing Kata Sandi:** `bcryptjs` untuk akun Admin dan Agen.
- **Enkripsi Kredensial:** Algoritma `AES-256-GCM` pada `lib/encryption.ts` untuk mengamankan API key pihak ketiga (AI, Google Drive Service Account) di dalam database.
- **Opaque Tracking Tokens:** Pembangkitan token acak berentropi tinggi menggunakan `crypto.randomBytes(16).toString("hex")` menghasilkan token 32-karakter unik dengan prefiks `trk_`.
- **Sanitasi Data Supplier (Zero-Exposure):** Filter server-side wajib yang memastikan harga modal supplier (`quotedPrice`), kode supplier (`RZK`), dan SKU hulu tidak pernah bocor ke sisi klien.

---

**See Also:** [Directory Structure](./directory-structure.md) | [System Design](./system-design.md)
