import { redirect, type RequestHandler } from '@sveltejs/kit';

import { buildDiscogsOAuthCallbackUrl, requestDiscogsRequestToken } from '$lib/server/discogs-oauth';

const DISCOGS_OAUTH_COOKIE = 'discogs_oauth_pending';

export const GET: RequestHandler = async ({ locals, cookies, url }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    throw redirect(303, '/?error=DiscogsAuth');
  }

  const callbackUrl = buildDiscogsOAuthCallbackUrl(url.origin);
  const requestToken = await requestDiscogsRequestToken(callbackUrl);

  cookies.set(
    DISCOGS_OAUTH_COOKIE,
    JSON.stringify({
      userId: session.user.id,
      oauthToken: requestToken.oauthToken,
      oauthTokenSecret: requestToken.oauthTokenSecret
    }),
    {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      maxAge: 60 * 10
    }
  );

  throw redirect(303, requestToken.authorizeUrl);
};
