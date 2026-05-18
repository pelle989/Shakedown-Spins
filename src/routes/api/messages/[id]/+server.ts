import { json, type RequestHandler } from '@sveltejs/kit';

import { acceptMemberMessage, markMemberMessageRead } from '$lib/server/messages';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ message: 'Sign in is required.' }, { status: 401 });
  }

  if (!params.id) {
    return json({ message: 'Message id is required.' }, { status: 400 });
  }

  try {
    const payload = request ? ((await request.json().catch(() => ({}))) as { accept?: boolean }) : {};

    if (payload.accept) {
      const accepted = await acceptMemberMessage({
        userId: session.user.id,
        messageId: params.id
      });

      return json({ accepted: true, sourceId: accepted.sourceId });
    }

    const updated = await markMemberMessageRead({
      userId: session.user.id,
      messageId: params.id
    });

    if (!updated) {
      return json({ message: 'Message not found.' }, { status: 404 });
    }

    return json({ updated: true });
  } catch (error) {
    if (error instanceof Error) {
      return json({ message: error.message }, { status: 400 });
    }

    return json({ message: 'Unexpected message action error.' }, { status: 500 });
  }
};
