import { test, expect } from '@playwright/test';

test('registration and sign-in redirection', async ({ page }) => {
  await page.goto('/auth/register');
  await expect(page.locator('h2')).toContainText('Create your account');

  await page.goto('/auth/signin');
  await expect(page.locator('h2')).toContainText('Sign in to Tailor');
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});
