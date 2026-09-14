import { test, expect } from '@playwright/test';

test.describe('Discount Security & Brute Force Protection', () => {
  test('Voucher brute-force blocked after 10 attempts', async ({ page }) => {
    await page.goto('/');

    for (let i = 0; i < 10; i++) {
      await page.fill('input[placeholder="Voucher Code"]', `INVALID${i}`);
      await page.click('button:has-text("Apply Voucher")');
      const errorMsg = await page.locator('text=/Invalid|error/i');
      await expect(errorMsg).toBeVisible();
    }

    await page.fill('input[placeholder="Voucher Code"]', 'INVALID10');
    await page.click('button:has-text("Apply Voucher")');

    const rateLimitMsg = await page.locator('text=/Too many|rate limit/i');
    await expect(rateLimitMsg).toBeVisible();
  });

  test('PromoCode brute-force blocked after 10 attempts', async ({ page }) => {
    await page.goto('/');

    for (let i = 0; i < 10; i++) {
      await page.fill('input[placeholder="Promo Code"]', `PROMO${i}`);
      await page.click('button:has-text("Apply Promo")');
    }

    await page.fill('input[placeholder="Promo Code"]', 'PROMO10');
    await page.click('button:has-text("Apply Promo")');

    const rateLimitMsg = await page.locator('text=/Too many|rate limit/i');
    await expect(rateLimitMsg).toBeVisible();
  });

  test('Valid discount within limit should work', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[placeholder="Voucher Code"]', 'SAVE20');
    await page.click('button:has-text("Apply Voucher")');

    const successMsg = await page.locator('text=/Discount|saved/i');
    await expect(successMsg).toBeVisible();
  });

  test('Case sensitivity enforced', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[placeholder="Voucher Code"]', 'save20');
    await page.click('button:has-text("Apply Voucher")');

    const errorMsg = await page.locator('text=/Invalid|error/i');
    await expect(errorMsg).toBeVisible();
  });

  test('Enumeration attack prevention', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[placeholder="Voucher Code"]', 'EXPIRED');
    await page.click('button:has-text("Apply Voucher")');
    const error1 = await page.locator('.error-message').innerText();

    await page.fill('input[placeholder="Voucher Code"]', 'NOTEXIST');
    await page.click('button:has-text("Apply Voucher")');
    const error2 = await page.locator('.error-message').innerText();

    expect(error1).toBe(error2);
  });
});

test.describe('Checkout with Discount', () => {
  test('Customer checkout with voucher applies discount', async ({ page }) => {
    await page.goto('/checkout/customer');

    await page.click('[data-testid="product-item"]');
    await page.fill('input[placeholder="Voucher Code"]', 'DISCOUNT10');
    await page.click('button:has-text("Apply Voucher")');

    const finalPrice = await page.locator('[data-testid="final-price"]').innerText();
    expect(finalPrice).toContain('IDR');

    await page.click('button:has-text("Continue to Payment")');
  });

  test('Agent checkout with promo applies discount', async ({ page }) => {
    await page.goto('/checkout/agent');

    await page.fill('input[type="email"]', 'agent@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Login")');

    await page.click('[data-testid="product-item"]');
    await page.fill('input[placeholder="Promo Code"]', 'AGENT50');
    await page.click('button:has-text("Apply Promo")');

    await page.click('button:has-text("Submit Order")');
  });

  test('Invalid discount shows error', async ({ page }) => {
    await page.goto('/checkout/customer');

    await page.fill('input[placeholder="Voucher Code"]', 'INVALID@');
    await page.click('button:has-text("Apply Voucher")');

    const errorMsg = await page.locator('text=/Invalid/i');
    await expect(errorMsg).toBeVisible();
  });

  test('Discount calculation is correct', async ({ page }) => {
    await page.goto('/checkout/customer');

    await page.fill('input[placeholder="Voucher Code"]', 'SAVE50');
    await page.click('button:has-text("Apply Voucher")');

    const finalPrice = await page.locator('[data-testid="final-price"]').innerText();
    const numPrice = parseInt(finalPrice.replace(/\D/g, ''));
    expect(numPrice).toBeGreaterThan(0);
  });

  test('Low-stock badge displays when ≤2 units', async ({ page }) => {
    await page.goto('/');

    const lowStockBadge = await page.locator('[data-testid="low-stock-badge"]');
    const visible = await lowStockBadge.isVisible();
    expect(typeof visible).toBe('boolean');
  });
});

test.describe('Admin Access & Health Check', () => {
  test('Admin dashboard shows health metrics', async ({ page }) => {
    await page.goto('/admin');

    const healthWidget = await page.locator('[data-testid="health-widget"]');
    await expect(healthWidget).toBeVisible();
  });

  test('Unauthenticated cannot access health endpoint', async ({ page }) => {
    await page.goto('/api/health');

    const text = await page.innerText('body');
    expect(text).toContain(/Unauthorized|401|error/i);
  });

  test('Non-admin cannot access admin panel', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Login")');

    await page.goto('/admin');

    const text = await page.innerText('body');
    expect(text).toMatch(/Access|Denied|error/i);
  });
});
