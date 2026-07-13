import { test, expect } from "@playwright/test";

async function goToDashboard(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });

  // Multi-step onboarding: Welcome → Concept → System → Templates → Goal
  // Step 1: Welcome
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

  await expect(page.getByText("Your Decks")).toBeVisible({ timeout: 10000 });
}

test.describe("Card CRUD", () => {
  test("navigate to card browser", async ({ page }) => {
    test.setTimeout(60000);
    await goToDashboard(page);

    // Navigate to card browser via sidebar
    await page.getByRole("button", { name: /Browser/i }).click();

    // Should see card browser
    await expect(page.getByRole("heading", { name: /Card Browser|Browser/i }).first()).toBeVisible({ timeout: 5000 });

    // Search for a card
    const searchInput = page.getByPlaceholder(/Search/i).first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill("Hello");
      await page.waitForTimeout(500);
    }
  });

  test("navigate to stats", async ({ page }) => {
    test.setTimeout(60000);
    await goToDashboard(page);

    await page.getByRole("button", { name: /Stats/i }).click();
    await expect(page.getByRole("heading", { name: /Statistics|Stats/i }).first()).toBeVisible({ timeout: 5000 });
  });
});
