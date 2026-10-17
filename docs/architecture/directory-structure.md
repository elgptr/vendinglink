# 📁 Directory Structure — VendingLink Storefront

Panduan lengkap tata letak berkas dan organisasi direktori pada repositori VendingLink Storefront.

---

## 1. Peta Direktori Utama

```
vendinglink/
├── app/                                 # Next.js App Router (Pages, Layouts, API Routes)
│   ├── (auth)/login/                   # Halaman otentikasi login
│   ├── admin/                          # Dashboard Admin (Produk, Stok, Laporan, Voucher, Payouts)
│   │   ├── inventory/                  # Manajemen produk & stok CSV
│   │   ├── reports/                    # Laporan penjualan, diskon, & batch payout referral
│   │   ├── voucher-rules/              # Manajemen aturan promo & voucher berjadwal
│   │   └── settings/                   # Pengaturan konfigurasi AI & Google Drive
│   ├── agent/                          # Portal Agen VendingLink (B2B debt-based checkout)
│   ├── customer/                       # Alur Publik Pelanggan
│   │   ├── checkout/[productId]/       # Halaman kasir checkout retail (mendukung ?requestId=...)
│   │   └── orders/                     # Halaman riwayat pesanan (terproteksi challenge)
│   ├── pre-order/                      # Alur Pelacakan Pre-Order Publik
│   │   └── track/[trackingToken]/      # Halaman tracking live on-demand tanpa login
│   ├── api/                            # Backend API Handlers
│   │   ├── admin/                      # Endpoint operasional admin
│   │   ├── bridge/                     # Endpoint integrasi dengan Hermes Bridge
│   │   │   ├── webhook/request-update/ # Webhook status pencarian stok bridge
│   │   │   ├── webhook/stock/topup/    # Webhook injeksi stok otomatis
│   │   │   └── mappings/               # Registrasi mapping SKU produk supplier
│   │   ├── customer/                   # Endpoint publik pelanggan
│   │   │   ├── product-requests/       # Pengajuan pre-order baru
│   │   │   │   └── track/[token]/      # Fetching data tracking (supplier redacted)
│   │   │   └── orders/                 # Challenge dan rilis riwayat order
│   │   ├── checkout/                   # Inisiasi pembayaran
│   │   │   └── customer/               # Checkout B2C Midtrans (+ bypass stok via requestId)
│   │   ├── midtrans/webhook/           # Callback status pembayaran Midtrans
│   │   └── promos/active/              # Polling promo aktif untuk banner / pop-up
│   ├── layout.tsx                      # Root layout aplikasi (Navbar, Footer, Provider)
│   └── page.tsx                        # Beranda katalog produk publik
│
├── components/                          # Komponen Antarmuka React
│   ├── admin/                          # Komponen khusus dashboard admin
│   │   ├── InventoryTable.tsx
│   │   ├── SupplierProductLinker.tsx
│   │   └── PayoutBatchTable.tsx
│   ├── customer/                       # Komponen khusus tampilan pelanggan
│   │   ├── CustomerProductCard.tsx     # Kartu produk dengan tombol "Request Produk"
│   │   ├── RequestProductModal.tsx     # Modal form pengajuan pre-order
│   │   ├── CustomerCheckoutForm.tsx    # Formulir checkout & input voucher
│   │   └── PromoModal.tsx              # Pop-up promo berjadwal
│   └── ui/                             # Komponen UI primitif (Button, Modal, Input, Badge)
│
├── lib/                                 # Logika Bisnis & Utilitas Inti
│   ├── audit/                          # Subsistem pencatatan audit
│   │   └── trackingAudit.ts            # Audit logging siklus hidup tracking token
│   ├── guards/                         # Lapisan proteksi & guardrails
│   │   └── preorderGuard.ts            # Guard deduplikasi (1 per phone) & in-stock redirect
│   ├── bridge/                         # Klien komunikasi ke Hermes Bridge
│   │   ├── requestsClient.ts           # Dispatch request baru & konfirmasi JIT ke bridge
│   │   └── topup.ts                    # Penanganan payload topup dari bridge
│   ├── promo/                          # Engine akrual promo & referral
│   │   ├── accrual.ts                  # Logika akrual komisi CustomerCredit
│   │   └── validation.ts               # Validasi aturan VoucherRule & ReferralCode
│   ├── midtrans.ts                     # Klien SDK Midtrans (Snap Token generation)
│   ├── whatsapp.ts                     # Integrasi SaungWA WhatsApp notifications
│   ├── transactionStatus.ts            # Penanganan settlement & JIT handshake fulfillment
│   ├── routeProtection.ts              # Konfigurasi proteksi rute (whitelist public /pre-order/track)
│   ├── encryption.ts                   # Kriptografi AES-256-GCM untuk API key
│   ├── prisma.ts                       # Singleton client Prisma ORM
│   └── utils.ts                        # Helper fungsi (format Rupiah, getPreOrderDisplayPrices)
│
├── prisma/                              # Skema Basis Data & Migrasi
│   ├── schema.prisma                   # Definisi model Prisma
│   └── seed.ts                         # Data seed awal dev
│
├── __tests__/                           # Suite Pengujian Otomatis
│   ├── api/                            # Pengujian integrasi endpoint API
│   │   ├── p2a-product-requests.test.ts # Test lengkap alur pre-order, tracking, & guards
│   │   └── cleanup-supplier-modes.test.ts # Test integritas pembersihan mode supplier
│   └── lib/                            # Pengujian unit fungsi library
│       ├── preorderGuardAndAudit.test.ts # Test deduplikasi, stock redirect, & audit
│       ├── whatsapp.test.ts            # Test formatting & pengiriman notifikasi WhatsApp
│       └── routeProtection.test.ts     # Test proteksi rute publik vs private
│
├── docs/                                # Dokumentasi Teknis Repositori
│   ├── architecture/                   # Spesifikasi arsitektur & desain sistem
│   │   ├── README.md                   # Portal & ringkasan arsitektur
│   │   ├── system-design.md            # Desain sistem & siklus on-demand
│   │   ├── api-architecture.md         # Dokumentasi REST API Storefront
│   │   ├── database-schema.md          # Dokumentasi skema basis data
│   │   ├── tech-stack.md               # Rincian teknologi & dependensi
│   │   └── directory-structure.md      # BERKAS INI
│   ├── agent-guides/                   # Panduan operasional AI coding agent
│   └── initiatives/                    # Roadmap inisiatif & catatan rilis
│
└── package.json                         # Dependensi NPM & Script Perintah
```

---

## 2. Lokasi Penting Berdasarkan Kebutuhan Modifikasi

| Kebutuhan Pengembang | Berkas Utama yang Relevan |
|----------------------|---------------------------|
| **Modifikasi Aturan Guard Pre-Order** | `lib/guards/preorderGuard.ts` |
| **Pembaruan Halaman Live Tracking** | `app/pre-order/track/[trackingToken]/PreOrderTrackingClient.tsx` |
| **Kalkulasi Harga Diskon / Pemanis** | `lib/utils.ts` (`getPreOrderDisplayPrices`) |
| **Format Pesan WhatsApp Pelanggan** | `lib/whatsapp.ts` |
| **Logika Pembayaran & Settlement** | `app/api/checkout/customer/route.ts` & `lib/transactionStatus.ts` |
| **Komunikasi Dua Arah Bridge** | `lib/bridge/requestsClient.ts` & `app/api/bridge/webhook/request-update/route.ts` |
| **Pencatatan Audit Pelacakan** | `lib/audit/trackingAudit.ts` |

---

**See Also:** [System Design](./system-design.md) | [Tech Stack](./tech-stack.md) | [Agent Guides](../agent-guides/README.md)
