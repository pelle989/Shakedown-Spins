import { eq } from 'drizzle-orm';

import type { UserUiPreferences } from '$lib/types';
import { authDb, schema } from '$lib/server/db/client';

const preferenceKeys = {
  welcomeSeen: 'welcome_seen',
  welcomeSeenAt: 'welcome_seen_at',
  friendLoadModes: 'friend_load_modes',
  friendShelfSources: 'friend_shelf_sources'
} as const;

const defaultPreferences: UserUiPreferences = {
  welcomeSeen: false,
  welcomeSeenAt: null,
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

function parseIsoDate(value: string) {
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
}

export async function getUserUiPreferences(userId: string): Promise<UserUiPreferences> {
  const rows = await authDb.query.userUiPreferences.findMany({
    where: eq(schema.userUiPreferences.userId, userId)
  });

  const preferences = { ...defaultPreferences };
  let legacyWelcomeSeen = false;

  for (const row of rows) {
    if (row.key === preferenceKeys.welcomeSeen) {
      legacyWelcomeSeen = parseBoolean(row.value);
    } else if (row.key === preferenceKeys.welcomeSeenAt) {
      preferences.welcomeSeenAt = parseIsoDate(row.value);
      preferences.welcomeSeen = Boolean(preferences.welcomeSeenAt);
    } else if (row.key === preferenceKeys.friendLoadModes) {
      preferences.friendLoadModes = parseRecord(row.value, ['full', 'matching']) as Record<
        string,
        'full' | 'matching'
      >;
    } else if (row.key === preferenceKeys.friendShelfSources) {
      preferences.friendShelfSources = parseRecord(row.value);
    }
  }

  if (!preferences.welcomeSeenAt && legacyWelcomeSeen) {
    preferences.welcomeSeen = true;
  }

  return preferences;
}

export async function updateUserUiPreferences(args: {
  userId: string;
  welcomeSeen?: boolean;
  welcomeSeenAt?: string | null;
  friendLoadModes?: Record<string, 'full' | 'matching'>;
  friendShelfSources?: Record<string, string>;
}): Promise<UserUiPreferences> {
  const now = new Date();
  const updates: Array<{ key: string; value: string }> = [];

  if (typeof args.welcomeSeen === 'boolean') {
    updates.push({
      key: preferenceKeys.welcomeSeenAt,
      value: args.welcomeSeen ? now.toISOString() : ''
    });
  }

  if (typeof args.welcomeSeenAt === 'string') {
    const parsedSeenAt = parseIsoDate(args.welcomeSeenAt);
    if (parsedSeenAt) {
      updates.push({
        key: preferenceKeys.welcomeSeenAt,
        value: parsedSeenAt
      });
    }
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
