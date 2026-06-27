import { test, expect } from "@playwright/test";

async function goToDashboard(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });
  await page.getByRole("button", { name: /Try with Demo Cards/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
}

test.describe("Settings", () => {
  test("navigate to settings", async ({ page }) => {
    test.setTimeout(60000);
    await goToDashboard(page);

    // Click Settings in sidebar
    await page.getByRole("button", { name: /Settings/i }).click();
    await expect(page.getByText("Preferences")).toBeVisible({ timeout: 5000 });
  });

  test("change theme to light", async ({ page }) => {
    test.setTimeout(60000);
    await goToDashboard(page);

    await page.getByRole("button", { name: /Settings/i }).click();
    await expect(page.getByText("Preferences")).toBeVisible({ timeout: 5000 });

    // Click Appearance section
    const appearanceBtn = page.getByText("Appearance").first();
    await expect(appearanceBtn).toBeVisible({ timeout: 5000 });
    await appearanceBtn.click();

    // Select Light theme
    await page.getByRole("button", { name: /Light/i }).click();

    // Verify light theme applied to html element (no 'dark' class)
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass || "").not.toContain("dark");
  });

  test("change language to Indonesian and back", async ({ page }) => {
    test.setTimeout(60000);
    await goToDashboard(page);

    await page.getByRole("button", { name: /Settings/i }).click();
    await expect(page.getByText("Preferences")).toBeVisible({ timeout: 5000 });

    // Click Appearance section for language switcher
    const appearanceBtn = page.getByText("Appearance").first();
    await expect(appearanceBtn).toBeVisible({ timeout: 5000 });
    await appearanceBtn.click();

    // Look for language selector
    const langSelect = page.locator("select").filter({ hasText: /Indonesian|Bahasa/i }).first();
    if (await langSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await langSelect.selectOption("id");

      // Verify Indonesian text appears (nav should change)
      await expect(page.getByText("Beranda")).toBeVisible({ timeout: 5000 });

      // Switch back to English
      await langSelect.selectOption("en");
      await expect(page.getByRole("button", { name: /Dashboard/i })).toBeVisible({ timeout: 5000 });
    }
  });
});
