import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    emailVerified: timestamp('email_verified', { withTimezone: true, mode: 'date' }),
    name: text('name'),
    publicProfileName: text('public_profile_name'),
    handle: text('handle'),
    image: text('image'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    unique('users_email_unique').on(table.email),
    uniqueIndex('users_handle_unique_idx')
      .on(sql`lower(${table.handle})`)
      .where(sql`${table.handle} is not null and length(trim(${table.handle})) > 0`),
    check(
      'users_handle_format_check',
      sql`${table.handle} is null or ${table.handle} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`
    )
  ]
);

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
    oauth_token_secret: text('oauth_token_secret'),
    oauth_token: text('oauth_token'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    unique('accounts_provider_provider_account_id_unique').on(
      table.provider,
      table.providerAccountId
    ),
    index('accounts_user_id_idx').on(table.userId)
  ]
);

export const sessions = pgTable(
  'sessions',
  {
    sessionToken: text('session_token').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
  },
  (table) => [index('sessions_user_id_idx').on(table.userId), index('sessions_expires_idx').on(table.expires)]
);

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true, mode: 'date' }).notNull()
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
    unique('verification_tokens_token_unique').on(table.token),
    index('verification_tokens_expires_idx').on(table.expires)
  ]
);

export const discogsConnections = pgTable(
  'discogs_connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    authMode: text('auth_mode').notNull(),
    username: text('username').notNull(),
    oauthToken: text('oauth_token').notNull(),
    oauthTokenSecret: text('oauth_token_secret'),
    discogsUserId: text('discogs_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    unique('discogs_connections_user_id_unique').on(table.userId),
    index('discogs_connections_username_idx').on(table.username),
    check(
      'discogs_connections_auth_mode_check',
      sql`${table.authMode} in ('personal_token', 'oauth')`
    )
  ]
);

export const sources = pgTable(
  'sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    visibility: text('visibility').notNull().default('private'),
    syncStatus: text('sync_status').notNull().default('ready'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true, mode: 'date' }),
    albumCount: integer('album_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    index('sources_user_created_idx').on(table.userId, table.createdAt),
    index('sources_user_updated_idx').on(table.userId, table.updatedAt),
    index('sources_user_visibility_idx').on(table.userId, table.visibility),
    check('sources_visibility_check', sql`${table.visibility} in ('private', 'shared')`),
    check('sources_sync_status_check', sql`${table.syncStatus} in ('ready', 'syncing', 'error')`),
    check('sources_album_count_check', sql`${table.albumCount} >= 0`),
    check('sources_name_nonempty_check', sql`length(trim(${table.name})) > 0`),
    check('sources_name_length_check', sql`length(${table.name}) <= 100`)
  ]
);

export const sourceAlbums = pgTable(
  'source_albums',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    rowOrder: integer('row_order').notNull(),
    artist: text('artist').notNull(),
    title: text('title').notNull(),
    year: integer('year'),
    genre: text('genre').array().notNull().default([]),
    label: text('label'),
    format: text('format'),
    discogsId: text('discogs_id'),
    notes: text('notes'),
    coverImageUrl: text('cover_image_url'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    unique('source_albums_source_row_unique').on(table.sourceId, table.rowOrder),
    index('source_albums_source_row_idx').on(table.sourceId, table.rowOrder),
    check('source_albums_row_order_check', sql`${table.rowOrder} >= 0`)
  ]
);

export const sharedSourceAccess = pgTable(
  'shared_source_access',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    recipientUserId: uuid('recipient_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    unique('shared_source_access_source_recipient_unique').on(
      table.sourceId,
      table.recipientUserId
    ),
    index('shared_source_access_recipient_idx').on(table.recipientUserId, table.createdAt),
    index('shared_source_access_source_idx').on(table.sourceId)
  ]
);

export const memberMessages = pgTable(
  'member_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    senderUserId: uuid('sender_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recipientUserId: uuid('recipient_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sharedSourceId: uuid('shared_source_id').references(() => sources.id, { onDelete: 'set null' }),
    body: text('body'),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    index('member_messages_recipient_created_idx').on(table.recipientUserId, table.createdAt),
    index('member_messages_sender_created_idx').on(table.senderUserId, table.createdAt),
    index('member_messages_shared_source_idx').on(table.sharedSourceId),
    index('member_messages_recipient_read_idx').on(table.recipientUserId, table.readAt)
  ]
);

export const userUiPreferences = pgTable(
  'user_ui_preferences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: text('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    unique('user_ui_preferences_user_key_unique').on(table.userId, table.key),
    index('user_ui_preferences_user_updated_idx').on(table.userId, table.updatedAt),
    check(
      'user_ui_preferences_key_check',
      sql`${table.key} in ('welcome_seen', 'welcome_seen_at', 'friend_load_modes', 'friend_shelf_sources')`
    )
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  sources: many(sources),
  discogsConnections: many(discogsConnections),
  sharedSourceAccess: many(sharedSourceAccess),
  sentMessages: many(memberMessages, { relationName: 'message_sender' }),
  receivedMessages: many(memberMessages, { relationName: 'message_recipient' }),
  uiPreferences: many(userUiPreferences)
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id]
  })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

export const discogsConnectionsRelations = relations(discogsConnections, ({ one }) => ({
  user: one(users, {
    fields: [discogsConnections.userId],
    references: [users.id]
  })
}));

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  user: one(users, {
    fields: [sources.userId],
    references: [users.id]
  }),
  albums: many(sourceAlbums),
  sharedAccess: many(sharedSourceAccess),
  messages: many(memberMessages)
}));

export const sourceAlbumsRelations = relations(sourceAlbums, ({ one }) => ({
  source: one(sources, {
    fields: [sourceAlbums.sourceId],
    references: [sources.id]
  })
}));

export const sharedSourceAccessRelations = relations(sharedSourceAccess, ({ one }) => ({
  source: one(sources, {
    fields: [sharedSourceAccess.sourceId],
    references: [sources.id]
  }),
  recipient: one(users, {
    fields: [sharedSourceAccess.recipientUserId],
    references: [users.id]
  })
}));

export const memberMessagesRelations = relations(memberMessages, ({ one }) => ({
  sender: one(users, {
    relationName: 'message_sender',
    fields: [memberMessages.senderUserId],
    references: [users.id]
  }),
  recipient: one(users, {
    relationName: 'message_recipient',
    fields: [memberMessages.recipientUserId],
    references: [users.id]
  }),
  sharedSource: one(sources, {
    fields: [memberMessages.sharedSourceId],
    references: [sources.id]
  })
}));

export const userUiPreferencesRelations = relations(userUiPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userUiPreferences.userId],
    references: [users.id]
  })
}));
