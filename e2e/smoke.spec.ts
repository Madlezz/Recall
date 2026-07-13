import { test, expect } from "@playwright/test";

test.describe("Recall Smoke Tests", () => {
  test("onboarding shows and leads to dashboard", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Wait for onboarding animation to complete
    await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });

    // Step 1: Welcome — should see welcome screen
    await expect(page.locator("h1")).toContainText("Welcome");
    await expect(page.getByText("Focused learning, without the setup friction.")).toBeVisible();

    // Click "Get Started" to go to concept
    await expect(page.getByRole("button", { name: /Get Started/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Get Started/i }).click();

    // Step 2: How It Works — continue
    await expect(page.getByRole("button", { name: /Continue/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Continue/i }).click();

    // Step 3: How to Rate — next
    await expect(page.getByRole("button", { name: /^Next$/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /^Next$/i }).click();

    // Step 4: Templates — skip without selecting
    await expect(page.getByRole("button", { name: /^Skip$/i }).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /^Skip$/i }).first().click();

    // Step 5: Daily Goal — accept default
    await expect(page.getByRole("button", { name: /Start Learning/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Start Learning/i }).click();

    // Should land on dashboard
    await expect(page.getByText("Your Decks")).toBeVisible({ timeout: 10000 });
  });

  test("start fresh leads to empty dashboard", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Wait for onboarding animation to complete
    await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });

    await expect(page.getByText("Focused learning, without the setup friction.")).toBeVisible();

    // Click "I already have decks" link to skip to templates
    await expect(page.getByRole("button", { name: /I already have/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /I already have/i }).click();

    // Templates step — skip without selecting
    await expect(page.getByRole("button", { name: /^Skip$/i }).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /^Skip$/i }).first().click();

    // Goal step — accept default
    await expect(page.getByRole("button", { name: /Start Learning/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Start Learning/i }).click();

    // Should land on dashboard
    await expect(page.getByText("Your Decks")).toBeVisible({ timeout: 10000 });

    // No decks should be visible
    await expect(page.getByText("Japanese Basics")).not.toBeVisible({ timeout: 5000 });
  });
});
