import { json, type RequestHandler } from '@sveltejs/kit';

import { listMemberMessages, sendMemberMessage } from '$lib/server/messages';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  const result = await listMemberMessages(session.user.id);
  return json(result);
};

export const POST: RequestHandler = async ({ locals, request }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      recipientId?: string;
      sharedSourceId?: string;
      body?: string;
    };

    if (!payload.recipientId || !payload.sharedSourceId) {
      return json({ message: 'A member and shared stash are required.' }, { status: 400 });
    }

    const sentMessage = await sendMemberMessage({
      senderUserId: session.user.id,
      recipientUserId: payload.recipientId,
      sharedSourceId: payload.sharedSourceId,
      body: payload.body
    });

    return json({ sentMessage });
  } catch (error) {
    if (error instanceof Error) {
      return json({ message: error.message }, { status: 400 });
    }

    return json({ message: 'Unexpected messaging error.' }, { status: 500 });
  }
};
