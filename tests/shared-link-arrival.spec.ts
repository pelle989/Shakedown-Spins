import { expect, test } from '@playwright/test';

test('direct shared links show the arrival cue and load the friends stash', async ({ page }) => {
  await page.goto('/?__fixture=shared-link&sharedSource=fixture-shared-source');

  await expect(page.getByRole('status')).toContainText('Shared Link');
  await expect(page.getByRole('status')).toContainText('Jack’s Sunday Stack ready');
  await expect(page.getByRole('tab', { name: 'Friends Stash' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Jack’s Sunday Stack' })).toBeVisible();
  await expect(page.getByText('@jack-kirchner')).toBeVisible();
  await expect(page.getByText("2 albums loaded from a friend's shared collection")).toBeVisible();
});
