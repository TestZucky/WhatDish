import { test, expect } from '@playwright/test';

test('renders on mobile and desktop widths without breaking', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Scan Menu' })).toBeVisible();
  // No horizontal overflow.
  const overflowMobile = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(overflowMobile).toBe(true);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole('button', { name: 'Scan Menu' })).toBeVisible();
  const overflowDesktop = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(overflowDesktop).toBe(true);
});
