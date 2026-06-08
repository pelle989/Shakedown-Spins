import { isRedirect, redirect, type RequestHandler } from '@sveltejs/kit';

import { exchangeDiscogsAccessToken } from '$lib/server/discogs-oauth';
import { saveDiscogsOAuthConnection } from '$lib/server/discogs';

const DISCOGS_OAUTH_COOKIE = 'discogs_oauth_pending';

class DiscogsOAuthStateError extends Error {
  stateUserId?: string;

  constructor(message: string, args?: { stateUserId?: string }) {
    super(message);
    this.name = 'DiscogsOAuthStateError';
    this.stateUserId = args?.stateUserId;
  }
}

function logDiscogsOAuthFailure(
  step: string,
  args: {
    userId?: string;
    origin: string;
    denied: string | null;
    hasStateCookie: boolean;
    error?: unknown;
    stateUserId?: string;
  }
) {
  console.error('[discogs-oauth:callback] failure', {
    step,
    userId: args.userId ?? null,
    origin: args.origin,
    denied: args.denied,
    hasStateCookie: args.hasStateCookie,
    stateUserIdMatches: args.userId ? args.stateUserId === args.userId : null,
    error: args.error instanceof Error ? args.error.message : args.error ? String(args.error) : null
  });
}

export const GET: RequestHandler = async ({ locals, cookies, url }) => {
  const session = await locals.auth();
  const denied = url.searchParams.get('denied');
  const oauthToken = url.searchParams.get('oauth_token');
  const oauthVerifier = url.searchParams.get('oauth_verifier');
  const stateCookie = cookies.get(DISCOGS_OAUTH_COOKIE);

  cookies.delete(DISCOGS_OAUTH_COOKIE, { path: '/' });

  if (!session?.user?.id) {
    logDiscogsOAuthFailure('missing-session', {
      origin: url.origin,
      denied,
      hasStateCookie: Boolean(stateCookie)
    });
    throw redirect(303, '/?error=DiscogsAuth');
  }

  if (denied) {
    throw redirect(303, '/?error=DiscogsOAuthDenied');
  }

  if (!oauthToken || !oauthVerifier || !stateCookie) {
    logDiscogsOAuthFailure('missing-callback-state', {
      userId: session.user.id,
      origin: url.origin,
      denied,
      hasStateCookie: Boolean(stateCookie)
    });
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
      throw new DiscogsOAuthStateError('Discogs OAuth state mismatch.', {
        stateUserId: state.userId
      });
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
  } catch (error) {
    if (isRedirect(error)) {
      throw error;
    }

    if (error instanceof DiscogsOAuthStateError) {
      logDiscogsOAuthFailure('state-mismatch', {
        userId: session.user.id,
        origin: url.origin,
        denied,
        hasStateCookie: Boolean(stateCookie),
        stateUserId: error.stateUserId,
        error
      });
      throw redirect(303, '/?error=DiscogsOAuth');
    }

    logDiscogsOAuthFailure('exchange-or-save-failed', {
      userId: session.user.id,
      origin: url.origin,
      denied,
      hasStateCookie: Boolean(stateCookie),
      error
    });
    throw redirect(303, '/?error=DiscogsOAuth');
  }
};
