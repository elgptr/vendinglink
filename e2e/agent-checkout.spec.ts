import { test, expect } from "@playwright/test";

test.describe("E2E: Agent Checkout Flow", () => {
  test("should redirect unauthenticated users to login from /agent", async ({ page }) => {
    // Without a session, the agent area is guarded and redirects to /login.
    await page.goto("/agent");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should expose the public catalog that agents also share", async ({ page }) => {
    await page.goto("/customer");

    // The shared catalog page (agent + customer) still loads its heading.
    await expect(
      page.locator("h1", { hasText: /Katalog Produk/i })
    ).toBeVisible();
  });
});
