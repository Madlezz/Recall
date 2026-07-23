import { test, expect } from "@playwright/test";

test("empty dashboard shows friendly empty state", async ({ page }) => {
  test.setTimeout(60000);

  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });
  await expect(page.getByRole("button", { name: /Get Started/i })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /Get Started/i }).click();

  // Concept → Continue
  await expect(page.getByRole("button", { name: /Continue/i })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /Continue/i }).click();

  // System -> Next (lands on try step)
  await expect(page.getByRole("button", { name: /^Next$/i })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /^Next$/i }).click();

  // Try -> skip to templates (header Skip)
  await expect(page.getByRole("button", { name: /^Skip$/i }).last()).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /^Skip$/i }).last().click();

  // Templates -> skip to goal (header or footer Skip)
  await expect(page.getByRole("button", { name: /^Skip$/i }).last()).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /^Skip$/i }).last().click();

  // Goal → Start Learning
  await expect(page.getByRole("button", { name: /Start Learning/i })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /Start Learning/i }).click();

  await expect(page.getByText("Your Decks")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/no decks|empty|library is empty|create.*deck/i).first()).toBeVisible({ timeout: 5000 });
});
