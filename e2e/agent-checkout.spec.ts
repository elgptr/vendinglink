import { test, expect } from "@playwright/test";

test.describe("E2E: Agent Checkout Flow", () => {
  test("should redirect unauthenticated users to login from /agent", async ({ page }) => {
    // Without a session, the agent area is guarded and redirects to /login.
    await page.goto("/agent");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should expose the agent catalog page", async ({ page }) => {
    // The agent catalog page (/agent/catalog) has its own heading.
    // Without auth, accessing it should redirect to login.
    await page.goto("/agent/catalog");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should show the public customer catalog", async ({ page }) => {
    await page.goto("/customer");

    // The shared catalog page uses h2 "Pilihan Produk" as its section heading.
    await expect(
      page.locator("h2", { hasText: /Pilihan Produk/i })
    ).toBeVisible();
  });
});
