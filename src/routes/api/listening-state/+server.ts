import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { authDb, schema } from '$lib/server/db/client';
import { emptyListeningState, mergeListeningState, parseListeningState } from '$lib/listening-state';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) return json({ message: 'Sign in is required.' }, { status: 401 });
  const row = await authDb.query.listeningStates.findFirst({ where: eq(schema.listeningStates.userId, session.user.id) });
  return json({ state: row?.state ?? emptyListeningState() }, { headers: { 'Cache-Control': 'private, no-store' } });
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
  const session = await locals.auth();
  if (!session?.user?.id) return json({ message: 'Sign in is required.' }, { status: 401 });
  let incoming;
  try {
    const body = await request.text();
    if (body.length > 8_000_000) return json({ message: 'Listening state is too large.' }, { status: 413 });
    incoming = parseListeningState(JSON.parse(body));
  } catch {
    return json({ message: 'Invalid listening state.' }, { status: 400 });
  }
  const userId = session.user.id;
  const state = await authDb.transaction(async (tx) => {
    await tx.insert(schema.listeningStates).values({ userId, state: emptyListeningState() }).onConflictDoNothing();
    const [row] = await tx.select().from(schema.listeningStates).where(eq(schema.listeningStates.userId, userId)).for('update');
    const merged = mergeListeningState(row.state, incoming);
    await tx.update(schema.listeningStates).set({ state: merged, updatedAt: new Date() }).where(eq(schema.listeningStates.userId, userId));
    return merged;
  });
  return json({ state }, { headers: { 'Cache-Control': 'private, no-store' } });
};
