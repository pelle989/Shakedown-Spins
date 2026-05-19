import { expect, test } from '@playwright/test';

test('messages modal paginates inbox results and requires an explicit shared stash in compose', async ({ page }) => {
  await page.goto('/__e2e/messages');

  await expect(page.getByRole('heading', { name: 'Messages', exact: true })).toBeVisible();
  await expect(page.locator('.message-card')).toHaveCount(4);
  await expect(page.getByText('Jack’s Sunday Stack 5')).not.toBeVisible();

  await page.goto('/__e2e/messages?page=2');
  await expect(page.locator('.message-card')).toHaveCount(2);
  await expect(page.getByText('Jack’s Sunday Stack 5')).toBeVisible();

  await page.goto('/__e2e/messages?mode=compose');
  await expect(page.locator('#message-shared-source')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Share Stash' })).toBeDisabled();
});
