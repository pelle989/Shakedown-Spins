import { and, eq, ne } from 'drizzle-orm';

import type { SharedOwnerProfile, UserProfileSettings } from '$lib/types';
import { authDb, schema } from '$lib/server/db/client';

function titleize(value: string) {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function sanitizeHandle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deriveDisplayName(user: typeof schema.users.$inferSelect) {
  const emailLocal = user.email.split('@')[0] ?? 'listener';
  return user.name?.trim() || titleize(emailLocal) || 'Unknown Listener';
}

function deriveHandle(user: typeof schema.users.$inferSelect) {
  const emailLocal = user.email.split('@')[0] ?? 'listener';
  return user.handle?.trim() || sanitizeHandle(emailLocal) || 'listener';
}

export function buildSharedOwnerProfile(user: typeof schema.users.$inferSelect): SharedOwnerProfile {
  const displayName = deriveDisplayName(user);

  return {
    publicProfileName: user.publicProfileName?.trim() || displayName,
    displayName,
    handle: deriveHandle(user)
  };
}

export function buildUserProfileSettings(
  user: typeof schema.users.$inferSelect
): UserProfileSettings {
  const owner = buildSharedOwnerProfile(user);

  return {
    ...owner,
    email: user.email
  };
}

export async function getUserProfileSettings(userId: string): Promise<UserProfileSettings | null> {
  const user = await authDb.query.users.findFirst({
    where: eq(schema.users.id, userId)
  });

  return user ? buildUserProfileSettings(user) : null;
}

export async function updateUserProfileSettings(args: {
  userId: string;
  publicProfileName: string;
  displayName: string;
  handle: string;
}): Promise<UserProfileSettings | null> {
  const handle = sanitizeHandle(args.handle);
  const existingHandleUser = await authDb.query.users.findFirst({
    where: and(eq(schema.users.handle, handle), ne(schema.users.id, args.userId)),
    columns: {
      id: true
    }
  });

  if (existingHandleUser) {
    throw new Error('That handle is already taken.');
  }

  const [user] = await authDb
    .update(schema.users)
    .set({
      publicProfileName: args.publicProfileName,
      name: args.displayName,
      handle,
      updatedAt: new Date()
    })
    .where(eq(schema.users.id, args.userId))
    .returning();

  return user ? buildUserProfileSettings(user) : null;
}
