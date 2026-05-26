# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-flow.spec.ts >> registration and sign-in redirection
- Location: e2e/auth-flow.spec.ts:3:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3006/auth/register", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test('registration and sign-in redirection', async ({ page }) => {
> 4  |   await page.goto('/auth/register');
     |              ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  5  |   await expect(page.locator('h2')).toContainText('Create your account');
  6  |
  7  |   await page.goto('/auth/signin');
  8  |   await expect(page.locator('h2')).toContainText('Sign in to Tailor');
  9  |   await expect(page.locator('input[name="email"]')).toBeVisible();
  10 |   await expect(page.locator('input[name="password"]')).toBeVisible();
  11 | });
  12 |
```