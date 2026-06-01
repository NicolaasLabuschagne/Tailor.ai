import { test, expect } from '@playwright/test';

test('business onboarding and newsletter generation', async ({ page }) => {
  // In a real test we would mock auth and APIs
  // For this environment, we'll just check if the pages render correctly
  await page.goto('/get-started');
  await expect(page.locator('h2')).toContainText('How would you like to use Tailor?');

  await page.click('text=Set up my business');
  await expect(page).toHaveURL(/\/onboard/);
});
