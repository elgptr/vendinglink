import { test, expect } from "@playwright/test";

test.describe("E2E: Customer Checkout Flow", () => {
  test("should load the customer catalog at /customer", async ({ page }) => {
    await page.goto("/customer");

    // The catalog heading is always rendered (force-dynamic page).
    await expect(
      page.locator("h1", { hasText: /Katalog Produk/i })
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
    // Navigate to the public catalog.
    await page.goto("/customer");

    // Find the first "Beli" (buy) link wrapping an enabled button.
    // Out-of-stock products render a disabled button (id ends with "-disabled").
    const buyLink = page
      .locator("a:has(button[id^='customer-buy-btn-']:not([disabled]))")
      .first();

    // Skip gracefully when the test database has no in-stock product to buy.
    // When a product exists, the full real happy-path flow runs below.
    test.skip((await buyLink.count()) === 0, "No in-stock product to buy");

    // Click "Beli" → navigation to the per-product checkout page.
    await buyLink.click();
    await expect(page).toHaveURL(/\/customer\/checkout\//);
    await expect(page.locator("#customer-checkout-form")).toBeVisible();

    // Fill the required buyer details.
    await page.fill("#customer-name-input", "Test Customer");
    await page.fill("#customer-phone-input", "081234567890");

    // Submit the checkout form (client-side POST to /api/checkout/customer).
    await page.click("#customer-proceed-payment-btn");

    // Happy path completes by redirecting to the order page.
    await expect(page).toHaveURL(/\/customer\/order\//);
    await expect(page.locator("body")).toBeVisible();
  });
});
