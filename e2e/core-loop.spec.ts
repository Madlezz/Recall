import { test, expect } from "@playwright/test";

test("empty dashboard shows friendly empty state", async ({ page }) => {
  test.setTimeout(60000);

  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });
  await expect(page.getByRole("button", { name: /Start Fresh|Start Empty/i })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /Start Fresh|Start Empty/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });

  await expect(page.getByText(/no decks|empty|create.*deck|get started/i).first()).toBeVisible({ timeout: 5000 });
});
