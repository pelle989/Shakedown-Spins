# Shakedown Spins Phase 2A Migration Spec

This document defines the first database migration target for Phase 2A.

It is a schema spec, not the final SQL file. The goal is to lock the migration shape before implementation starts.

## Purpose

Phase 2A needs to introduce:
- user identity
- Auth.js-compatible auth tables
- durable user-owned sources
- durable source album storage

This migration should **add** new Phase 2 tables without breaking the existing Phase 1 public stash flow.

## Migration Strategy

The Phase 2A migration should:
- keep existing Phase 1 tables intact
- add auth tables alongside them
- add durable source tables alongside them
- avoid rewriting or deleting Phase 1 public stash behavior

This means the Phase 1 tables remain:
- `stashes`
- `stash_albums`
- `rate_limit_log`

And the Phase 2A migration adds:
- `users`
- `accounts`
- `sessions`
- `verification_tokens`
- `sources`
- `source_albums`

## Table Set

## 1. `users`

Purpose:
- durable user identity
- owner record for private sources

Columns:
- `id uuid primary key default gen_random_uuid()`
- `email text not null unique`
- `email_verified timestamptz`
- `name text`
- `image text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes / constraints:
- `primary key (id)`
- `unique (email)`

## 2. `accounts`

Purpose:
- provider-linked accounts for Auth.js
- future social providers and Discogs account linkage support

Columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references users(id) on delete cascade`
- `type text not null`
- `provider text not null`
- `provider_account_id text not null`
- `refresh_token text`
- `access_token text`
- `expires_at integer`
- `token_type text`
- `scope text`
- `id_token text`
- `session_state text`
- `oauth_token_secret text`
- `oauth_token text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes / constraints:
- `unique (provider, provider_account_id)`
- index on `user_id`

## 3. `sessions`

Purpose:
- database-backed Auth.js sessions

Columns:
- `session_token text primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `expires timestamptz not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes / constraints:
- `primary key (session_token)`
- index on `user_id`
- index on `expires`

## 4. `verification_tokens`

Purpose:
- magic-link or OTP verification flow

Columns:
- `identifier text not null`
- `token text not null`
- `expires timestamptz not null`

Indexes / constraints:
- `primary key (identifier, token)`
- `unique (token)`
- index on `expires`

## 5. `sources`

Purpose:
- durable user-owned collection/source record
- shared abstraction for CSV and Discogs-backed collections

Columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references users(id) on delete cascade`
- `kind text not null`
- `name text not null`
- `visibility text not null default 'private'`
- `sync_status text not null default 'ready'`
- `last_synced_at timestamptz`
- `album_count integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended constraints:
- `visibility in ('private', 'shared')`
- `sync_status in ('ready', 'syncing', 'error')`
- `album_count >= 0`
- `length(trim(name)) > 0`
- `length(name) <= 100`

Indexes:
- index on `(user_id, created_at desc)`
- index on `(user_id, updated_at desc)`
- index on `(user_id, visibility)`

Notes:
- `kind` should support at least:
  - `csv`
  - `discogs`
- do not add `top10-public` here in Phase 2A unless we explicitly decide to unify public stashes into the source model later

## 6. `source_albums`

Purpose:
- durable albums belonging to a user-owned source

Columns:
- `id uuid primary key default gen_random_uuid()`
- `source_id uuid not null references sources(id) on delete cascade`
- `row_order integer not null`
- `artist text not null`
- `title text not null`
- `year integer`
- `genre text[] not null default '{}'`
- `label text`
- `format text`
- `discogs_id text`
- `notes text`
- `cover_image_url text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended constraints:
- `row_order >= 0`
- `unique (source_id, row_order)`

Indexes:
- index on `(source_id, row_order)`
- optional future indexes on `discogs_id`, `year`, or GIN on `genre` if needed after real usage

Notes:
- `cover_image_url` can exist here because Phase 2 durable sources are a better place to persist art than Phase 1 public stashes
- this table should remain source-owned, not shared with Phase 1 public stash rows

## Recommended Extension / Prerequisites

The migration should ensure:

```sql
create extension if not exists pgcrypto;
```

This keeps UUID generation aligned with the current Phase 1 approach.

## Recommended Migration Order

1. create `users`
2. create `accounts`
3. create `sessions`
4. create `verification_tokens`
5. create `sources`
6. create `source_albums`
7. add indexes
8. add constraints/checks

## Coexistence Rules

During Phase 2A:

- public top-10 stash browsing still reads from:
  - `stashes`
  - `stash_albums`
- signed-in durable sources read from:
  - `sources`
  - `source_albums`
- auth reads from:
  - `users`
  - `accounts`
  - `sessions`
  - `verification_tokens`

This split is intentional and should remain clear in both code and SQL.

## Not In This Migration

Do not include yet:
- source sync run tables
- share/publication tables for durable owned collections
- release image gallery tables
- full public-stash-to-source unification
- Discogs-specific import history tables unless needed immediately

Those can land in later Phase 2 migrations after auth and durable sources are stable.

## Exit Criteria

This migration is ready to implement when:
- table names are accepted
- ownership direction is accepted
- Phase 1 coexistence strategy is accepted
- we are ready to choose the exact Drizzle schema layout and migration file structure
