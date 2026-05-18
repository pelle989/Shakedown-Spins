import { and, asc, desc, eq, ilike, isNull, ne, or } from 'drizzle-orm';

import type {
  MemberDirectoryEntry,
  MemberMessageSummary,
  SharedOwnerProfile
} from '$lib/types';
import { authDb, schema } from '$lib/server/db/client';
import { buildSharedOwnerProfile } from '$lib/server/profile';
import { ensureSharedSourceAccess } from '$lib/server/sources';
import { validateMessageBody } from '$lib/server/validation';

function memberMessagesUnavailable(error: unknown) {
  return (
    error instanceof Error &&
    /member_messages|relation .* does not exist|column .*member_messages/i.test(error.message)
  );
}

function mapMember(user: typeof schema.users.$inferSelect): MemberDirectoryEntry {
  const owner = buildSharedOwnerProfile(user);

  return {
    id: user.id,
    ...owner
  };
}

function mapOwner(user: typeof schema.users.$inferSelect): SharedOwnerProfile {
  return buildSharedOwnerProfile(user);
}

function mapMessageSummary(args: {
  userId: string;
  row: typeof schema.memberMessages.$inferSelect & {
    sender: typeof schema.users.$inferSelect | null;
    recipient: typeof schema.users.$inferSelect | null;
    sharedSource:
      | (typeof schema.sources.$inferSelect & { user: typeof schema.users.$inferSelect | null })
      | null;
  };
}): MemberMessageSummary | null {
  const { row, userId } = args;

  if (!row.sender || !row.recipient) return null;

  return {
    id: row.id,
    direction: row.recipientUserId === userId ? 'inbox' : 'sent',
    body: row.body?.trim() || undefined,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString(),
    sender: mapOwner(row.sender),
    recipient: mapOwner(row.recipient),
    sharedSource:
      row.sharedSource && row.sharedSource.user
        ? {
            id: row.sharedSource.id,
            name: row.sharedSource.name,
            owner: mapOwner(row.sharedSource.user)
          }
        : null
  };
}

export async function listMemberMessages(userId: string): Promise<{
  messages: MemberMessageSummary[];
  unreadCount: number;
}> {
  try {
    const rows = await authDb.query.memberMessages.findMany({
      where: eq(schema.memberMessages.recipientUserId, userId),
      orderBy: [desc(schema.memberMessages.createdAt)],
      limit: 24,
      with: {
        sender: true,
        recipient: true,
        sharedSource: {
          with: {
            user: true
          }
        }
      }
    });

    const unreadRows = await authDb.query.memberMessages.findMany({
      where: and(
        eq(schema.memberMessages.recipientUserId, userId),
        isNull(schema.memberMessages.readAt)
      ),
      columns: {
        id: true
      }
    });

    return {
      messages: rows
        .map((row) => mapMessageSummary({ userId, row }))
        .filter((row): row is MemberMessageSummary => Boolean(row)),
      unreadCount: unreadRows.length
    };
  } catch (error) {
    if (memberMessagesUnavailable(error)) {
      console.warn('Member inbox unavailable until sql/006_phase2f_member_messages.sql is applied.');
      return {
        messages: [],
        unreadCount: 0
      };
    }

    throw error;
  }
}

export async function searchMembers(args: {
  currentUserId: string;
  query: string;
}): Promise<MemberDirectoryEntry[]> {
  const query = args.query.trim().replace(/^@+/, '');
  if (query.length < 2) return [];

  const pattern = `%${query.replace(/\s+/g, '%')}%`;

  const rows = await authDb.query.users.findMany({
    where: and(
      ne(schema.users.id, args.currentUserId),
      or(
        ilike(schema.users.handle, pattern),
        ilike(schema.users.publicProfileName, pattern),
        ilike(schema.users.name, pattern),
        ilike(schema.users.email, pattern)
      )
    ),
    orderBy: [asc(schema.users.handle)],
    limit: 8
  });

  return rows.map(mapMember);
}

export async function sendMemberMessage(args: {
  senderUserId: string;
  recipientUserId: string;
  sharedSourceId: string;
  body?: string;
}): Promise<MemberMessageSummary> {
  try {
    if (args.senderUserId === args.recipientUserId) {
      throw new Error('You cannot send a shared stash to yourself.');
    }

    const sharedSource = await authDb.query.sources.findFirst({
      where: and(
        eq(schema.sources.id, args.sharedSourceId),
        eq(schema.sources.userId, args.senderUserId),
        eq(schema.sources.visibility, 'shared')
      ),
      with: {
        user: true
      }
    });

    if (!sharedSource?.user) {
      throw new Error('Share the stash first before sending it to another member.');
    }

    const recipient = await authDb.query.users.findFirst({
      where: eq(schema.users.id, args.recipientUserId)
    });

    if (!recipient) {
      throw new Error('That member could not be found.');
    }

    const [message] = await authDb
      .insert(schema.memberMessages)
      .values({
        senderUserId: args.senderUserId,
        recipientUserId: args.recipientUserId,
        sharedSourceId: args.sharedSourceId,
        body: validateMessageBody(args.body ?? '') || null
      })
      .returning();

    return {
      id: message.id,
      direction: 'sent',
      body: message.body?.trim() || undefined,
      createdAt: message.createdAt.toISOString(),
      readAt: undefined,
      sender: mapOwner(sharedSource.user),
      recipient: mapOwner(recipient),
      sharedSource: {
        id: sharedSource.id,
        name: sharedSource.name,
        owner: mapOwner(sharedSource.user)
      }
    };
  } catch (error) {
    if (memberMessagesUnavailable(error)) {
      throw new Error('Run sql/006_phase2f_member_messages.sql in Neon to enable the message inbox.');
    }

    throw error;
  }
}

export async function acceptMemberMessage(args: {
  userId: string;
  messageId: string;
}): Promise<{ sourceId: string }> {
  try {
    const message = await authDb.query.memberMessages.findFirst({
      where: and(
        eq(schema.memberMessages.id, args.messageId),
        eq(schema.memberMessages.recipientUserId, args.userId)
      )
    });

    if (!message?.sharedSourceId) {
      throw new Error('This message does not include a shared stash.');
    }

    await ensureSharedSourceAccess({
      userId: args.userId,
      sourceId: message.sharedSourceId
    });

    if (!message.readAt) {
      await authDb
        .update(schema.memberMessages)
        .set({
          readAt: new Date()
        })
        .where(eq(schema.memberMessages.id, message.id));
    }

    return { sourceId: message.sharedSourceId };
  } catch (error) {
    if (memberMessagesUnavailable(error)) {
      throw new Error('Run sql/006_phase2f_member_messages.sql in Neon to enable the message inbox.');
    }

    throw error;
  }
}

export async function markMemberMessageRead(args: {
  userId: string;
  messageId: string;
}): Promise<boolean> {
  try {
    const [message] = await authDb
      .update(schema.memberMessages)
      .set({
        readAt: new Date()
      })
      .where(
        and(
          eq(schema.memberMessages.id, args.messageId),
          eq(schema.memberMessages.recipientUserId, args.userId),
          isNull(schema.memberMessages.readAt)
        )
      )
      .returning({ id: schema.memberMessages.id });

    return Boolean(message);
  } catch (error) {
    if (memberMessagesUnavailable(error)) {
      return false;
    }

    throw error;
  }
}
