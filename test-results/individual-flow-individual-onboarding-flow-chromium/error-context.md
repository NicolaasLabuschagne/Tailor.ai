# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: individual-flow.spec.ts >> individual onboarding flow
- Location: e2e/individual-flow.spec.ts:3:5

# Error details

```
Error: page.goto: net::ERR_TOO_MANY_REDIRECTS at http://localhost:3006/onboard/individual
Call log:
  - navigating to "http://localhost:3006/onboard/individual", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test('individual onboarding flow', async ({ page }) => {
> 4  |   await page.goto('/onboard/individual');
     |              ^ Error: page.goto: net::ERR_TOO_MANY_REDIRECTS at http://localhost:3006/onboard/individual
  5  |   await expect(page.locator('h2')).toContainText('Personalize Your Briefing');
  6  |
  7  |   await page.fill('input[placeholder="e.g. Alex"]', 'Test User');
  8  |   await page.click('text=Next: Choose Topics');
  9  |
  10 |   await expect(page.locator('h2')).toContainText('Choose Your Topics');
  11 | });
  12 |
```