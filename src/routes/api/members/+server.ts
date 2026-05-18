import { json, type RequestHandler } from '@sveltejs/kit';

import { searchMembers } from '$lib/server/messages';

export const GET: RequestHandler = async ({ locals, url }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  const query = url.searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) {
    return json({ members: [] });
  }

  const members = await searchMembers({
    currentUserId: session.user.id,
    query
  });

  return json({ members });
};
