import { getStash } from '$lib/db';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
  if (!params.id) {
    return json({ message: 'Stash id is required.' }, { status: 400 });
  }

  const stash = await getStash(params.id);
  if (!stash) {
    return json({ message: 'Stash not found.' }, { status: 404 });
  }

  return json({ stash });
};
