import { dev } from '$app/environment';
import { getMessagesFixture } from '$lib/server/e2e-fixtures';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  if (!(dev || process.env.NODE_ENV === 'test')) {
    throw error(404, 'Not found');
  }

  const { messages, owner } = getMessagesFixture();
  const requestedPage = Number(url.searchParams.get('page') ?? '1');
  const requestedMode = url.searchParams.get('mode') === 'compose' ? 'compose' : 'inbox';

  return {
    messages,
    owner,
    initialInboxPage: requestedPage > 1 ? requestedPage - 1 : 0,
    initialMode: requestedMode,
    sharedSources: [
      {
        id: 'fixture-shared-source-a',
        name: 'Receiver Jack Night Stack',
        albumCount: 12,
        createdAt: '2026-05-12T12:00:00.000Z',
        updatedAt: '2026-05-18T12:00:00.000Z',
        kind: 'csv',
        visibility: 'shared',
        syncStatus: 'ready' as const
      },
      {
        id: 'fixture-shared-source-b',
        name: 'Receiver Jack Morning Stack',
        albumCount: 8,
        createdAt: '2026-05-10T12:00:00.000Z',
        updatedAt: '2026-05-18T12:00:00.000Z',
        kind: 'discogs',
        visibility: 'shared',
        syncStatus: 'ready' as const
      }
    ]
  };
};
