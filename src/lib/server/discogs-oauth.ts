import { createHmac, randomUUID } from 'node:crypto';

import { env } from '$env/dynamic/private';

import { fetchWithTimeout } from '$lib/server/http';

const DISCOGS_REQUEST_TOKEN_URL = 'https://api.discogs.com/oauth/request_token';
const DISCOGS_ACCESS_TOKEN_URL = 'https://api.discogs.com/oauth/access_token';
const DISCOGS_AUTHORIZE_URL = 'https://www.discogs.com/oauth/authorize';
const USER_AGENT = 'ShakedownSpins/1.0 +https://joekirchner.com';

function percentEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function normalizedUrl(url: URL) {
  const port =
    (url.protocol === 'https:' && url.port === '443') ||
    (url.protocol === 'http:' && url.port === '80') ||
    !url.port
      ? ''
      : `:${url.port}`;
  return `${url.protocol}//${url.hostname}${port}${url.pathname}`;
}

function buildSignatureBaseString(args: {
  method: string;
  url: URL;
  oauthParams: Record<string, string>;
  bodyParams?: Record<string, string>;
}) {
  const signatureParams = new URLSearchParams(args.url.search);

  for (const [key, value] of Object.entries(args.oauthParams)) {
    signatureParams.append(key, value);
  }

  for (const [key, value] of Object.entries(args.bodyParams ?? {})) {
    signatureParams.append(key, value);
  }

  const normalizedParams = Array.from(signatureParams.entries())
    .sort(([aKey, aValue], [bKey, bValue]) =>
      aKey === bKey ? aValue.localeCompare(bValue) : aKey.localeCompare(bKey)
    )
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join('&');

  return [
    args.method.toUpperCase(),
    percentEncode(normalizedUrl(args.url)),
    percentEncode(normalizedParams)
  ].join('&');
}

function signOAuthRequest(args: {
  method: string;
  url: URL;
  consumerSecret: string;
  tokenSecret?: string | null;
  oauthParams: Record<string, string>;
  bodyParams?: Record<string, string>;
}) {
  const baseString = buildSignatureBaseString({
    method: args.method,
    url: args.url,
    oauthParams: args.oauthParams,
    bodyParams: args.bodyParams
  });
  const signingKey = `${percentEncode(args.consumerSecret)}&${percentEncode(args.tokenSecret ?? '')}`;

  return createHmac('sha1', signingKey).update(baseString).digest('base64');
}

function buildOAuthHeader(params: Record<string, string>) {
  return `OAuth ${Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(', ')}`;
}

function parseOAuthResponse(text: string) {
  const params = new URLSearchParams(text);
  return {
    oauthToken: params.get('oauth_token'),
    oauthTokenSecret: params.get('oauth_token_secret'),
    oauthCallbackConfirmed: params.get('oauth_callback_confirmed'),
    oauthVerifier: params.get('oauth_verifier')
  };
}

function getDiscogsConsumerConfig() {
  const consumerKey = env.DISCOGS_CONSUMER_KEY ?? process.env.DISCOGS_CONSUMER_KEY ?? '';
  const consumerSecret = env.DISCOGS_CONSUMER_SECRET ?? process.env.DISCOGS_CONSUMER_SECRET ?? '';

  if (!consumerKey || !consumerSecret) {
    throw new Error('Discogs OAuth is not configured yet.');
  }

  return { consumerKey, consumerSecret };
}

export function isDiscogsOAuthConfigured() {
  return Boolean(
    (env.DISCOGS_CONSUMER_KEY ?? process.env.DISCOGS_CONSUMER_KEY ?? '') &&
      (env.DISCOGS_CONSUMER_SECRET ?? process.env.DISCOGS_CONSUMER_SECRET ?? '')
  );
}

export function buildDiscogsOAuthCallbackUrl(origin: string) {
  const authBase = env.AUTH_URL ?? process.env.AUTH_URL ?? origin;
  return new URL('/api/discogs/oauth/callback', authBase).toString();
}

async function discogsOAuthRequest(args: {
  url: string;
  method?: 'GET' | 'POST';
  token?: string;
  tokenSecret?: string | null;
  callbackUrl?: string;
  verifier?: string;
}) {
  const method = args.method ?? 'GET';
  const { consumerKey, consumerSecret } = getDiscogsConsumerConfig();
  const url = new URL(args.url);
  const bodyParams: Record<string, string> = {};

  if (args.callbackUrl) {
    bodyParams.oauth_callback = args.callbackUrl;
  }

  if (args.verifier) {
    bodyParams.oauth_verifier = args.verifier;
  }

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomUUID().replace(/-/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0'
  };

  if (args.token) {
    oauthParams.oauth_token = args.token;
  }

  oauthParams.oauth_signature = signOAuthRequest({
    method,
    url,
    consumerSecret,
    tokenSecret: args.tokenSecret,
    oauthParams,
    bodyParams: method === 'POST' ? bodyParams : undefined
  });

  return fetchWithTimeout(url, {
    method,
    headers: {
      Authorization: buildOAuthHeader(oauthParams),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT
    },
    body: method === 'POST' ? new URLSearchParams(bodyParams).toString() : undefined
  });
}

export async function requestDiscogsRequestToken(callbackUrl: string) {
  const response = await discogsOAuthRequest({
    url: DISCOGS_REQUEST_TOKEN_URL,
    method: 'POST',
    callbackUrl
  });

  const text = await response.text();
  const payload = parseOAuthResponse(text);

  if (!response.ok || !payload.oauthToken || !payload.oauthTokenSecret) {
    throw new Error(`Discogs OAuth request token failed: ${text || response.statusText}`);
  }

  return {
    oauthToken: payload.oauthToken,
    oauthTokenSecret: payload.oauthTokenSecret,
    authorizeUrl: `${DISCOGS_AUTHORIZE_URL}?oauth_token=${encodeURIComponent(payload.oauthToken)}`
  };
}

export async function exchangeDiscogsAccessToken(args: {
  oauthToken: string;
  oauthTokenSecret: string;
  oauthVerifier: string;
}) {
  const response = await discogsOAuthRequest({
    url: DISCOGS_ACCESS_TOKEN_URL,
    method: 'POST',
    token: args.oauthToken,
    tokenSecret: args.oauthTokenSecret,
    verifier: args.oauthVerifier
  });

  const text = await response.text();
  const payload = parseOAuthResponse(text);

  if (!response.ok || !payload.oauthToken || !payload.oauthTokenSecret) {
    throw new Error(`Discogs OAuth access token failed: ${text || response.statusText}`);
  }

  return {
    oauthToken: payload.oauthToken,
    oauthTokenSecret: payload.oauthTokenSecret
  };
}

export async function fetchDiscogsOAuthIdentity(args: {
  oauthToken: string;
  oauthTokenSecret: string;
}) {
  const response = await discogsOAuthRequest({
    url: 'https://api.discogs.com/oauth/identity',
    token: args.oauthToken,
    tokenSecret: args.oauthTokenSecret
  });

  const payload = (await response.json().catch(() => null)) as
    | { id?: string | number; username?: string }
    | null;

  if (!response.ok || !payload?.username) {
    throw new Error('Discogs OAuth identity could not be verified.');
  }

  return {
    username: payload.username,
    discogsUserId: payload.id ? String(payload.id) : null
  };
}

export async function fetchDiscogsOAuthResource(args: {
  url: string;
  oauthToken: string;
  oauthTokenSecret: string;
}) {
  return discogsOAuthRequest({
    url: args.url,
    token: args.oauthToken,
    tokenSecret: args.oauthTokenSecret
  });
}
