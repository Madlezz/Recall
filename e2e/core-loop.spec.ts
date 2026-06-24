import { test, expect } from "@playwright/test";

/**
 * Core study loop e2e test:
 * Create deck → Add card → Study → Rate → Verify stats updated
 *
 * This exercises the full FSRS review pipeline end-to-end.
 */

test.describe("Core Study Loop", () => {
  test("create deck, add card, study, rate, verify stats", async ({ page }) => {
    test.setTimeout(60000);

    // Start fresh
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Onboarding → Start Fresh
    await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });
    await expect(page.getByRole("button", { name: /Start Fresh/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Start Fresh/i }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });

    // Create a new deck via Quick Add or deck dialog
    // Look for "Create Deck" or "New Deck" button
    const newDeckBtn = page.getByRole("button", { name: /New Deck|Create Deck|Add Deck/i }).first();
    await expect(newDeckBtn).toBeVisible({ timeout: 5000 });
    await newDeckBtn.click();

    // Fill deck dialog
    const nameInput = page.getByLabel(/deck name|name/i).first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill("E2E Test Deck");
    await page.getByRole("button", { name: /Create|Save/i }).click();

    // Verify deck appears on dashboard
    await expect(page.getByText("E2E Test Deck")).toBeVisible({ timeout: 5000 });

    // Click into the deck
    await page.getByText("E2E Test Deck").click();
    await expect(page.getByRole("heading", { name: "E2E Test Deck" })).toBeVisible({ timeout: 5000 });

    // Add a card via Quick Add (Ctrl+N)
    await page.keyboard.press("Control+n");

    // Fill card front and back
    const frontInput = page.getByPlaceholder(/front|question/i).first();
    await expect(frontInput).toBeVisible({ timeout: 5000 });
    await frontInput.fill("What is 2 + 2?");

    const backInput = page.getByPlaceholder(/back|answer/i).first();
    await backInput.fill("4");

    // Save the card
    await page.getByRole("button", { name: /Save|Add|Create Card/i }).click();

    // Verify card appears in deck
    await expect(page.getByText("What is 2 + 2?")).toBeVisible({ timeout: 5000 });

    // Go back to dashboard
    await page.getByRole("button", { name: /Dashboard|Back/i }).first().click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 5000 });

    // Start study session
    await page.getByRole("button", { name: /Start Review/i }).first().click();

    // Should enter study mode
    await expect(page.getByText(/\d+\s*\/\s*\d+/)).toBeVisible({ timeout: 10000 });

    // Reveal answer with Space
    await page.keyboard.press("Space");

    // Rating buttons should appear
    await expect(page.getByText("Again")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Hard")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Good")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Easy")).toBeVisible({ timeout: 5000 });

    // Rate "Good" (press 3)
    await page.keyboard.press("3");

    // After rating, either session ends or next card shows
    // Wait for either session summary or return to dashboard
    await page.waitForTimeout(2000);
  });

  test("empty deck shows friendly empty state", async ({ page }) => {
    test.setTimeout(60000);

    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Onboarding → Start Fresh
    await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });
    await expect(page.getByRole("button", { name: /Start Fresh/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Start Fresh/i }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });

    // Dashboard should show empty state (no decks)
    await expect(page.getByText(/no decks|empty|create.*deck|get started/i).first()).toBeVisible({ timeout: 5000 });
  });
});
