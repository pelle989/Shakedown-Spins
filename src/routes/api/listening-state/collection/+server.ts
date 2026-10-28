import { json, type RequestHandler } from '@sveltejs/kit';
import { getStash } from '$lib/db';
import { getSharedOverlapCollection, getSharedSource, getUserSource } from '$lib/server/sources';

export const GET: RequestHandler = async ({ locals, url }) => {
  const session = await locals.auth();
  const kind = url.searchParams.get('kind');
  const id = url.searchParams.get('id');
  if (!id) return json({ message: 'Stash is required.' }, { status: 400 });
  let collection;
  if (kind === 'top10') {
    collection = await getStash(id);
  } else if (kind === 'shared') {
    collection = await getSharedSource(id);
  } else {
    if (!session?.user?.id) return json({ message: 'Sign in to restore your stash.' }, { status: 401 });
    if (kind === 'private') {
      collection = await getUserSource(session.user.id, id);
    } else if (kind === 'shared-overlap') {
      const mineSourceId = url.searchParams.get('mineSourceId');
      const sharedSourceId = url.searchParams.get('sharedSourceId');
      if (mineSourceId && sharedSourceId) collection = await getSharedOverlapCollection({ userId: session.user.id, mineSourceId, sharedSourceId });
    }
  }
  if (!collection) return json({ message: 'Your remembered stash is no longer available. It may have been deleted, left the public feed, or stopped being shared. Choose another stash below.' }, { status: 404 });
  return json({ collection }, { headers: { 'Cache-Control': 'private, no-store' } });
};
