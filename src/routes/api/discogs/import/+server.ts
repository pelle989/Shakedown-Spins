import { importDiscogsCollection } from '$lib/server/discogs';
import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  try {
    const imported = await importDiscogsCollection(session.user.id);
    return json({
      imported
    });
  } catch (error) {
    if (error instanceof Error) {
      return json({ message: error.message }, { status: 400 });
    }

    return json({ message: 'Unexpected Discogs import error.' }, { status: 500 });
  }
};
