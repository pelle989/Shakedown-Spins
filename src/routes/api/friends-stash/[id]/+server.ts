import { json, type RequestHandler } from '@sveltejs/kit';

import {
  getSharedOverlapCollection,
  getSharedOverlapCount,
  revokeSharedSourceAccess
} from '$lib/server/sources';

export const GET: RequestHandler = async ({ params, url, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  if (!params.id) {
    return json({ message: 'Shared source id is required.' }, { status: 400 });
  }

  const mineSourceId = url.searchParams.get('mineSourceId');
  if (!mineSourceId) {
    return json({ message: 'Your source id is required.' }, { status: 400 });
  }

  if (url.searchParams.get('include') === 'albums') {
    const overlap = await getSharedOverlapCollection({
      userId: session.user.id,
      mineSourceId,
      sharedSourceId: params.id
    });

    if (!overlap) {
      return json({ message: 'Matching albums could not be calculated.' }, { status: 404 });
    }

    return json({ count: overlap.albumCount, albums: overlap.albums });
  }

  const count = await getSharedOverlapCount({
    userId: session.user.id,
    mineSourceId,
    sharedSourceId: params.id
  });

  if (count === null) {
    return json({ message: 'Matching albums could not be calculated.' }, { status: 404 });
  }

  return json({ count });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  if (!params.id) {
    return json({ message: 'Shared source id is required.' }, { status: 400 });
  }

  const deleted = await revokeSharedSourceAccess({
    userId: session.user.id,
    sourceId: params.id
  });

  if (!deleted) {
    return json({ message: 'Friends stash not found.' }, { status: 404 });
  }

  return json({ deleted: true });
};
