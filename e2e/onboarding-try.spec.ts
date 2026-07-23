import { test, expect } from "@playwright/test";

test.describe("Onboarding Try Step", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("try step leads to dashboard hero CTA", async ({ page }) => {
    test.setTimeout(60000);

    // Welcome
    await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 10000 });
    await page.getByRole("button", { name: /Get Started/i }).click();

    // Concept
    await expect(page.getByRole("button", { name: /Continue/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Continue/i }).click();

    // System
    await expect(page.getByRole("button", { name: /^Next$/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /^Next$/i }).click();

    // Try step - should show the TryCard
    await expect(page.getByRole("heading", { name: /Try it now|Coba sekarang/i })).toBeVisible({ timeout: 10000 });

    // Reveal the card
    await expect(page.getByRole("button", { name: /Reveal/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Reveal/i }).click();

    // Rate (click Good)
    await expect(page.getByRole("button", { name: /Good/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Good/i }).click();

    // Aha modal - continue setup
    await expect(page.getByRole("button", { name: /Continue setup|Lanjutkan setup/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Continue setup|Lanjutkan setup/i }).click();

    // Templates step - skip without selecting (header Skip jumps to templates; now already there)
    await expect(page.getByRole("button", { name: /^Skip$/i }).last()).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /^Skip$/i }).last().click();

    // Goal step - start learning
    await expect(page.getByRole("button", { name: /Start Learning/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /Start Learning/i }).click();

    // Dashboard hero CTA visible - "Start today's ritual" (empty deck, no due cards)
    await expect(
      page.getByRole("button", { name: /Start today's ritual|Start today's session|Mulai ritual|Mulai sesi/i }),
    ).toBeVisible({ timeout: 10000 });
  });
});
