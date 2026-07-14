import { test, expect } from '@playwright/test';

test('landing shows both entry points and no search box', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'WhatDish' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Scan Menu' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload Photo' })).toBeVisible();

  // The old "search a dish" box was removed.
  await expect(page.getByPlaceholder(/search a dish/i)).toHaveCount(0);
});

test('Scan Menu opens the camera screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Scan Menu' }).click();
  // Camera screen shows a capture control; landing content is gone.
  await expect(page.getByRole('button', { name: 'Scan Menu' })).toHaveCount(0);
});
