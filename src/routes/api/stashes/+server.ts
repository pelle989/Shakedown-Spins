import { createStash, listStashes } from '$lib/db';
import { getIpHash } from '$lib/server/ip';
import { parseUploadFile, validateStashName } from '$lib/server/validation';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  return json(await listStashes());
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const rawName = formData.get('name');
    const file = formData.get('file');

    if (!(typeof rawName === 'string') || !(file instanceof File)) {
      return json({ message: 'A stash name and CSV file are required.' }, { status: 400 });
    }

    const name = validateStashName(rawName);
    const preview = await parseUploadFile(file);
    const ipHash = getIpHash(request.headers);

    const stash = await createStash({
      name,
      albums: preview.albums,
      ipHash
    });

    return json({ stash });
  } catch (error) {
    if (error instanceof Error && error.name === 'RateLimitError') {
      return json({ message: 'Too many stash uploads from this IP. Please try again later.' }, { status: 429 });
    }

    if (error instanceof Error) {
      return json({ message: error.message }, { status: 400 });
    }

    return json({ message: 'Unexpected server error.' }, { status: 500 });
  }
};
