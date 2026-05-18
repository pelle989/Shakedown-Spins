import { getAlbumContext } from '$lib/server/album-context';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
  const artist = url.searchParams.get('artist')?.trim();
  const album = url.searchParams.get('album')?.trim();

  if (!artist || !album) {
    return json({ message: 'Artist and album are required.' }, { status: 400 });
  }

  try {
    const context = await getAlbumContext({ artist, album });
    return json({ context });
  } catch {
    return json({ context: null });
  }
};
