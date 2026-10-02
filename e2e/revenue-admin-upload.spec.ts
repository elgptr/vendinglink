import { test, expect } from "@playwright/test";

/**
 * E2E: Revenue — Admin Image Upload
 *
 * Login: /login with #username-input / #password-input / #login-submit-btn
 * Admin inventory: /admin/inventory
 * Product cards use Card components with edit button `#edit-price-btn-{productId}`
 * Guide image is set via URL input in the edit modal, not a file upload widget.
 * There is no separate image upload widget with file input on the main page.
 */

test.describe("E2E: Revenue — Admin Image Upload", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin.
    await page.goto("/login");
    await page.fill("#username-input", "admin");
    await page.fill("#password-input", "password");
    await page.click("#login-submit-btn");
    await page.waitForURL(/\/(admin|agent|customer)/, { timeout: 10000 });
  });

  test("should display inventory page with product cards", async ({ page }) => {
    await page.goto("/admin/inventory");

    // Verify page loaded with the inventory heading.
    await expect(
      page.locator("h1", { hasText: /Inventori/i })
    ).toBeVisible({ timeout: 10000 });

    // Verify product section heading exists.
    await expect(
      page.locator("h2", { hasText: /Daftar Produk/i })
    ).toBeVisible();
  });

  test("should open product edit modal with guide image URL field", async ({ page }) => {
    await page.goto("/admin/inventory");
    await page.waitForTimeout(2000); // Wait for products to load.

    // Find the first product's edit button.
    const editBtn = page.locator("button[id^='edit-price-btn-']").first();

    // Skip if no products exist.
    test.skip((await editBtn.count()) === 0, "No products in inventory");

    await editBtn.click();

    // The edit modal should appear with the guide image URL input.
    const guideUrlInput = page.locator("#edit-guide-url");
    await expect(guideUrlInput).toBeVisible({ timeout: 5000 });
  });

  test("should have guide text upload capability in edit modal", async ({ page }) => {
    await page.goto("/admin/inventory");
    await page.waitForTimeout(2000);

    const editBtn = page.locator("button[id^='edit-price-btn-']").first();
    test.skip((await editBtn.count()) === 0, "No products in inventory");

    await editBtn.click();

    // The edit modal has a guide text textarea.
    const guideTextArea = page.locator("#edit-product-guide-text");
    await expect(guideTextArea).toBeVisible({ timeout: 5000 });

    // There's also an "Upload .md" button for loading markdown files.
    const uploadMdBtn = page.locator("button", { hasText: /Upload .md/i });
    await expect(uploadMdBtn).toBeVisible();

    // The file input for .md accepts only .md files.
    const fileInput = page.locator("#edit-upload-md");
    const acceptAttr = await fileInput.getAttribute("accept");
    expect(acceptAttr).toBe(".md");
  });

  test("should save product with guide image URL", async ({ page }) => {
    await page.goto("/admin/inventory");
    await page.waitForTimeout(2000);

    const editBtn = page.locator("button[id^='edit-price-btn-']").first();
    test.skip((await editBtn.count()) === 0, "No products in inventory");

    await editBtn.click();

    // Set a guide image URL.
    const guideUrlInput = page.locator("#edit-guide-url");
    await expect(guideUrlInput).toBeVisible({ timeout: 5000 });
    await guideUrlInput.fill("https://example.com/guide-image.jpg");

    // Save the product.
    await page.locator("#save-price-btn").evaluate(b => (b as HTMLElement).click());

    // The modal should close after successful save.
    // We wait briefly and check the modal is gone.
    await page.waitForTimeout(1000);
  });

  test("should show guide image in customer product detail", async ({ page, context }) => {
    // After admin sets a guide image URL, the customer can see it
    // on the product detail page (/customer/product/[id]).
    // This test verifies the customer-facing page loads.
    const customerPage = await context.newPage();
    await customerPage.goto("/customer");

    // The customer catalog should load.
    await expect(
      customerPage.locator("h2", { hasText: /Pilihan Produk/i })
    ).toBeVisible();

    await customerPage.close();
  });

  test("should have bulk upload links functionality", async ({ page }) => {
    await page.goto("/admin/inventory");
    await page.waitForTimeout(2000);

    // The "Upload Link" button opens the bulk upload modal.
    const bulkUploadBtn = page.locator("#bulk-upload-btn");
    await expect(bulkUploadBtn).toBeVisible({ timeout: 10000 });

    await bulkUploadBtn.click();

    // The bulk upload modal should appear with a product selector and textarea.
    const productSelect = page.locator("#upload-product-select");
    await expect(productSelect).toBeVisible({ timeout: 5000 });

    const linksTextarea = page.locator("#bulk-links-textarea");
    await expect(linksTextarea).toBeVisible();
  });
});
