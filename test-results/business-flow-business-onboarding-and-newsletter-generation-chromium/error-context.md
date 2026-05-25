# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: business-flow.spec.ts >> business onboarding and newsletter generation
- Location: e2e/business-flow.spec.ts:3:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h2')
Expected substring: "How would you like to use Tailor?"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h2')

```

```yaml
- text: Internal Server Error
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test('business onboarding and newsletter generation', async ({ page }) => {
  4  |   // In a real test we would mock auth and APIs
  5  |   // For this environment, we'll just check if the pages render correctly
  6  |   await page.goto('/get-started');
> 7  |   await expect(page.locator('h2')).toContainText('How would you like to use Tailor?');
     |                                    ^ Error: expect(locator).toContainText(expected) failed
  8  |
  9  |   await page.click('text=Set up my business');
  10 |   await expect(page).toHaveURL(/\/onboard/);
  11 | });
  12 |
```