import { createPrivateSource, listUserSources } from '$lib/server/sources';
import { parseUploadFile, validateStashName } from '$lib/server/validation';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  return json({ sources: await listUserSources(session.user.id) });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const rawName = formData.get('name');
    const file = formData.get('file');

    if (!(typeof rawName === 'string') || !(file instanceof File)) {
      return json({ message: 'A stash name and CSV file are required.' }, { status: 400 });
    }

    const name = validateStashName(rawName);
    const preview = await parseUploadFile(file);
    const source = await createPrivateSource({
      userId: session.user.id,
      name,
      albums: preview.albums
    });

    return json({ source });
  } catch (error) {
    if (error instanceof Error) {
      return json({ message: error.message }, { status: 400 });
    }

    return json({ message: 'Unexpected server error.' }, { status: 500 });
  }
};
