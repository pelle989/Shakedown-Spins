import { env } from '$env/dynamic/private';
import { json, type RequestHandler } from '@sveltejs/kit';

import { runPhase5Cleanup } from '$lib/server/maintenance';

function getExpectedTokens() {
  return [env.PHASE5_CLEANUP_TOKEN?.trim(), env.CRON_SECRET?.trim()].filter(
    (token): token is string => Boolean(token)
  );
}

function isAuthorized(request: Request) {
  const expectedTokens = getExpectedTokens();
  if (!expectedTokens.length) return false;

  const authHeader = request.headers.get('authorization')?.trim();
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const headerToken = request.headers.get('x-phase5-cleanup-token')?.trim();

  return expectedTokens.some((expected) => bearer === expected || headerToken === expected);
}

async function handleCleanup(request: Request) {
  if (!getExpectedTokens().length) {
    return json(
      { message: 'PHASE5_CLEANUP_TOKEN or CRON_SECRET must be configured.' },
      { status: 503 }
    );
  }

  if (!isAuthorized(request)) {
    return json({ message: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const results = await runPhase5Cleanup();
    return json({ results });
  } catch (error) {
    if (error instanceof Error) {
      return json({ message: error.message }, { status: 500 });
    }

    return json({ message: 'Unexpected server error.' }, { status: 500 });
  }
}

export const GET: RequestHandler = async ({ request }) => handleCleanup(request);
export const POST: RequestHandler = async ({ request }) => handleCleanup(request);
