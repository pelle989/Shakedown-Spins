import { redirect, type RequestHandler } from '@sveltejs/kit';

import { buildDiscogsOAuthCallbackUrl, requestDiscogsRequestToken } from '$lib/server/discogs-oauth';

const DISCOGS_OAUTH_COOKIE = 'discogs_oauth_pending';

export const GET: RequestHandler = async ({ locals, cookies, url }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    throw redirect(303, '/?error=DiscogsAuth');
  }

  cookies.delete(DISCOGS_OAUTH_COOKIE, { path: '/' });

  const callbackUrl = buildDiscogsOAuthCallbackUrl(url.origin);
  let requestToken;

  try {
    requestToken = await requestDiscogsRequestToken(callbackUrl);
  } catch (error) {
    console.error('[discogs-oauth:start] request token failed', {
      userId: session.user.id,
      origin: url.origin,
      callbackUrl,
      error: error instanceof Error ? error.message : String(error)
    });
    throw redirect(303, '/?error=DiscogsOAuth');
  }

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
