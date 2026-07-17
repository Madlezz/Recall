/**
 * Capture README screenshots into docs/screenshots/.
 * Requires: pnpm dev on http://localhost:5173 and Playwright Chromium.
 *
 *   node scripts/take-screenshots.js
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.env.RECALL_URL ?? "http://localhost:5173";
const OUT = "docs/screenshots";
const VIEWPORT = { width: 1400, height: 900 };

async function completeOnboarding(page) {
  await page.goto(BASE);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForSelector("[role='region'][aria-label='Welcome to Recall']", { timeout: 15000 });

  await page.getByRole("button", { name: /Get Started/i }).click();
  await page.getByRole("button", { name: /Continue/i }).click();
  await page.getByRole("button", { name: /^Next$/i }).click();

  // Multiple starter decks → richer README shots
  for (const name of [/How This Works/i, /Coding/i, /Languages/i]) {
    await page.getByRole("button", { name }).click();
  }
  await page.getByRole("button", { name: /Continue \(3\)/i }).click();
  await page.getByRole("button", { name: /Start Learning/i }).click();
  await page.getByText("Your Decks").waitFor({ timeout: 15000 });
}

function sidebar(page) {
  return page.getByRole("navigation", { name: /Main navigation/i });
}

async function enableDarkTheme(page) {
  await sidebar(page).getByRole("button", { name: /^Settings$/i }).click();
  await page.waitForTimeout(400);
  // Appearance control — button/label "Dark"
  const dark = page.getByRole("button", { name: /^Dark$/i });
  if (await dark.count()) {
    await dark.first().click();
  } else {
    await page.getByText(/^Dark$/i).first().click();
  }
  await page.waitForTimeout(400);
}

async function seedReviews(page) {
  // Study a few cards so stats/heatmap aren't empty zeros
  await sidebar(page).getByRole("button", { name: /^Dashboard$/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /Start Review/i }).first().click();
  await page.waitForTimeout(600);

  for (let i = 0; i < 4; i++) {
    const reveal = page.getByRole("button", { name: /^Reveal$/i });
    if (await reveal.isVisible().catch(() => false)) {
      await reveal.click();
    } else {
      await page.keyboard.press("Space");
    }
    await page.waitForTimeout(250);
    // Prefer Good (3) for healthy-looking retention
    const good = page.getByRole("button", { name: /Good/i });
    if (await good.isVisible().catch(() => false)) {
      await good.click();
    } else {
      await page.keyboard.press("3");
    }
    await page.waitForTimeout(400);
  }

  const exit = page.getByRole("button", { name: /Exit study mode|^Exit$/i });
  if (await exit.count()) {
    await exit.first().click();
    await page.waitForTimeout(400);
  }
}

async function hideToasts(page) {
  await page.addStyleTag({
    content: `[data-sonner-toaster], [data-sonner-toast], li[data-sonner-toast] { display: none !important; visibility: hidden !important; }`,
  }).catch(() => {});
}

async function shot(page, name) {
  const path = `${OUT}/${name}`;
  await hideToasts(page);
  await page.waitForTimeout(350);
  await page.screenshot({ path, fullPage: false });
  console.log(`✓ ${name}`);
  return path;
}

function assertDistinct(paths) {
  const hashes = new Map();
  for (const path of paths) {
    const hash = createHash("sha256").update(readFileSync(path)).digest("hex");
    if (hashes.has(hash)) {
      throw new Error(`Duplicate screenshot content: ${path} == ${hashes.get(hash)}`);
    }
    hashes.set(hash, path);
  }
  console.log(`✓ ${paths.length} distinct screenshots`);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const paths = [];

  try {
    await completeOnboarding(page);
    await enableDarkTheme(page);
    await seedReviews(page);

    // Dashboard with multiple decks + review progress
    await sidebar(page).getByRole("button", { name: /^Dashboard$/i }).click();
    await page.waitForTimeout(500);
    paths.push(await shot(page, "dashboard.png"));

    await sidebar(page).getByRole("button", { name: /^Decks$/i }).click();
    await page.waitForTimeout(500);
    paths.push(await shot(page, "deck-browser.png"));

    await page.getByRole("button", { name: /How This Works/i }).first().click();
    await page.getByRole("button", { name: /Start studying this deck|Study Now/i }).waitFor({ timeout: 15000 });
    paths.push(await shot(page, "deck-detail.png"));

    await page.getByRole("button", { name: /Start studying this deck|Study Now/i }).click();
    await page.waitForTimeout(800);
    paths.push(await shot(page, "study.png"));

    const reveal = page.getByRole("button", { name: /^Reveal$/i });
    if (await reveal.isVisible().catch(() => false)) {
      await reveal.click();
    } else {
      await page.keyboard.press("Space");
    }
    await page.waitForTimeout(500);
    paths.push(await shot(page, "study-revealed.png"));

    const exit = page.getByRole("button", { name: /Exit study mode|^Exit$/i });
    if (await exit.count()) {
      await exit.first().click();
      await page.waitForTimeout(400);
    }

    await sidebar(page).getByRole("button", { name: /^Stats$/i }).click();
    await page.waitForTimeout(700);
    paths.push(await shot(page, "stats.png"));

    await sidebar(page).getByRole("button", { name: /^Tags$/i }).click();
    await page.waitForTimeout(500);
    // Open a tag so right pane shows cards
    const tagRow = page.getByRole("button", { name: /tutorial|coding|language/i }).first();
    if (await tagRow.count()) {
      await tagRow.click();
      await page.waitForTimeout(400);
    } else {
      await page.locator("main").getByText(/tutorial|coding|language/i).first().click({ force: true });
      await page.waitForTimeout(400);
    }
    paths.push(await shot(page, "tags.png"));

    await sidebar(page).getByRole("button", { name: /^Browser$/i }).click();
    await page.waitForTimeout(500);
    paths.push(await shot(page, "card-browser.png"));

    await sidebar(page).getByRole("button", { name: /^Settings$/i }).click();
    await page.waitForTimeout(500);
    paths.push(await shot(page, "settings.png"));

    assertDistinct(paths);
    console.log("\nAll screenshots captured.");
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
