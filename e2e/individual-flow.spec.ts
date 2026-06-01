import { test, expect } from '@playwright/test';

test('individual onboarding flow', async ({ page }) => {
  await page.goto('/onboard/individual');
  await expect(page.locator('h2')).toContainText('Personalize Your Briefing');

  await page.fill('input[placeholder="e.g. Alex"]', 'Test User');
  await page.click('text=Next: Choose Topics');

  await expect(page.locator('h2')).toContainText('Choose Your Topics');
});
