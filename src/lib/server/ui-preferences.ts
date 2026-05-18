import { eq } from 'drizzle-orm';

import type { UserUiPreferences } from '$lib/types';
import { authDb, schema } from '$lib/server/db/client';

const preferenceKeys = {
  welcomeSeen: 'welcome_seen',
  friendLoadModes: 'friend_load_modes',
  friendShelfSources: 'friend_shelf_sources'
} as const;

const defaultPreferences: UserUiPreferences = {
  welcomeSeen: false,
  friendLoadModes: {},
  friendShelfSources: {}
};

function parseRecord(
  value: string,
  allowedValues?: readonly string[]
): Record<string, string> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, entry]) =>
          typeof key === 'string' &&
          typeof entry === 'string' &&
          (!allowedValues || allowedValues.includes(entry))
      )
    );
  } catch {
    return {};
  }
}

function parseBoolean(value: string) {
  return value === 'true';
}

export async function getUserUiPreferences(userId: string): Promise<UserUiPreferences> {
  const rows = await authDb.query.userUiPreferences.findMany({
    where: eq(schema.userUiPreferences.userId, userId)
  });

  const preferences = { ...defaultPreferences };

  for (const row of rows) {
    if (row.key === preferenceKeys.welcomeSeen) {
      preferences.welcomeSeen = parseBoolean(row.value);
    } else if (row.key === preferenceKeys.friendLoadModes) {
      preferences.friendLoadModes = parseRecord(row.value, ['full', 'matching']) as Record<
        string,
        'full' | 'matching'
      >;
    } else if (row.key === preferenceKeys.friendShelfSources) {
      preferences.friendShelfSources = parseRecord(row.value);
    }
  }

  return preferences;
}

export async function updateUserUiPreferences(args: {
  userId: string;
  welcomeSeen?: boolean;
  friendLoadModes?: Record<string, 'full' | 'matching'>;
  friendShelfSources?: Record<string, string>;
}): Promise<UserUiPreferences> {
  const now = new Date();
  const updates: Array<{ key: string; value: string }> = [];

  if (typeof args.welcomeSeen === 'boolean') {
    updates.push({
      key: preferenceKeys.welcomeSeen,
      value: String(args.welcomeSeen)
    });
  }

  if (args.friendLoadModes) {
    updates.push({
      key: preferenceKeys.friendLoadModes,
      value: JSON.stringify(args.friendLoadModes)
    });
  }

  if (args.friendShelfSources) {
    updates.push({
      key: preferenceKeys.friendShelfSources,
      value: JSON.stringify(args.friendShelfSources)
    });
  }

  if (updates.length === 0) {
    return getUserUiPreferences(args.userId);
  }

  for (const update of updates) {
    await authDb
      .insert(schema.userUiPreferences)
      .values({
        userId: args.userId,
        key: update.key,
        value: update.value,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: [schema.userUiPreferences.userId, schema.userUiPreferences.key],
        set: {
          value: update.value,
          updatedAt: now
        }
      });
  }

  return getUserUiPreferences(args.userId);
}
