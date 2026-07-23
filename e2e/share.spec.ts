import { test, expect } from "@playwright/test";

test.describe("Share Recall", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("share button copies repo link + tagline to clipboard", async ({ page }) => {
    test.setTimeout(60000);

    // Desktop viewport so the sidebar (with Share button) is visible
    await page.setViewportSize({ width: 1280, height: 800 });

    // Complete onboarding properly: welcome -> concept -> system -> try -> templates -> goal
    await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });
    await page.getByRole("button", { name: /Get Started/i }).click();

    // Concept
    await expect(page.getByRole("button", { name: /Continue/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Continue/i }).click();

    // System
    await expect(page.getByRole("button", { name: /^Next$/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /^Next$/i }).click();

    // Try step - reveal, rate, continue
    await expect(page.getByRole("button", { name: /Reveal/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Reveal/i }).click();
    await expect(page.getByRole("button", { name: /Good/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Good/i }).click();
    await expect(page.getByRole("button", { name: /Continue setup/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Continue setup/i }).click();

    // Templates step - skip without selecting (footer Skip button)
    await expect(page.getByRole("button", { name: /^Skip$/i }).last()).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /^Skip$/i }).last().click();

    // Goal step - start learning
    await expect(page.getByRole("button", { name: /Start Learning/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Start Learning/i }).click();

    // Wait for dashboard
    await expect(page.getByText("Your Decks")).toBeVisible({ timeout: 10000 });

    // Find Share button in sidebar footer (desktop)
    const shareBtn = page.getByRole("button", { name: /^Share Recall$/i }).first();
    await expect(shareBtn).toBeVisible({ timeout: 10000 });
    await shareBtn.click();

    // Wait for toast
    await expect(page.getByText(/Link copied|Tautan tersalin/i)).toBeVisible({ timeout: 5000 });

    // Verify clipboard content contains repo link + FSRS tagline
    const clipText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipText).toContain("github.com/Madlezz/Recall");
    expect(clipText).toContain("FSRS");
  });
});
