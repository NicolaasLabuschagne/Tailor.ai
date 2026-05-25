# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: nav.spec.ts >> navigation renders correctly
- Location: e2e/nav.spec.ts:3:5

# Error details

```
Error: page.goto: net::ERR_TOO_MANY_REDIRECTS at http://localhost:3006/dashboard
Call log:
  - navigating to "http://localhost:3006/dashboard", waiting until "load"

```

# Test source

```ts
  1 | import { test, expect } from '@playwright/test';
  2 |
  3 | test('navigation renders correctly', async ({ page }) => {
  4 |   // Navigation requires a session, so we expect it to be hidden without one
> 5 |   await page.goto('/dashboard');
    |              ^ Error: page.goto: net::ERR_TOO_MANY_REDIRECTS at http://localhost:3006/dashboard
  6 |   const nav = page.locator('nav');
  7 |   await expect(nav).not.toBeVisible();
  8 | });
  9 |
```