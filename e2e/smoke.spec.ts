import { test, expect } from "@playwright/test";

test.describe("Recall Smoke Tests", () => {
  test("onboarding shows and leads to dashboard with demo cards", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Should see onboarding welcome screen
    await expect(page.locator("h1")).toContainText("Recall");
    await expect(page.getByText("Beautiful flashcards, no cloud, no account.")).toBeVisible();

    // Two options should be visible
    const demoBtn = page.getByRole("button", { name: /Try with Demo Cards/i });
    const freshBtn = page.getByRole("button", { name: /Start Fresh/i });
    await expect(demoBtn).toBeVisible();
    await expect(freshBtn).toBeVisible();

    // Click "Try with Demo Cards"
    await demoBtn.click();

    // Should land on dashboard
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 5000 });

    // Should see seed decks
    await expect(page.getByText("🇯🇵 Japanese Basics")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("🔬 Science Facts")).toBeVisible();
    await expect(page.getByText("🏛️ World History")).toBeVisible();

    // "Start Review" button should be visible
    await expect(page.getByRole("button", { name: /Start Review/i }).first()).toBeVisible();
  });

  test("start fresh leads to empty dashboard", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.getByText("Beautiful flashcards, no cloud, no account.")).toBeVisible();

    // Click "Start Fresh"
    await page.getByRole("button", { name: /Start Fresh/i }).click();

    // Should land on dashboard
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 5000 });

    // No decks should be visible
    await expect(page.getByText("Japanese Basics")).not.toBeVisible({ timeout: 2000 });
  });

  test("study mode starts from dashboard", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Go through onboarding with demo cards
    await page.getByRole("button", { name: /Try with Demo Cards/i }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 5000 });

    // Click "Start Review"
    await page.getByRole("button", { name: /Start Review/i }).first().click();

    // Should be in study mode — progress counter visible (e.g., "1/5")
    await expect(page.getByText(/\d+\/\d+/)).toBeVisible({ timeout: 5000 });

    // Press Space to reveal answer
    await page.keyboard.press("Space");
    await expect(page.getByText("Again")).toBeVisible({ timeout: 2000 });
    await expect(page.getByText("Good")).toBeVisible();

    // Rate the card
    await page.keyboard.press("3"); // Good
  });

  test("keyboard shortcut R starts review", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByRole("button", { name: /Try with Demo Cards/i }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 5000 });

    // Press R to start review
    await page.keyboard.press("r");

    // Should enter study mode
    await expect(page.getByText(/\d+\/\d+/)).toBeVisible({ timeout: 5000 });
  });
});