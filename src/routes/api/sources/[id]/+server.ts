import {
  deleteUserSource,
  getUserSource,
  replaceCsvSource,
  renameUserSource,
  updateUserSourceVisibility
} from '$lib/server/sources';
import { parseUploadFile, validateStashName } from '$lib/server/validation';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  if (!params.id) {
    return json({ message: 'Source id is required.' }, { status: 400 });
  }

  const source = await getUserSource(session.user.id, params.id);
  if (!source) {
    return json({ message: 'Source not found.' }, { status: 404 });
  }

  return json({ source });
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  if (!params.id) {
    return json({ message: 'Source id is required.' }, { status: 400 });
  }

  try {
    const payload = (await request.json()) as {
      name?: string;
      visibility?: 'private' | 'shared';
    };

    let source = null;

    if (typeof payload.name === 'string') {
      const name = validateStashName(payload.name);
      source = await renameUserSource({
        userId: session.user.id,
        sourceId: params.id,
        name
      });
    } else if (payload.visibility === 'private' || payload.visibility === 'shared') {
      source = await updateUserSourceVisibility({
        userId: session.user.id,
        sourceId: params.id,
        visibility: payload.visibility
      });
    } else {
      return json({ message: 'A valid update payload is required.' }, { status: 400 });
    }

    if (!source) {
      return json({ message: 'Source not found.' }, { status: 404 });
    }

    return json({ source });
  } catch (error) {
    if (error instanceof Error) {
      return json({ message: error.message }, { status: 400 });
    }

    return json({ message: 'Unexpected server error.' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  if (!params.id) {
    return json({ message: 'Source id is required.' }, { status: 400 });
  }

  const deleted = await deleteUserSource({
    userId: session.user.id,
    sourceId: params.id
  });

  if (!deleted) {
    return json({ message: 'Source not found.' }, { status: 404 });
  }

  return json({ deleted: true });
};

export const PUT: RequestHandler = async ({ params, locals, request }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  if (!params.id) {
    return json({ message: 'Source id is required.' }, { status: 400 });
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
    const source = await replaceCsvSource({
      userId: session.user.id,
      sourceId: params.id,
      name,
      albums: preview.albums
    });

    if (!source) {
      return json({ message: 'Source not found.' }, { status: 404 });
    }

    return json({ source });
  } catch (error) {
    if (error instanceof Error) {
      return json({ message: error.message }, { status: 400 });
    }

    return json({ message: 'Unexpected server error.' }, { status: 500 });
  }
};
