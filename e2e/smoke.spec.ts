import { test, expect } from "@playwright/test";

test.describe("Recall Smoke Tests", () => {
  test("onboarding shows and leads to dashboard with demo cards", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Wait for onboarding animation to complete
    await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });

    // Should see onboarding welcome screen
    await expect(page.locator("h1")).toContainText("Recall");
    await expect(page.getByText("Beautiful flashcards, no cloud, no account.")).toBeVisible();

    // Two options should be visible (wait for fade-in animation)
    const demoBtn = page.getByRole("button", { name: /Try with Demo Cards/i });
    const freshBtn = page.getByRole("button", { name: /Start Fresh/i });
    await expect(demoBtn).toBeVisible({ timeout: 15000 });
    await expect(freshBtn).toBeVisible({ timeout: 15000 });

    // Click "Try with Demo Cards"
    await demoBtn.click();

    // Should land on dashboard
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });

    // Should see seed decks
    await expect(page.getByText("🇯🇵 Japanese Basics")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("🔬 Science Facts")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("🏛️ World History")).toBeVisible({ timeout: 10000 });

    // "Start Review" button should be visible
    await expect(page.getByRole("button", { name: /Start Review/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("start fresh leads to empty dashboard", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Wait for onboarding animation to complete
    await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });

    await expect(page.getByText("Beautiful flashcards, no cloud, no account.")).toBeVisible();

    // Wait for button fade-in, then click
    await expect(page.getByRole("button", { name: /Start Fresh/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Start Fresh/i }).click();

    // Should land on dashboard
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });

    // No decks should be visible
    await expect(page.getByText("Japanese Basics")).not.toBeVisible({ timeout: 5000 });
  });

  test("study mode starts from dashboard", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Wait for onboarding animation to complete
    await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });

    // Wait for button fade-in, then click
    await expect(page.getByRole("button", { name: /Try with Demo Cards/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Try with Demo Cards/i }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });

    // Click "Start Review"
    await page.getByRole("button", { name: /Start Review/i }).first().click();

    // Should be in study mode — progress counter visible (e.g., "1/5")
    await expect(page.getByText(/\d+\/\d+/)).toBeVisible({ timeout: 10000 });

    // Press Space to reveal answer
    await page.keyboard.press("Space");
    await expect(page.getByText("Again")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Good")).toBeVisible({ timeout: 5000 });

    // Rate the card
    await page.keyboard.press("3"); // Good
  });

  test("keyboard shortcut R starts review", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Wait for onboarding animation to complete
    await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });

    // Wait for button fade-in, then click
    await expect(page.getByRole("button", { name: /Try with Demo Cards/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Try with Demo Cards/i }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });

    // Press R to start review
    await page.keyboard.press("r");

    // Should enter study mode
    await expect(page.getByText(/\d+\/\d+/)).toBeVisible({ timeout: 10000 });
  });
});