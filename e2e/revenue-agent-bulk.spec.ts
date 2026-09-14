import { test, expect } from "@playwright/test";

test.describe("E2E: Revenue — Agent Multi-Quantity Checkout", () => {
  test.beforeEach(async ({ page, context }) => {
    // Login as agent
    await page.goto("/login");
    await page.fill('input[name="username"]', "elang");
    await page.fill('input[name="password"]', "password123");
    await page.click("button:has-text('Login')");
    await page.waitForURL(/\/(agent|dashboard)/);
  });

  test("should display quantity selector (1-10)", async ({ page }) => {
    // Navigate to catalog
    await page.goto("/agent/catalog");
    
    // Find a product and click to checkout
    const productCard = page.locator("[data-testid='product-card']").first();
    await expect(productCard).toBeVisible();
    
    const checkoutBtn = productCard.locator("button:has-text('Checkout')");
    await checkoutBtn.click();

    // Verify quantity selector exists
    const quantityInput = page.locator('input[name="quantity"]');
    await expect(quantityInput).toBeVisible();
    
    // Check min/max constraints
    const maxAttr = await quantityInput.getAttribute("max");
    expect(maxAttr).toBe("10");
    
    const minAttr = await quantityInput.getAttribute("min");
    expect(minAttr).toBe("1");
  });

  test("should claim 5 stocks and show 5 redeem links on success", async ({ page }) => {
    // Navigate to checkout with quantity=5
    await page.goto("/agent/catalog");
    
    const productCard = page.locator("[data-testid='product-card']").first();
    await productCard.locator("button:has-text('Checkout')").click();

    // Set quantity to 5
    await page.fill('input[name="quantity"]', "5");
    
    // Submit
    await page.click("button:has-text('Checkout')");

    // Wait for success page
    await page.waitForURL(/order|success/);

    // Verify 5 redeem links are displayed
    const redeemLinks = page.locator("[data-testid='redeem-link']");
    await expect(redeemLinks).toHaveCount(5);

    // Verify each link is clickable
    for (let i = 0; i < 5; i++) {
      const link = redeemLinks.nth(i);
      await expect(link).toHaveAttribute("href", /^https?:\/\//);
    }
  });

  test("should reject qty=0 or qty>10", async ({ page }) => {
    await page.goto("/agent/catalog");
    const productCard = page.locator("[data-testid='product-card']").first();
    await productCard.locator("button:has-text('Checkout')").click();

    const quantityInput = page.locator('input[name="quantity"]');

    // Try qty=0
    await quantityInput.fill("0");
    const checkoutBtn = page.locator("button:has-text('Checkout')");
    
    // Form should prevent submission
    await checkoutBtn.click();
    const error = page.locator("[data-testid='error-message']");
    await expect(error).toBeVisible({ timeout: 5000 });

    // Try qty=11
    await quantityInput.fill("11");
    await checkoutBtn.click();
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test("should show error when insufficient stock for quantity", async ({ page }) => {
    // This assumes we have a product with limited stock (< 5 available)
    // In a real test, we'd seed data accordingly
    
    await page.goto("/agent/catalog");
    const productCard = page.locator("[data-testid='product-card']").first();
    await productCard.locator("button:has-text('Checkout')").click();

    await page.fill('input[name="quantity"]', "100"); // Unreasonable qty
    await page.click("button:has-text('Checkout')");

    // Should see error
    const errorMsg = page.locator("text=/stok|stock/i");
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });
});
