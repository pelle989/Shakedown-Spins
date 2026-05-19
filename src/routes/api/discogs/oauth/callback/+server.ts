import { redirect, type RequestHandler } from '@sveltejs/kit';

import { exchangeDiscogsAccessToken } from '$lib/server/discogs-oauth';
import { saveDiscogsOAuthConnection } from '$lib/server/discogs';

const DISCOGS_OAUTH_COOKIE = 'discogs_oauth_pending';

export const GET: RequestHandler = async ({ locals, cookies, url }) => {
  const session = await locals.auth();
  const denied = url.searchParams.get('denied');
  const oauthToken = url.searchParams.get('oauth_token');
  const oauthVerifier = url.searchParams.get('oauth_verifier');
  const stateCookie = cookies.get(DISCOGS_OAUTH_COOKIE);

  cookies.delete(DISCOGS_OAUTH_COOKIE, { path: '/' });

  if (!session?.user?.id) {
    throw redirect(303, '/?error=DiscogsAuth');
  }

  if (denied) {
    throw redirect(303, '/?error=DiscogsOAuthDenied');
  }

  if (!oauthToken || !oauthVerifier || !stateCookie) {
    throw redirect(303, '/?error=DiscogsOAuth');
  }

  try {
    const state = JSON.parse(stateCookie) as {
      userId?: string;
      oauthToken?: string;
      oauthTokenSecret?: string;
    };

    if (
      state.userId !== session.user.id ||
      state.oauthToken !== oauthToken ||
      !state.oauthTokenSecret
    ) {
      throw new Error('Discogs OAuth state mismatch.');
    }

    const accessToken = await exchangeDiscogsAccessToken({
      oauthToken,
      oauthTokenSecret: state.oauthTokenSecret,
      oauthVerifier
    });

    await saveDiscogsOAuthConnection({
      userId: session.user.id,
      oauthToken: accessToken.oauthToken,
      oauthTokenSecret: accessToken.oauthTokenSecret
    });

    throw redirect(303, '/?discogs=oauth-connected');
  } catch {
    throw redirect(303, '/?error=DiscogsOAuth');
  }
};
