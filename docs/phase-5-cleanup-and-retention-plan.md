# Phase 5 Cleanup And Retention Plan

## Goal

Phase 5 defines the first deliberate retention and cleanup layer for Shakedown Spins.

The goal is to prevent operational tables from quietly growing forever, while leaving intentional user data alone.

## Cleanup Targets

### 1. `sessions`

Reason:
- database-backed Auth.js sessions accumulate over time
- expired sessions are no longer useful once `expires < now()`

Policy:
- delete expired rows

Source:
- `src/auth.ts`
- `src/lib/server/db/schema.ts`

### 2. `verification_tokens`

Reason:
- magic-link tokens are one-time and expiring
- old expired tokens have no long-term value

Policy:
- delete expired rows

Source:
- `src/auth.ts`
- `src/lib/server/db/schema.ts`

### 3. `rate_limit_log`

Reason:
- this table is operational only
- Phase 1 already prunes it opportunistically during public stash creation
- a separate cleanup keeps it tidy even when public stash creation traffic is low

Policy:
- keep only the last 24 hours

Source:
- `sql/001_phase1.sql`

### 4. `member_messages`

Reason:
- inbox messages should not live forever
- a database cleanup makes retention consistent even for inactive users
- shared-stash message cards double as reusable access shortcuts

Policy:
- delete non-stash messages older than 30 days
- preserve shared-stash messages while the referenced shared source exists

Source:
- `src/lib/server/messages.ts`
- `src/lib/server/db/schema.ts`

## Explicit Non-Targets

These should not be part of automatic Phase 5 deletion:

### `sources`

Why not:
- this is intentional user library data
- deleting it automatically would be destructive product behavior

### `source_albums`

Why not:
- this is the album payload for user-owned collections

### `discogs_connections`

Why not:
- one row per user
- updated in place, not an accumulation problem

### `shared_source_access`

Why not:
- accepted friend stashes are intended to persist until the user removes them
- this is product state, not just residue

Future note:
- if you want stale-share cleanup later, add `last_used_at` first and make that a product decision

## Operational Plan

Phase 5 adds a Neon-safe SQL script:

- `sql/007_phase5_cleanup_and_retention.sql`

That script provides:

1. a preview function
2. a cleanup function
3. supporting indexes for global age-based deletion

## Recommended Run Pattern

### Manual

In Neon SQL Editor:

1. run the Phase 5 SQL once
2. preview cleanup candidates:

```sql
select * from preview_phase5_cleanup();
```

3. run cleanup:

```sql
select * from run_phase5_cleanup();
```

### Ongoing

Recommended cadence:
- daily or weekly

Best long-term path:
- attach this to a scheduled database maintenance job or external cron task

## Current Retention Defaults

- `sessions`: delete rows where `expires < now()`
- `verification_tokens`: delete rows where `expires < now()`
- `rate_limit_log`: keep 24 hours
- `member_messages`: keep shared-stash messages; delete non-stash messages after 30 days

These defaults are intentionally conservative and can be adjusted later without changing the product model.

## Future Phase 5.1 Candidates

Possible later additions:
- add `last_used_at` to `shared_source_access`
- add `last_opened_at` to `member_messages`
- add admin reporting for table growth
- add a dashboard note for cleanup counts
