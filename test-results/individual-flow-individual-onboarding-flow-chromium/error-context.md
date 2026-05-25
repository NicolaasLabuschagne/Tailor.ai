# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: individual-flow.spec.ts >> individual onboarding flow
- Location: e2e/individual-flow.spec.ts:3:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h2')
Expected substring: "Personalize Your Briefing"
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
  3  | test('individual onboarding flow', async ({ page }) => {
  4  |   await page.goto('/onboard/individual');
> 5  |   await expect(page.locator('h2')).toContainText('Personalize Your Briefing');
     |                                    ^ Error: expect(locator).toContainText(expected) failed
  6  |
  7  |   await page.fill('input[placeholder="e.g. Alex"]', 'Test User');
  8  |   await page.click('text=Next: Choose Topics');
  9  |
  10 |   await expect(page.locator('h2')).toContainText('Choose Your Topics');
  11 | });
  12 |
```