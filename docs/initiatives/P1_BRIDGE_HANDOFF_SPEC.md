# Handoff P1 — Storefront ↔ Bridge (2026-10-11)

## Lingkup dan batas kepercayaan

P1 promo/referral/consent/payment/payout sepenuhnya di storefront. Bridge hanya
memasok stok dan (opsional) mengirim kategori produk. **Jangan kirim PII pelanggan,
nomor telepon, referral code, consent, komisi, voucher atau data payout ke bridge.**
Rahasia autentikasi disimpan di environment server saja, tidak dicantumkan sebagai
nilai dalam dokumen, URL, respons atau log. Hasil di bawah diturunkan dari kode
storefront; perilaku bridge di repo terpisah **belum diuji bersama**.

## Kontrak yang diterima storefront

| Endpoint | Input dan autentikasi | Hasil aktual |
|---|---|---|
| `POST /api/bridge/webhook/stock/topup` (juga PUT/PATCH alias) | Bearer `BRIDGE_SECRET_KEY`, allowlist IP bila disetel, rate limit default 30/menit/IP. JSON `{transaction_id,product_id,supplier_code,supplier_product_id,added_qty,items,source:"BRIDGE_BOT"}`; `items.length === added_qty` dan 1 ≤ qty ≤ 100. `Idempotency-Key` opsional tetapi jika ada **harus sama dengan `transaction_id`**. | 201 topup baru/semua item sudah ada; 409 untuk event yang sudah COMPLETED atau PROCESSING; 400 untuk sentinel `[UNMAPPED]`/`[UNKNOWN]`, header tak cocok, schema salah, atau mode REZEKI; 401/403/429 untuk auth/IP/rate. `transaction_id` jadi kunci dedupe DB. |
| `PATCH /api/bridge/products/{vlProductId}/category` | Bearer, allowlist, rate limit yang sama; JSON `{ "categorySlug": "<slug>" }`. | 200 saat kategori diubah; 400 schema salah, 404 bila produk/kategori tak ditemukan (lihat `lib/bridge/category.ts`); tidak menyentuh promo/customer. |

Mapping lookup: `SupplierProductMapping(supplierCode,supplierProductId)` terlebih dahulu,
fallback ke `Product.id`, lalu `Product.supplierProductId`. Bila ID tak dikenal dan bukan
sentinel, storefront membuat produk **nonaktif** `[BRIDGE AUTO] …` plus mapping;
admin harus meninjau kategori, harga dan aktivasi sebelum menampilkannya di katalog.
Promo berkategori hanya berlaku bila `Product.categoryId` cocok dengan `VoucherRule.categoryId`.

## Matriks uji silang yang harus dijalankan developer bridge + storefront

1. **Mapped:** supplier_code + supplier_product_id yang dipetakan → topup 201,
   stok bertambah sesuai qty pada produk yang tepat; lalu checkout kategori yang
   sama menerima promo, kategori lain menolak. Bridge tidak menerima data pelanggan.
2. **Unmapped sentinel:** `[UNMAPPED]` dan `[UNKNOWN]` → 400, event REJECTED,
   tidak membuat produk maupun stok; admin map dahulu, retry `transaction_id` yang
   sama dan pastikan berhasil. **Unknown ID non-sentinel** saat ini justru membuat
   produk nonaktif; uji dan setujui perbedaan ini sebelum produksi.
3. **Kategori:** `PATCH` slug valid memperbarui kategori produk terpetakan;
   slug/ID tidak valid gagal, promo berkategori tidak menjadi berlaku secara keliru;
   kategori stok auto-created harus disetel sebelum produk diaktifkan.
4. **Replay dan timeout:** kirim ulang payload/topup ID sama sesudah 201: saat ini
   **409**, tidak ada stok ganda. Jika bridge mengharapkan replay **200**, kontrak
   masih **belum selaras**: sepakati perubahan kode + tes lintas repo atau perlakukan
   409 `COMPLETED` sebagai acknowledgement hasil sebelumnya. Replay PROCESSING
   harus masuk retry/review, bukan dianggap sukses. Header key ≠ transaction_id → 400.
5. **Dedupe item:** ID event baru dengan sebagian/semua `items` identik → hanya
   item baru dimasukkan; verify inserted/skipped dan tidak terjadi kredensial stok
   ganda. Mode REZEKI → 400/review tanpa memasukkan manual keys.
6. **Keamanan:** Bearer hilang/salah, IP tak diizinkan, rate 429 → tidak ada stok
   atau mutasi kategori; pastikan tidak ada secret, PII, redeem item atau payload
   sensitif di error/log saat request gagal.

## Acceptance dan pemilik keputusan

- Tim storefront: jalankan tes API/topup/kategori, cek `VoucherRule.categoryId`
  dan `Product.categoryId`, uji checkout/refund/stockout + komisi VOID.
- Tim bridge: konfirmasi sumber `vlProductId`, mapping, timeout retry/backoff,
  penanganan 201/409, dan apakah payload P2 yang direncanakan di guide memang
  telah diimplementasi di repo bridge. Jangan menyamakan rencana P2 dengan P1 live.
- Kedua tim: rekam hasil tes staging mapped/unmapped/replay dalam checklist
  release sebelum menandai kompatibel; perubahan perilaku replay 409→200 harus
  disepakati dan dites sebelum deployment kedua sisi.