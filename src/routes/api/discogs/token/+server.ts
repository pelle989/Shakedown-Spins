import { saveDiscogsToken } from '$lib/server/discogs';
import { json, type RequestHandler } from '@sveltejs/kit';
import { authDb, schema } from '$lib/server/db/client';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const rawToken = formData.get('token');

    if (typeof rawToken !== 'string') {
      return json({ message: 'Discogs personal token is required.' }, { status: 400 });
    }

    const username = await saveDiscogsToken({
      userId: session.user.id,
      token: rawToken
    });

    return json({ username });
  } catch (error) {
    if (error instanceof Error) {
      return json({ message: error.message }, { status: 400 });
    }

    return json({ message: 'Unexpected Discogs connection error.' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  await authDb.delete(schema.discogsConnections).where(eq(schema.discogsConnections.userId, session.user.id));

  return json({ ok: true });
};
