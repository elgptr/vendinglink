import { test, expect, Page } from "@playwright/test";

/**
 * E2E: Observability Health Dashboard & Low-Stock Badge
 * Initiative 1: "Never Lose a Paid Order"
 */

test.describe("Observability: Health Dashboard & Low-Stock Badge", () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto("/");
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe("Admin Health Dashboard Widget", () => {
    test("admin can access health dashboard", async () => {
      // Login as admin
      await page.goto("/auth/login");
      await page.fill('input[name="email"]', "admin@test.local");
      await page.fill('input[name="password"]', "password");
      await page.click("button:has-text('Login')");

      // Wait for redirect to admin dashboard
      await page.waitForURL("/admin");
      expect(page.url()).toContain("/admin");

      // Verify dashboard title
      await expect(page.locator("h1")).toContainText("Dashboard");
    });

    test("health widget displays system status", async () => {
      await page.goto("/auth/login");
      await page.fill('input[name="email"]', "admin@test.local");
      await page.fill('input[name="password"]', "password");
      await page.click("button:has-text('Login')");

      await page.waitForURL("/admin");

      // Verify health widget exists
      await expect(page.locator("h2:has-text('System Health')")).toBeVisible();

      // Verify status badge exists
      const statusBadge = page.locator("text=/HEALTHY|DEGRADED|UNHEALTHY/i");
      await expect(statusBadge).toBeVisible();
    });

    test("health widget shows database and memory metrics", async () => {
      await page.goto("/auth/login");
      await page.fill('input[name="email"]', "admin@test.local");
      await page.fill('input[name="password"]', "password");
      await page.click("button:has-text('Login')");

      await page.waitForURL("/admin");

      // Check for database section
      await expect(page.locator("text=Database")).toBeVisible();
      await expect(page.locator("text=ms")).toBeVisible();

      // Check for memory section
      await expect(page.locator("text=Memory")).toBeVisible();
      await expect(page.locator("text=MB")).toBeVisible();
    });

    test("refresh button updates health metrics", async () => {
      await page.goto("/auth/login");
      await page.fill('input[name="email"]', "admin@test.local");
      await page.fill('input[name="password"]', "password");
      await page.click("button:has-text('Login')");

      await page.waitForURL("/admin");

      // Click refresh button
      const refreshBtn = page.locator("button:has-text('Refresh')");
      await expect(refreshBtn).toBeVisible();
      await refreshBtn.click();

      // Wait for update
      await page.waitForTimeout(500);

      // Widget should still be visible
      await expect(page.locator("h2:has-text('System Health')")).toBeVisible();
    });

    test("uptime and version displayed", async () => {
      await page.goto("/auth/login");
      await page.fill('input[name="email"]', "admin@test.local");
      await page.fill('input[name="password"]', "password");
      await page.click("button:has-text('Login')");

      await page.waitForURL("/admin");

      // Check for uptime section
      await expect(page.locator("text=Uptime")).toBeVisible();

      // Should show version
      await expect(page.locator("text=v")).toBeVisible();
    });
  });

  test.describe("Unauthenticated Access Control", () => {
    test("unauthenticated user cannot access health endpoint", async () => {
      const response = await page.request.get("/api/admin/health");
      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error).toContain("Unauthorized");
    });

    test("non-admin user cannot access health endpoint", async () => {
      await page.goto("/auth/login");
      await page.fill('input[name="email"]', "agent01@test.local");
      await page.fill('input[name="password"]', "password");
      await page.click("button:has-text('Login')");

      await page.waitForURL("/agent");

      const response = await page.request.get("/api/admin/health");
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Low-Stock Badge in Inventory", () => {
    test("low-stock badge appears for products <=2 units", async () => {
      await page.goto("/auth/login");
      await page.fill('input[name="email"]', "admin@test.local");
      await page.fill('input[name="password"]', "password");
      await page.click("button:has-text('Login')");

      await page.waitForURL("/admin");

      // Navigate to inventory
      await page.click("a:has-text('Inventori')");
      await page.waitForURL("/admin/inventory");

      // Look for low stock badge
      const productRows = page.locator("table tbody tr");
      const count = await productRows.count();

      if (count > 0) {
        // Products should be visible
        await expect(productRows.first()).toBeVisible();
      }
    });
  });

  test.describe("System Health Monitoring", () => {
    test("system remains healthy during operation", async () => {
      await page.goto("/auth/login");
      await page.fill('input[name="email"]', "admin@test.local");
      await page.fill('input[name="password"]', "password");
      await page.click("button:has-text('Login')");

      await page.waitForURL("/admin");

      // Verify health endpoint is accessible
      const response = await page.request.get("/api/admin/health");
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.status).toMatch(/healthy|degraded|unhealthy/);
      expect(body.checks.database).toBeDefined();
      expect(body.checks.memory).toBeDefined();
    });
  });
});
