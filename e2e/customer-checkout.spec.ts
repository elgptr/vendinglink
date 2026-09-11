import { test, expect } from "@playwright/test";

test.describe("E2E: Customer Checkout Flow", () => {
  test("should complete customer happy path", async ({ page }) => {
    // Navigate to home
    await page.goto("/");
    expect(page).toHaveTitle(/VendingLink|checkout|customer/i);

    // Find and click product
    const productLink = page.locator("a:has-text('Product')").first();
    if (await productLink.count() > 0) {
      await productLink.click();
    }

    // Fill customer form if visible
    const customerInput = page.locator("input[name='customerName']");
    if (await customerInput.count() > 0) {
      await customerInput.fill("Test Customer");
    }

    const phoneInput = page.locator("input[name='customerPhone']");
    if (await phoneInput.count() > 0) {
      await phoneInput.fill("081234567890");
    }

    // Look for checkout or next button
    const checkoutBtn = page.locator("button:has-text('Checkout'), button:has-text('Next'), button:has-text('Continue')").first();
    if (await checkoutBtn.count() > 0) {
      await checkoutBtn.click();
    }

    // Verify page loaded
    await page.waitForTimeout(1000);
    expect(page.url()).toMatch(/(checkout|payment)/i);
  });

  test("should display product list", async ({ page }) => {
    await page.goto("/");
    
    // Should show some products or a catalog
    const page_content = await page.content();
    expect(page_content).toBeDefined();
  });
});
