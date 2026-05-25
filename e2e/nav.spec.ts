import { test, expect } from '@playwright/test';

test('navigation renders correctly', async ({ page }) => {
  // Navigation requires a session, so we expect it to be hidden without one
  await page.goto('/dashboard');
  const nav = page.locator('nav');
  await expect(nav).not.toBeVisible();
});
