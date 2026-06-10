import { json, type RequestHandler } from '@sveltejs/kit';

import { getUserUiPreferences, updateUserUiPreferences } from '$lib/server/ui-preferences';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  return json({
    preferences: await getUserUiPreferences(session.user.id)
  });
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      welcomeSeen?: boolean;
      welcomeSeenAt?: string | null;
      friendLoadModes?: Record<string, 'full' | 'matching'>;
      friendShelfSources?: Record<string, string>;
    };

    const preferences = await updateUserUiPreferences({
      userId: session.user.id,
      welcomeSeen: payload.welcomeSeen,
      welcomeSeenAt: payload.welcomeSeenAt,
      friendLoadModes: payload.friendLoadModes,
      friendShelfSources: payload.friendShelfSources
    });

    return json({ preferences });
  } catch (error) {
    if (error instanceof Error) {
      return json({ message: error.message }, { status: 400 });
    }

    return json({ message: 'Unexpected server error.' }, { status: 500 });
  }
};
