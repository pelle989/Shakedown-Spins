# Shakedown Spins

Shakedown Spins turns a record collection into a fast listening ritual. Load a stash, press `Random`, and let the app pick the next album instead of scrolling through a spreadsheet or library view.

The app is a `SvelteKit + TypeScript` project with a 1970s receiver-inspired interface, private member collections, Discogs import, member-to-member stash sharing, and shared matching-album listening.

## Current Product

- `Street Feed`: the latest 10 public CSV stashes.
- `My Stash`: signed-in private CSV uploads and Discogs imports.
- `Friends Stash`: accepted shared collections from other members.
- `Messages`: internal member inbox for sending and accepting shared stashes.
- `Matching Albums`: compare a friend's shared stash against one of your own stashes and randomize only through the albums you both have.
- `Discogs`: personal-token connection, import, manual refresh, and reset flow.
- `CSV Replace`: update an existing private CSV stash while preserving its identity, share state, and friend links.
- `Album Art`: Discogs image lookup first, then MusicBrainz / Cover Art Archive, then iTunes fallback.
- `Pop-Up Facts`: short album or artist context from Wikipedia, with source links when text is truncated.
- `Phase 5 Cleanup`: retention functions and a protected cleanup endpoint for operational tables.

## Tech Stack

- SvelteKit 2
- Svelte 5
- TypeScript
- Vercel adapter
- Neon Postgres
- Drizzle ORM
- Auth.js with Resend magic links

## Environment Variables

Copy [.env.example](/Users/joe/Documents/Grateful-Stash/.env.example) to `.env` for local development and configure the same values in production.

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@YOUR-POOLED-HOST/neondb?sslmode=require&channel_binding=require
DATABASE_URL_UNPOOLED=postgresql://USERNAME:PASSWORD@YOUR-DIRECT-HOST/neondb?sslmode=require&channel_binding=require

AUTH_SECRET=replace-with-a-long-random-secret
AUTH_TRUST_HOST=true
AUTH_URL=http://localhost:5173

RESEND_API_KEY=re_xxxxxxxxx
AUTH_EMAIL_FROM="Shakedown Spins <auth@yourdomain.com>"

PHASE5_CLEANUP_TOKEN=replace-with-a-long-random-token
CRON_SECRET=replace-with-a-long-random-token
```

Notes:

- `DATABASE_URL` should use the pooled Neon connection string for app traffic.
- `DATABASE_URL_UNPOOLED` should use the direct Neon connection string for migrations and Drizzle tasks.
- `AUTH_URL` should be `http://localhost:5173` locally and your production URL in Vercel.
- `AUTH_SECRET` should be a long random value and must be set in production.
- `RESEND_API_KEY` powers the magic-link email flow.
- `AUTH_EMAIL_FROM` should use a sender domain verified in Resend.
- `PHASE5_CLEANUP_TOKEN` protects the maintenance cleanup endpoint for manual or external calls.
- `CRON_SECRET` is the preferred Vercel cron secret because Vercel sends it automatically as a Bearer token.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure `.env` from [.env.example](/Users/joe/Documents/Grateful-Stash/.env.example).

3. Apply the SQL migrations in order to the target Neon branch:

```text
sql/001_phase1.sql
sql/002_phase2a_auth_and_sources.sql
sql/003_phase2b_discogs_connections.sql
sql/004_phase2d_owner_profiles.sql
sql/005_phase2e_shared_source_access.sql
sql/006_phase2f_member_messages.sql
sql/007_phase5_cleanup_and_retention.sql
sql/008_phase5_ui_preferences_and_cleanup_endpoint.sql
```

4. Start the app:

```bash
npm run dev
```

The local app usually runs at [http://localhost:5173](http://localhost:5173).

## CSV Format

Required columns:

- `Artist`
- `Title`

Optional columns:

- `Year`
- `Genre`
- `Label`
- `Format`
- `Discogs ID`
- `Notes`

The importer is forgiving about common header variants, but `Artist` and `Title` are required.

Example Discogs-style CSV:

```csv
Catalog#,Artist,Title,Label,Format,Rating,Released,release_id,CollectionFolder,Date Added,Collection Media Condition,Collection Sleeve Condition,Collection Notes
R1 186569,Aretha Franklin,I Never Loved a Man the Way I Love You,"Atlantic, Rhino Records (2)","LP, Album, Reissue, Stereo",5,1967,16972656,Favorites,2026-05-01,Near Mint (NM or M-),Very Good Plus (VG+),Soul classic
MOVLP 279,Talking Heads,Remain in Light,Music On Vinyl,"LP, Album, Reissue",4,1980,1146804,Main Room,2026-05-02,Very Good Plus (VG+),Very Good Plus (VG+),
```

## Verify

Run:

```bash
npm run check
```

Recommended demo smoke test:

1. Sign in with a magic link.
2. Upload a private CSV to `My Stash`.
3. Replace that CSV from `Edit Stash`.
4. Connect Discogs with a personal token.
5. Import or manually refresh Discogs.
6. Share a stash through `Messages`.
7. Accept that stash as another member.
8. Load the friend stash as a full collection.
9. Toggle matching albums and load the matching collection.
10. Clear the active stash and confirm the saved shelf returns.

## Deploy

Typical Vercel setup:

1. Push the repository to GitHub.
2. Import the repository into Vercel as a SvelteKit project.
3. Set all required environment variables in Vercel.
4. Apply all SQL migrations to the production Neon branch.
5. Deploy from the selected branch.

Deployment notes:

- Leave Vercel `Output Directory` blank.
- `AUTH_URL` must match the deployed site URL.
- The Resend sender in `AUTH_EMAIL_FROM` must be verified.
- The Phase 5 cleanup endpoint should be protected by either `PHASE5_CLEANUP_TOKEN` or `CRON_SECRET`.

## Phase 5 Cleanup

Phase 5 keeps operational tables from growing forever while leaving user-owned stash data intact.

Cleanup targets:

- expired `sessions`
- expired `verification_tokens`
- `rate_limit_log` older than 24 hours
- `member_messages` older than 30 days

After applying [sql/007_phase5_cleanup_and_retention.sql](/Users/joe/Documents/Grateful-Stash/sql/007_phase5_cleanup_and_retention.sql), you can preview and run cleanup in Neon:

```sql
select * from preview_phase5_cleanup();
select * from run_phase5_cleanup();
```

The protected app endpoint is documented in [docs/phase-5-scheduling.md](/Users/joe/Documents/Grateful-Stash/docs/phase-5-scheduling.md).

## Notes

- Accepted friend stashes persist until the recipient removes them.
- Private sources and `source_albums` are intentional user data and are not auto-deleted.
- The public `Street Feed` remains capped at the latest 10 public stashes.
- Broader Phase 2 and Phase 5 planning lives in [docs](/Users/joe/Documents/Grateful-Stash/docs).

## Troubleshooting

- `DATABASE_URL_UNPOOLED is not configured`
  Usually means `.env` is missing the direct Neon connection string, or the dev server needs a restart after env changes.
- Magic links do not arrive
  Check `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, and Resend sender-domain verification.
- Shared messages do not send
  Confirm [sql/006_phase2f_member_messages.sql](/Users/joe/Documents/Grateful-Stash/sql/006_phase2f_member_messages.sql) has been applied to the same Neon branch your app uses.
- Friend preferences do not persist
  Confirm [sql/008_phase5_ui_preferences_and_cleanup_endpoint.sql](/Users/joe/Documents/Grateful-Stash/sql/008_phase5_ui_preferences_and_cleanup_endpoint.sql) has been applied.
