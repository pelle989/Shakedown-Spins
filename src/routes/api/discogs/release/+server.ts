import { getDiscogsReleaseDetails, getDiscogsReleaseDetailsByDiscogsId } from '$lib/server/discogs';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals, url }) => {
  const session = await locals.auth();
  const discogsId = url.searchParams.get('discogsId');
  const sourceId = url.searchParams.get('sourceId');
  const albumId = url.searchParams.get('albumId');

  if (!discogsId && (!sourceId || !albumId)) {
    return json({ message: 'Discogs release id or source/album ids are required.' }, { status: 400 });
  }

  try {
    const details = discogsId
      ? await getDiscogsReleaseDetailsByDiscogsId({
          discogsId,
          userId: session?.user?.id ?? null
        })
      : session?.user?.id
        ? await getDiscogsReleaseDetails({
            userId: session.user.id,
            sourceId: sourceId!,
            albumId: albumId!
          })
        : null;

    if (!details) {
      return json({ message: 'Sign in is required.' }, { status: 401 });
    }

    return json({ details });
  } catch (error) {
    if (error instanceof Error) {
      return json({ message: error.message }, { status: 400 });
    }

    return json({ message: 'Unexpected Discogs release error.' }, { status: 500 });
  }
};
