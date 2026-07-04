import { test, expect } from "@playwright/test";

test.describe("Recall Smoke Tests", () => {
  test("onboarding shows and leads to dashboard", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Wait for onboarding animation to complete
    await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });

    // Should see onboarding welcome screen
    await expect(page.locator("h1")).toContainText("Recall");
    await expect(page.getByText("Remember things for good")).toBeVisible();

    // Wait for button to be visible (fade-in animation) before clicking
    const skipBtn = page.getByRole("button", { name: /Skip for now/i });
    const freshBtn = page.getByRole("button", { name: /Start Fresh|Start Empty/i });
    await expect(skipBtn).toBeVisible({ timeout: 15000 });
    await expect(freshBtn).toBeVisible({ timeout: 15000 });

    // Click "Skip for now" to complete onboarding
    await skipBtn.click();

    // Should land on dashboard
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
  });

  test("start fresh leads to empty dashboard", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Wait for onboarding animation to complete
    await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });

    await expect(page.getByText("Remember things for good")).toBeVisible();

    // Wait for button fade-in, then click
    await expect(page.getByRole("button", { name: /Start Fresh|Start Empty/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Start Fresh|Start Empty/i }).click();

    // Should land on dashboard
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });

    // No decks should be visible
    await expect(page.getByText("Japanese Basics")).not.toBeVisible({ timeout: 5000 });
  });
});
