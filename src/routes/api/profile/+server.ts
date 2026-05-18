import { json, type RequestHandler } from '@sveltejs/kit';

import { updateUserProfileSettings } from '$lib/server/profile';
import { validateProfileHandle, validateProfileName } from '$lib/server/validation';

export const PATCH: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      publicProfileName?: string;
      displayName?: string;
      handle?: string;
    };

    const publicProfileName = validateProfileName(
      payload.publicProfileName ?? '',
      'Public profile name'
    );
    const displayName = validateProfileName(payload.displayName ?? '', 'Display name');
    const handle = validateProfileHandle(payload.handle ?? '');

    const profile = await updateUserProfileSettings({
      userId: session.user.id,
      publicProfileName,
      displayName,
      handle
    });

    if (!profile) {
      return json({ message: 'Profile not found.' }, { status: 404 });
    }

    return json({ profile });
  } catch (error) {
    if (error instanceof Error) {
      return json({ message: error.message }, { status: 400 });
    }

    return json({ message: 'Unexpected profile save error.' }, { status: 500 });
  }
};
