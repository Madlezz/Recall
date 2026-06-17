import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Start the dev server if not already running
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  // Click "Try with Demo Cards" to get past onboarding
  await page.click('button:has-text("Try with Demo Cards")');
  await page.waitForTimeout(1000);

  // Take dashboard screenshot
  await page.screenshot({ path: 'docs/screenshots/dashboard.png', fullPage: false });
  console.log('✓ dashboard.png');

  // Navigate to stats
  await page.click('button:has-text("Stats")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots/stats.png', fullPage: false });
  console.log('✓ stats.png');

  // Note: study.png needs to be captured manually in the actual Tauri app
  console.log('\n⚠ study.png needs manual capture in the Tauri app (browser mode doesn\'t support study interaction)');

  await browser.close();
  console.log('\nAll screenshots captured!');
})();
