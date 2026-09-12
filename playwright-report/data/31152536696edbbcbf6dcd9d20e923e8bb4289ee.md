# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: customer-checkout.spec.ts >> E2E: Customer Checkout Flow >> should complete customer happy path when an in-stock product exists
- Location: e2e\customer-checkout.spec.ts:23:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/customer\/order\//
Received string:  "http://localhost:3000/customer/checkout/product-premium-01"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    13 × locator resolved to <html lang="id" class="dark">…</html>
       - unexpected value "http://localhost:3000/customer/checkout/product-premium-01"

```

```yaml
- banner:
  - link "VendingLink Toko Digital":
    - /url: /customer
    - img
    - paragraph: VendingLink
    - paragraph: Toko Digital
  - link "Masuk sebagai Agen":
    - /url: /login
    - img
    - text: Masuk sebagai Agen
- main:
  - link "Kembali ke Katalog":
    - /url: /customer
    - img
    - text: Kembali ke Katalog
  - img
  - paragraph: Produk Dipilih
  - heading "Google AI Pro Plan - 18 Bulan" [level=2]
  - paragraph: 5 stok tersedia
  - paragraph: Harga
  - text: Rp 3.000.000
  - paragraph: Rp 350.000
  - heading "Detail Pembelian" [level=3]
  - text: Nama Pembeli*
  - img
  - textbox "Nama Pembeli*":
    - /placeholder: Masukkan nama Anda
    - text: Test Customer
  - text: Nomor WhatsApp / Telepon
  - img
  - textbox "Nomor WhatsApp / Telepon":
    - /placeholder: 08xxxxxxxxxx (opsional)
    - text: "081234567890"
  - paragraph: Opsional — untuk konfirmasi pesanan jika diperlukan
  - text: Kode Promo / Voucher (opsional)
  - img
  - 'textbox "Contoh: RESTOCK-XXXXXXXX"'
  - button "Terapkan" [disabled]
  - paragraph: Ringkasan Pembayaran
  - text: Harga Produk Rp 350.000 Total Tagihan Rp 350.000
  - button "Lanjut ke Pembayaran":
    - img
    - text: Lanjut ke Pembayaran
- alert: Checkout | VendingLink
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("E2E: Customer Checkout Flow", () => {
  4  |   test("should load the customer catalog at /customer", async ({ page }) => {
  5  |     await page.goto("/customer");
  6  | 
  7  |     // The catalog heading is always rendered (force-dynamic page).
  8  |     await expect(
  9  |       page.locator("h1", { hasText: /Katalog Produk/i })
  10 |     ).toBeVisible();
  11 | 
  12 |     // Meaningful page state: either products are listed, or the empty state is shown.
  13 |     const productCard = page.locator(
  14 |       "a:has(button[id^='customer-buy-btn-'])"
  15 |     );
  16 |     const emptyState = page.locator("text=Belum ada produk tersedia");
  17 | 
  18 |     const hasProducts = (await productCard.count()) > 0;
  19 |     const isEmpty = (await emptyState.count()) > 0;
  20 |     expect(hasProducts || isEmpty).toBe(true);
  21 |   });
  22 | 
  23 |   test("should complete customer happy path when an in-stock product exists", async ({ page }) => {
  24 |     // Navigate to the public catalog.
  25 |     await page.goto("/customer");
  26 | 
  27 |     // Find the first "Beli" (buy) link wrapping an enabled button.
  28 |     // Out-of-stock products render a disabled button (id ends with "-disabled").
  29 |     const buyLink = page
  30 |       .locator("a:has(button[id^='customer-buy-btn-']:not([disabled]))")
  31 |       .first();
  32 | 
  33 |     // Skip gracefully when the test database has no in-stock product to buy.
  34 |     // When a product exists, the full real happy-path flow runs below.
  35 |     test.skip((await buyLink.count()) === 0, "No in-stock product to buy");
  36 | 
  37 |     // Click "Beli" → navigation to the per-product checkout page.
  38 |     await buyLink.click();
  39 |     await expect(page).toHaveURL(/\/customer\/checkout\//);
  40 |     await expect(page.locator("#customer-checkout-form")).toBeVisible();
  41 | 
  42 |     // Fill the required buyer details.
  43 |     await page.fill("#customer-name-input", "Test Customer");
  44 |     await page.fill("#customer-phone-input", "081234567890");
  45 | 
  46 |     // Submit the checkout form (client-side POST to /api/checkout/customer).
  47 |     await page.click("#customer-proceed-payment-btn");
  48 | 
  49 |     // Happy path completes by redirecting to the order page.
> 50 |     await expect(page).toHaveURL(/\/customer\/order\//);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  51 |     await expect(page.locator("body")).toBeVisible();
  52 |   });
  53 | });
  54 | 
```