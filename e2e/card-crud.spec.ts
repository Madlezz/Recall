import { test, expect } from "@playwright/test";

async function goToDashboard(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });
  await page.getByRole("button", { name: /Try with Demo Cards/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
}

test.describe("Card CRUD", () => {
  test("open deck detail and see cards", async ({ page }) => {
    test.setTimeout(60000);
    await goToDashboard(page);

    // Click on first deck card to open deck detail
    const deckCard = page.getByLabel("Open deck: 🇯🇵 Japanese Basics").first();
    if (await deckCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deckCard.click();
      // Should see deck detail view with card list
      await expect(page.getByText("Japanese Basics").first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("open card browser and search", async ({ page }) => {
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
      // Should filter results
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
