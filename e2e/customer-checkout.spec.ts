import { test, expect } from "@playwright/test";

test.describe("E2E: Customer Checkout Flow", () => {
  test("should load the customer catalog at /customer", async ({ page }) => {
    await page.goto("/customer");

    // The catalog section heading "Pilihan Produk" is always rendered
    // (the page uses force-dynamic so it always server-renders).
    await expect(
      page.locator("h2", { hasText: /Pilihan Produk/i })
    ).toBeVisible();

    // Meaningful page state: either products are listed, or the empty state is shown.
    const productCard = page.locator(
      "a:has(button[id^='customer-buy-btn-'])"
    );
    const emptyState = page.locator("text=Belum ada produk tersedia");

    const hasProducts = (await productCard.count()) > 0;
    const isEmpty = (await emptyState.count()) > 0;
    expect(hasProducts || isEmpty).toBe(true);
  });

  test("should complete customer happy path when an in-stock product exists", async ({ page }) => {
    page.on("console", msg => console.log("PAGE LOG:", msg.text()));
    page.on("response", async res => {
      if (res.url().includes("/api/checkout/customer")) {
        console.log("CHECKOUT RESPONSE:", res.status(), await res.text().catch(() => ''));
      }
    });
    // Navigate to the public catalog.
    await page.goto("/customer");

    // Find the first "Beli Sekarang" link wrapping an enabled button.
    // Out-of-stock products render a disabled button (id ends with "-disabled").
    const buyLink = page
      .locator("a:has(button[id^='customer-buy-btn-']:not([disabled]))")
      .first();

    // Skip gracefully when the test database has no in-stock product to buy.
    // When a product exists, the full real happy-path flow runs below.
    test.skip((await buyLink.count()) === 0, "No in-stock product to buy");

    // Click "Beli Sekarang" → navigation to the per-product checkout page.
    await buyLink.click();
    await expect(page).toHaveURL(/\/customer\/checkout\//);
    await expect(page.locator("#customer-checkout-form")).toBeVisible();

    // Fill the required buyer details.
    await page.fill("#customer-name-input", "Test Customer");
    await page.fill("#customer-phone-input", "081234567890");

    // Submit the checkout form (client-side POST to /api/checkout/customer).
    await page.click("#customer-proceed-payment-btn");

    // Happy path completes by redirecting to the order page.
    // 10s timeout accommodates real payment gateway API calls in production/staging.
    await expect(page).toHaveURL(/\/customer\/order\//, { timeout: 10000 });
    await expect(page.locator("body")).toBeVisible();
  });

  test("should default consent to true, show inline warning on uncheck, and restore on re-check", async ({ page }) => {
    await page.goto("/customer");

    const buyLink = page
      .locator("a:has(button[id^='customer-buy-btn-']:not([disabled]))")
      .first();

    test.skip((await buyLink.count()) === 0, "No in-stock product to buy");

    await buyLink.click();
    await expect(page).toHaveURL(/\/customer\/checkout\//);
    await expect(page.locator("#customer-checkout-form")).toBeVisible();

    // No consent checkbox until a phone number is typed.
    await expect(page.locator("#customer-consent-promo")).toHaveCount(0);

    await page.fill("#customer-phone-input", "081220000001");

    // Checkbox appears with default checked = true; inline warning is hidden.
    const consentBox = page.locator("#customer-consent-promo");
    await expect(consentBox).toBeVisible();
    await expect(consentBox).toBeChecked();
    await expect(page.locator("#customer-consent-promo-warning")).toHaveCount(0);

    // Unchecking shows the inline benefit-loss warning (non-hover, keyboard/touch accessible).
    await consentBox.uncheck();
    await expect(consentBox).not.toBeChecked();
    await expect(page.locator("#customer-consent-promo-warning")).toBeVisible();

    // Re-checking hides the warning again.
    await consentBox.check();
    await expect(consentBox).toBeChecked();
    await expect(page.locator("#customer-consent-promo-warning")).toHaveCount(0);

    // Clearing the phone hides the consent UI entirely.
    await page.fill("#customer-phone-input", "");
    await expect(page.locator("#customer-consent-promo")).toHaveCount(0);
    await expect(page.locator("#customer-consent-promo-warning")).toHaveCount(0);
  });
});
