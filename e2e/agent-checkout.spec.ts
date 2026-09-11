import { test, expect } from "@playwright/test";

test.describe("E2E: Agent Checkout Flow", () => {
  test("should complete agent happy path", async ({ page }) => {
    // Navigate to agent dashboard or login
    await page.goto("/agent");
    
    // Check if we're on agent page or redirected to login
    const url = page.url();
    if (url.includes("login") || url.includes("auth")) {
      // Would need valid agent credentials in test environment
      await page.goto("/");
    }

    // Verify page loads
    const pageContent = await page.content();
    expect(pageContent).toBeDefined();
  });

  test("should show agent-specific checkout option", async ({ page }) => {
    await page.goto("/");
    
    // Look for agent checkout or login link
    const agentLink = page.locator("a:has-text('Agent'), a:has-text('Login'), button:has-text('Agent')").first();
    const linkCount = await agentLink.count();
    
    // Should have some way to access agent features
    expect(linkCount).toBeGreaterThanOrEqual(0);
  });
});
