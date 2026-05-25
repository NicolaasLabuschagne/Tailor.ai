# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: business-flow.spec.ts >> business onboarding and newsletter generation
- Location: e2e/business-flow.spec.ts:3:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/onboard/
Received string:  "chrome-error://chromewebdata/"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × unexpected value "chrome-error://chromewebdata/"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test('business onboarding and newsletter generation', async ({ page }) => {
  4  |   // In a real test we would mock auth and APIs
  5  |   // For this environment, we'll just check if the pages render correctly
  6  |   await page.goto('/get-started');
  7  |   await expect(page.locator('h2')).toContainText('How would you like to use Tailor?');
  8  |
  9  |   await page.click('text=Set up my business');
> 10 |   await expect(page).toHaveURL(/\/onboard/);
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  11 | });
  12 |
```