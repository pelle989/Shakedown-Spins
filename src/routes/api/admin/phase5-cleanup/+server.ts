import { env } from '$env/dynamic/private';
import { json, type RequestHandler } from '@sveltejs/kit';

import { runPhase5Cleanup } from '$lib/server/maintenance';

function isAuthorized(request: Request) {
  const expected = env.PHASE5_CLEANUP_TOKEN?.trim();
  if (!expected) return false;

  const authHeader = request.headers.get('authorization')?.trim();
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const headerToken = request.headers.get('x-phase5-cleanup-token')?.trim();

  return bearer === expected || headerToken === expected;
}

export const POST: RequestHandler = async ({ request }) => {
  if (!env.PHASE5_CLEANUP_TOKEN) {
    return json({ message: 'PHASE5_CLEANUP_TOKEN is not configured.' }, { status: 503 });
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
};
