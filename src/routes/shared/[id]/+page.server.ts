import { error } from '@sveltejs/kit';

import { ensureSharedSourceAccess, getSharedSource, listUserSources } from '$lib/server/sources';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!params.id) {
    throw error(400, 'Shared source id is required.');
  }

  const sharedSource = await getSharedSource(params.id);
  if (!sharedSource) {
    throw error(404, 'That shared collection is no longer available.');
  }

  const session = await locals.auth();
  if (session?.user?.id) {
    await ensureSharedSourceAccess({
      userId: session.user.id,
      sourceId: sharedSource.id
    });
  }
  const mySources = session?.user?.id ? await listUserSources(session.user.id) : [];

  return {
    sharedSource,
    mySources,
    signedIn: Boolean(session?.user?.id)
  };
};
