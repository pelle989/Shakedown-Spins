# Shakedown Spins Phase 2 Auth Architecture

This document defines the recommended authentication approach for Phase 2.

## Recommendation

Use **Auth.js** with **SvelteKit** and **Neon-backed database sessions**.

Use an **existing Auth.js database adapter**, not a custom adapter.

Use the **Drizzle Adapter** as the concrete adapter choice.

Recommended first sign-in method:
- **email magic link** or email OTP

Recommended email provider:
- **Resend**

Recommended later additions:
- Google sign-in
- GitHub sign-in
- Discogs account linking after core auth is stable

## Why Auth.js

Auth.js is the best fit for the current stack because:

- it has a first-party SvelteKit integration via `@auth/sveltekit`
- it keeps auth inside the current SvelteKit app instead of introducing a second backend platform
- it fits Vercel deployment cleanly
- it leaves room for provider-based account linking later
- it lets us keep auth persistence boring and conventional by using a standard DB adapter

## Why Not the Other Main Options

### Supabase Auth

Supabase Auth is good in general, but this app already uses Neon for its primary data model.

Using Supabase only for auth would introduce:
- another backend service
- another dashboard and secret set
- a split-brain data model where auth lives in one system and app data lives in another

That is not impossible, but it adds architecture complexity too early.

### Clerk

Clerk is polished, but it is a heavier external auth product choice for this stage of the app.

For Shakedown Spins, the more important needs are:
- a clean SvelteKit-native flow
- private user-owned collections
- Discogs connection later

Auth.js is a lighter fit for that shape.

### Lucia

Lucia is not the right choice for a new build here because it is not the forward-looking default option we want to anchor Phase 2 around.

## Product Goals for Auth

Auth should solve:
- durable user identity
- private user-owned collections
- return visits across devices
- future source ownership and sharing rules

Auth should not:
- dominate the first-run product experience
- force heavy account-management UI too early
- make the app feel like an account settings product first

## Recommended Initial Auth Scope

### Phase 2A

Implement:
- sign in
- sign out
- session restore
- private user identity
- user-owned source creation

Do not implement yet:
- social provider sprawl
- account settings surface beyond the basics
- advanced profile management

## Recommended Sign-In Method

### First Release

Use:
- email magic link or email OTP delivered through Resend

Reasons:
- faster to ship
- less password complexity
- no password reset flow needed immediately
- sufficient for a private-by-default collection app

### Later

Add optional social sign-in if it helps adoption:
- Google
- GitHub

Discogs should be treated as a connected source account, not as the primary auth provider.

## Session Strategy

Use database-backed sessions stored in Neon.

Why:
- durable sessions
- easier server-side ownership checks
- good fit for SSR routes
- easier future revocation and auditing than a purely stateless client-first model

## Adapter Strategy

Use:
- an existing Auth.js DB adapter

Do not use initially:
- a custom Auth.js adapter
- JWT-only sessions as the primary Phase 2A session model

### Why This Is the Right Strategy

This gives Shakedown Spins:
- a faster path to working auth
- less custom auth persistence code
- a lower-risk Phase 2A foundation
- a clean separation between auth plumbing and product data

### Tradeoff

We accept that the auth tables should largely follow the adapter’s expected shape.

That is a good trade in Phase 2A because:
- auth is infrastructure
- the product differentiation is in sources, collections, artwork, and listening flow
- the app does not need custom auth-table behavior to deliver its main value

### Why Drizzle

Drizzle is the best fit here because:
- it keeps us close to Postgres
- it has a strong TypeScript story
- it is lighter than introducing a larger ORM stack
- it fits well with a future where auth tables are adapter-owned and product tables remain app-owned but strongly typed

## Recommended Core Data Model

Phase 2 auth should introduce at least:

- `users`
- `accounts`
- `sessions`
- `verification_tokens`

Depending on the adapter choice, exact table names can follow Auth.js adapter conventions.

Application ownership should reference:
- `sources.user_id`
- future shared-link ownership
- future source import ownership

## App Integration Points

### SvelteKit

Expected integration points:
- `src/hooks.server.ts`
- auth route(s) under `src/routes`
- server-side session helpers
- layout/server data for current user

### Product Flows

Auth should change these behaviors:
- signed-out user can still browse the public top-10 layer
- signed-in user can create durable private sources
- signed-in user can connect Discogs later
- session restore should prefer a user-owned durable source when appropriate

## UI Requirements

Auth UI should stay lightweight and in character with the current app.

Recommended patterns:
- a compact sign-in entrypoint
- a simple “continue with email” flow
- no heavy dashboard-style auth shell
- signed-in state integrated into the existing receiver/listening-room layout

## Security / Ops Requirements

Need to support:
- secure auth secrets in Vercel
- Resend-backed email delivery for magic links or OTP
- trusted callback URLs for local and production
- durable user/session tables in Neon

## Exact Environment Variables

Use these env vars for Phase 2A:

```env
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...

AUTH_SECRET=replace-with-a-long-random-secret
AUTH_TRUST_HOST=true
AUTH_URL=http://localhost:5173

RESEND_API_KEY=re_xxxxxxxxx
AUTH_EMAIL_FROM="Shakedown Spins <auth@yourdomain.com>"
```

### Notes

- `DATABASE_URL` remains the pooled Neon connection string.
- `DATABASE_URL_UNPOOLED` remains the direct Neon connection string.
- `AUTH_SECRET` is the Auth.js application secret.
- `AUTH_TRUST_HOST=true` should be set in trusted deployed environments like Vercel.
- `AUTH_URL` should point to the active app origin.
  - local example: `http://localhost:5173`
  - production example: `https://shakedown-spins.vercel.app`
- `RESEND_API_KEY` is the server-side Resend API key.
- `AUTH_EMAIL_FROM` is the sender address used for magic links or OTP emails.

## Exact Phase 2A Auth Tables

These are the exact recommended auth tables for Phase 2A, assuming an Auth.js DB adapter-compatible schema.

### `users`

- `id uuid primary key default gen_random_uuid()`
- `email text not null unique`
- `email_verified timestamptz`
- `name text`
- `image text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `accounts`

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
- `unique (provider, provider_account_id)`

### `sessions`

- `session_token text primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `expires timestamptz not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `verification_tokens`

- `identifier text not null`
- `token text not null`
- `expires timestamptz not null`
- `primary key (identifier, token)`
- `unique (token)`

## Auth Tables vs Product Tables

Phase 2A should keep a strict boundary:

### Auth.js / adapter-owned tables
- `users`
- `accounts`
- `sessions`
- `verification_tokens`

### Shakedown Spins product-owned tables
- `sources`
- `source_albums`
- later sync tables
- later sharing/publication tables

### Ownership Link

The bridge between the two systems is simple:
- `sources.user_id references users(id)`

That means:
- Auth.js manages identity and sessions
- the app manages owned collections and collection behavior

This separation is recommended and intentional.

## Exact Related Ownership Tables for Phase 2A

Auth is only useful if the app can attach durable ownership to collections.

Phase 2A should therefore also define:

### `sources`

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

### `source_albums`

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
- `unique (source_id, row_order)`

### Recommended Supporting Constraints

- `visibility in ('private', 'shared')`
- `sync_status in ('ready', 'syncing', 'error')`
- `album_count >= 0`
- `row_order >= 0`

## Phase 2A Schema Migration Strategy

Recommended migration order:

1. add Auth.js-compatible auth tables
2. add `sources`
3. add `source_albums`
4. keep Phase 1 `stashes`, `stash_albums`, and `rate_limit_log` intact
5. move only the signed-in durable-source flows onto the new tables

Do not:
- rewrite the public Phase 1 stash flow immediately
- merge auth tables into stash tables
- force public top-10 behavior to use the new durable-source model on day one

## Deferred Decisions

These can wait until after Phase 2A starts:
- exact social providers
- profile UI depth
- whether sharing is tied to identity handles or opaque IDs
- whether public stash publishing should be linked back to signed-in ownership

## Decision Summary

Approved direction:
- **Auth.js**
- **SvelteKit-native integration**
- **Neon-backed sessions**
- **Drizzle Adapter**
- **email magic link or OTP first**
- **Resend for auth email delivery**
- **Discogs later as a connected source, not primary auth**
