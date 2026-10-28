import { expect, test } from '@playwright/test';
import { albumKey, emptyListeningState, mergeListeningState } from '../src/lib/listening-state';

const albums = [
  { id: 'fixture-album-a', artist: 'The Grateful Dead', title: 'Workingman’s Dead', year: 1970, genre: ['Rock'] },
  { id: 'fixture-album-b', artist: 'Miles Davis', title: 'Bitches Brew', year: 1970, genre: ['Jazz'] }
];
const source = { kind: 'shared' as const, id: 'fixture-shared-source', label: 'Jack’s Sunday Stack' };
const guestKey = 'shakedown-spins.listening.v1:guest';
const start = '/?__fixture=shared-link&sharedSource=fixture-shared-source';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('shakedown-anonymous-welcome-seen-v1', 'seen'));
  await page.route('**/api/artwork?**', (route) => route.fulfill({ json: { coverImageUrl: null } }));
  await page.route('**/api/album-context?**', (route) => route.fulfill({ json: { albumSummary: null, artistSummary: null } }));
  await page.route('**/api/listening-state/collection?**', (route) => route.fulfill({ json: { collection: { name: source.label, albums } } }));
});

test('guest picks survive reload, do not repeat, and clear preserves history', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(start);
  const random = page.getByRole('button', { name: 'Random', exact: true });
  await expect(page.getByRole('checkbox', { name: 'Remember previous picks' })).toBeChecked();
  await expect(random).toBeEnabled();
  await random.click();
  await expect(random).toBeEnabled();
  const first = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).active.currentKey, guestKey);
  expect(first).toBeTruthy();
  // Remove the explicit shared-link URL to exercise persisted source restoration.
  await page.goto('/?__fixture=shared-link');
  await expect(random).toBeEnabled();
  await expect(page.locator('.album-copy h3')).toHaveText(albums.find((album) => albumKey(album) === first)!.title);
  await random.click();
  await expect(random).toBeEnabled();
  const second = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).active.currentKey, guestKey);
  expect(second).not.toBe(first);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(random).toBeDisabled();
  const cleared = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), guestKey);
  expect(cleared.active).toBeNull();
  expect(Object.keys(cleared.histories['shared:fixture-shared-source'].entries)).toHaveLength(2);
  await page.reload();
  await expect(random).toBeDisabled();
  expect(errors).toEqual([]);
});

test('preference persists and history reset is separate from the current pick', async ({ page }) => {
  await page.goto(start);
  const random = page.getByRole('button', { name: 'Random', exact: true });
  await expect(random).toBeEnabled();
  await random.click();
  await expect(random).toBeEnabled();
  const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).active.currentKey, guestKey);
  await page.getByRole('button', { name: 'Reset shuffle history' }).click();
  await expect(page.getByText('Shuffle history reset for this stash.')).toBeVisible();
  const reset = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), guestKey);
  expect(reset.active.currentKey).toBe(before);
  expect(reset.histories['shared:fixture-shared-source'].entries).toEqual({});
  await page.getByRole('checkbox', { name: 'Remember previous picks' }).uncheck();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Remember previous picks' })).not.toBeChecked();
});

test('unavailable stash explains the failure and clears its bookmark', async ({ page }) => {
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
    key: guestKey, state: { ...emptyListeningState(), activeAt: Date.now(), active: {
      source, currentKey: null, recentKeys: [], filters: { genre: [], decade: [], label: [], format: [] }
    } }
  });
  await page.route('**/api/listening-state/collection?**', (route) => route.fulfill({ status: 404, json: {} }));
  await page.goto('/?__fixture=shared-link');
  await expect(page.getByText(/Your remembered stash is no longer available/)).toBeVisible();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).active, guestKey)).toBeNull();
});

test('blocked browser storage leaves Random usable and shows a save error', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage blocked', 'QuotaExceededError'); };
  });
  await page.goto(start);
  const random = page.getByRole('button', { name: 'Random', exact: true });
  await expect(random).toBeEnabled();
  await random.click();
  await expect(random).toBeEnabled();
  await expect(page.getByRole('alert')).toContainText('Could not save progress in this browser');
});


test('signed-in picks merge across devices and a save failure can be retried', async ({ browser }) => {
  let remote = { ...emptyListeningState(), activeAt: Date.now(), active: {
    source: { ...source, kind: 'private' as const }, currentKey: null, recentKeys: [],
    filters: { genre: [], decade: [], label: [], format: [] }
  } };
  let failSave = false;
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  try {
    for (const context of contexts) {
      await context.route('**/api/listening-state', async (route) => {
        if (route.request().method() === 'PATCH') {
          if (failSave) return route.fulfill({ status: 503, json: {} });
          remote = mergeListeningState(remote, route.request().postDataJSON()) as typeof remote;
        }
        await route.fulfill({ json: { state: remote } });
      });
      await context.route('**/api/listening-state/collection?**', (route) => route.fulfill({ json: { collection: { name: source.label, albums } } }));
      await context.route('**/api/artwork?**', (route) => route.fulfill({ json: { coverImageUrl: null } }));
      await context.route('**/api/album-context?**', (route) => route.fulfill({ json: {} }));
    }
    const first = await contexts[0].newPage();
    await first.goto('/?__fixture=listening-account');
    const random = first.getByRole('button', { name: 'Random', exact: true });
    await expect(random).toBeEnabled();
    await random.click();
    await expect(random).toBeEnabled();
    await expect.poll(() => remote.active?.currentKey).toBeTruthy();
    const firstKey = remote.active!.currentKey;
    const second = await contexts[1].newPage();
    await second.goto('/?__fixture=listening-account');
    await expect(second.getByRole('button', { name: 'Random', exact: true })).toBeEnabled();
    await expect(second.locator('.album-copy h3')).toHaveText(albums.find((album) => albumKey(album) === firstKey)!.title);
    failSave = true;
    await second.getByRole('button', { name: 'Random', exact: true }).click();
    await expect(second.getByRole('button', { name: 'Random', exact: true })).toBeEnabled();
    await expect(second.getByRole('alert')).toContainText('Could not save listening progress');
    const secondKey = await second.evaluate(() => JSON.parse(localStorage.getItem('shakedown-spins.listening.v1:fixture-listener')!).active.currentKey);
    expect(secondKey).not.toBe(firstKey);
    failSave = false;
    await second.getByRole('button', { name: 'Retry saving' }).click();
    await expect(second.getByRole('alert')).toHaveCount(0);
    await expect.poll(() => Object.values(remote.histories['private:fixture-shared-source']?.entries ?? {}).filter((e) => e.picked).length).toBe(2);
    await first.reload();
    await expect(first.locator('.album-copy h3')).toHaveText(albums.find((album) => albumKey(album) === secondKey)!.title);
  } finally { await Promise.all(contexts.map((context) => context.close())); }
});

test('changing accounts clears the private listening state and restores the next account independently', async ({ page }) => {
  const firstState = { ...emptyListeningState(), activeAt: Date.now(), active: {
    source: { ...source, kind: 'private' as const }, currentKey: albumKey(albums[0]), recentKeys: [albumKey(albums[0])],
    filters: { genre: [], decade: [], label: [], format: [] }
  } };
  let account = 'first';
  await page.route('**/api/listening-state', (route) => route.fulfill({ json: { state: account === 'first' ? firstState : emptyListeningState() } }));
  await page.goto('/?__fixture=listening-account');
  await expect(page.locator('.album-copy h3')).toHaveText(albums[0].title);
  account = 'second';
  // Use client navigation to exercise account switching without reloading the component.
  await page.evaluate(() => {
    const link = document.createElement('a');
    link.href = '/?__fixture=listening-other-account'; link.textContent = 'Switch test account'; document.body.append(link);
  });
  await page.getByRole('link', { name: 'Switch test account' }).click();
  await expect(page.getByRole('button', { name: 'Random', exact: true })).toBeDisabled();
  await expect(page.locator('.album-copy h3')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('shakedown-spins.listening.v1:fixture-other-listener'))).not.toBeNull();
});


test('transient restore failures retain the bookmark and retry restores filters and current pick', async ({ page }) => {
  const saved = { ...emptyListeningState(), activeAt: Date.now(), active: {
    source, currentKey: albumKey(albums[0]), recentKeys: [albumKey(albums[0])],
    filters: { genre: ['Jazz'], decade: [], label: [], format: [] }
  } };
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key: guestKey, state: saved });
  let offline = true;
  await page.route('**/api/listening-state/collection?**', (route) => route.fulfill(offline
    ? { status: 503, json: {} }
    : { json: { collection: { name: source.label, albums: albums.map((album) => ({ ...album, id: `replacement-${album.id}` })) } } }));
  await page.goto('/?__fixture=shared-link');
  await expect(page.getByRole('alert')).toContainText('Could not restore your stash');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).active.source.id, guestKey)).toBe(source.id);
  offline = false;
  await page.getByRole('button', { name: 'Retry saving' }).click();
  await expect(page.locator('.album-copy h3')).toHaveText(albums[0].title);
  await expect(page.getByRole('alert')).toHaveCount(0);
  const random = page.getByRole('button', { name: 'Random', exact: true });
  await expect(random).toBeEnabled();
  await random.click();
  await expect(random).toBeEnabled();
  await expect(page.locator('.album-copy h3')).toHaveText(albums[1].title);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).active.filters.genre, guestKey)).toEqual(['Jazz']);
});
