import { test, expect, type Page } from '@playwright/test';

// A minimal valid PNG; content does not matter in mock mode.
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000d4944415478da6360000002000001e221bc330000000049454e44ae426082',
  'hex',
);

async function uploadMenu(page: Page) {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'menu.png',
    mimeType: 'image/png',
    buffer: PNG,
  });
}

test('uploading a menu runs the scan and shows dishes', async ({ page }) => {
  await uploadMenu(page);

  // Processing screen, then the menu (mock data). The transition is paced, so
  // give it a generous timeout.
  await expect(page.getByText('Reading your menu')).toBeVisible();
  await expect(page.getByText(/dishes detected/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Bruschetta').first()).toBeVisible();

  // Menu is image-only now: no Image/List toggle.
  await expect(page.getByRole('button', { name: 'List' })).toHaveCount(0);

  // "Scan again" lets the user start a new scan from the results.
  await expect(page.getByRole('button', { name: /scan again/i })).toBeVisible();
});

test('opening a dish shows pronunciations and no extra action buttons', async ({ page }) => {
  await uploadMenu(page);
  await expect(page.getByText(/dishes detected/i)).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Hear pronunciation' }).first().click();

  await expect(page.getByText('English Pronunciation')).toBeVisible();
  await expect(page.getByText('Hindi Pronunciation')).toBeVisible();

  // The mic button and Replay/Edit/Share actions were removed.
  await expect(page.getByRole('button', { name: 'Replay' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Share' })).toHaveCount(0);
});
