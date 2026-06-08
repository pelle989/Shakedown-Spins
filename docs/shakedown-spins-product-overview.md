# Shakedown Spins Product Overview and Agent Setup Directions

## How To Use This Document

Use this document as the top-level product and implementation brief for setting up, maintaining, or recreating the Shakedown Spins application.

The goal is not to describe a generic music app. The goal is to preserve this exact application:

- a SvelteKit listening randomizer
- a 1970s receiver-inspired interface
- public and private record stashes
- Discogs OAuth and personal-token import
- member-to-member stash sharing
- shared overlap listening collections
- magic-link authentication
- Neon Postgres persistence
- Vercel deployment

When giving this to another agent, start with:

```text
Use docs/shakedown-spins-product-overview.md as the source of truth. Set up Shakedown Spins exactly as described. Preserve the existing product model, visual direction, data model, and user workflows unless I explicitly ask for a product change.
```

## Product Identity

Shakedown Spins turns a record collection into a listening ritual. The user loads a stash, presses `Random`, and lets the app choose the next album instead of scrolling through a spreadsheet, Discogs collection, or streaming library.

The app should feel like a physical stereo receiver in a listening room. It is not a SaaS dashboard, not a generic music player, and not a spreadsheet tool with decoration. The main interaction is simple: load records, randomize records, filter records, and share records with friends.

## Core Promise

The product promise is:

```text
Load a record stash, press Random, and discover what to play next.
```

Everything else supports that promise.

## Product Principles

1. Keep the listening loop fast.
2. Keep source management understandable.
3. Keep sharing social but lightweight.
4. Keep filters restrained.
5. Keep the interface tactile and receiver-like.
6. Keep signed-in behavior persistent across browsers when possible.
7. Prefer clear user states over hidden magic.
8. Avoid adding features that turn the app into a generic collection manager.

## Primary Product Concepts

### Album

An album is the randomizer unit. It includes:

- `artist`
- `title`
- optional `year`
- optional `genre`
- optional `label`
- optional `format`
- optional `discogsId`
- optional `notes`
- optional `coverImageUrl`
- optional Discogs metadata such as `country` and `styles`

### Stash

A stash is a named album collection.

There are three user-facing stash areas:

- `Street Feed`
- `My Stash`
- `Friends Stash`

### Street Feed

Street Feed is the public discovery area. It shows the latest public CSV stashes, capped to the latest 10. Users can load one into the randomizer without signing in.

### My Stash

My Stash is the signed-in user's private collection shelf. It contains:

- private CSV uploads
- replaced CSV sources
- Discogs imports
- shared or private visibility state
- edit, load, delete, share, and replace actions

When a My Stash card is loaded, other My Stash cards hide until the user clears the active stash.

### Friends Stash

Friends Stash is the signed-in user's accepted shared-collection shelf.

A friend stash appears only after:

1. another member shares a stash
2. that member sends it through Messages or the recipient opens a direct shared link
3. the recipient accepts or gains access

Accepted friend stashes persist until the recipient deletes access.

When a Friends Stash card is loaded, other friend stash cards hide until the user clears the active stash.

### Matching Albums

Matching Albums is the first social-listening feature.

For each friend stash, the user can choose:

- full friend collection
- matching albums only

Matching albums compare a friend's shared stash against one of the user's own My Stash sources.

The matching key is:

- `discogsId` when available
- otherwise normalized `artist + title`

### Source

Source is where a user creates or updates collections.

The current source types are:

- CSV upload
- Discogs connection and import

Source is not the same thing as loading music. Source manages collection data. Stashes load collection data into the randomizer.

### Messages

Messages is the internal member inbox.

Messages are used to transmit a shared stash from one member to another without requiring copy/paste. A recipient opens a message and accepts the stash before it appears in Friends Stash.

Only inbound messages appear in the inbox. Sent messages should not populate the sender's inbox list.

### Public Profile

Each user has member identity fields:

- public profile name
- display name
- handle
- email

Sharing surfaces should prefer public-facing profile fields and handles, not email.

## Current User Workflows

### Signed-Out Visitor

1. User lands on the main page.
2. User can view and load Street Feed stashes.
3. User can press `Random` after a stash is loaded.
4. User can view album art, metadata, and pop-up facts.
5. Signed-in-only actions show sign-in prompts.

Signed-out users cannot:

- create private stashes
- import Discogs
- access Friends Stash
- send or receive Messages
- edit profile

### Magic-Link Sign In

1. User enters email.
2. App sends a Resend magic link through Auth.js.
3. User opens the email.
4. App signs the user in through Auth.js database sessions.
5. App shows the welcome/success experience for magic-link sign-in.

Implementation rules:

- Use Auth.js with the Drizzle adapter.
- Use database sessions.
- Use Resend as the email provider.
- `AUTH_SECRET` must be set in production.
- Never silently use the development fallback secret in production.
- `AUTH_URL` must match the active environment.

### CSV Upload

1. User opens `Source`.
2. User chooses `CSV`.
3. User enters a required stash name.
4. User selects a CSV file.
5. App previews valid albums and skipped rows.
6. User chooses destination:
   - Private for signed-in My Stash
   - Public for Street Feed
7. User uploads.

Required CSV columns:

- `Artist`
- `Title`

Optional CSV columns:

- `Year`
- `Genre`
- `Label`
- `Format`
- `Discogs ID`
- `Notes`

CSV validation rules:

- reject files larger than 5 MB
- accept common CSV MIME types
- allow `.csv` and `.txt` filename fallbacks for unreliable MIME values
- require at least one valid album row
- require `Artist` and `Title`

### CSV Replace

1. User opens My Stash.
2. User opens the stash settings modal.
3. User selects Replace CSV.
4. Source shows the replacement banner:

```text
Replacing existing CSV stash
The stash identity, sharing, and friend links stay the same. The album list will be replaced.
```

5. User uploads a new CSV.
6. App replaces the album list while preserving:
   - source id
   - stash identity
   - share state
   - friend links

Only CSV stashes can be replaced this way. Discogs stashes are refreshed from Discogs.

### Discogs Connection

Discogs has two connection modes:

- OAuth
- Personal Token

OAuth is the primary path. Personal Token is the fallback path.

User-facing copy should present:

- `Connect with Discogs` for OAuth
- `Connect with Personal Token` as the fallback
- `Connected to Discogs as {username}`
- `Connection method: OAuth` or `Connection method: Personal Token`
- `Disconnect Discogs` for removing the connection

#### Discogs OAuth Flow

1. User opens `Source > Discogs`.
2. User selects `Connect with Discogs`.
3. App starts OAuth at `/api/discogs/oauth/start`.
4. App requests a Discogs request token.
5. App stores the pending request token and secret in an httpOnly cookie.
6. User authorizes the app on Discogs.
7. Discogs returns to `/api/discogs/oauth/callback`.
8. App validates:
   - signed-in session
   - request token
   - verifier
   - pending cookie state
9. App exchanges the verifier for an access token and secret.
10. App fetches Discogs identity.
11. App stores or updates one `discogs_connections` row for the user.
12. App redirects to `/?discogs=oauth-connected`.
13. The client auto-imports the Discogs collection and loads the Discogs stash into the randomizer once.
14. The client clears the temporary `discogs` URL param so refresh does not repeat the auto-import.

Important implementation detail:

- The OAuth start link must disable SvelteKit hover preloading with `data-sveltekit-preload-data="off"` and use `data-sveltekit-reload`.
- Otherwise `/api/discogs/oauth/start` may run before the real click and create a mismatched pending cookie.

#### Discogs Personal Token Flow

1. User selects `Connect with Personal Token`.
2. User pastes a Discogs personal token.
3. App verifies identity through Discogs.
4. App stores the connection with `authMode = 'personal_token'`.
5. User can import or refresh Discogs manually.

#### Discogs Import And Refresh

Discogs import:

- reads the user's Discogs collection folder `0`
- paginates at 100 releases per page
- maps release title, artist, year, genre, style, label, format, Discogs release id, notes, and cover image
- creates or updates one private source with `kind = 'discogs'`
- names it `Discogs • {username}`
- keeps one Discogs source per user

After first OAuth connect, import and load are automatic. After that, the user manually refreshes from Source.

### Loading A Stash

The active loaded deck can come from:

- Street Feed
- My Stash
- Friends Stash full collection
- Friends Stash matching albums

Loading a stash should visibly replace the previous active deck. When a private or friend stash is loaded, the shelf should hide other cards until the user clears the loaded stash.

### Randomizing

1. User loads a stash.
2. User presses `Random`.
3. App picks one album from the filtered active collection.
4. App avoids immediate repeat when possible.
5. App updates recent history.
6. App loads cover art and metadata.
7. App displays album title, artist, art, year, and facts.

Randomizer state:

- `remainingIds`
- `lastPickedId`
- `recentHistory`

Recent history keeps the current pick plus recent picks internally, while the Recent Picks panel displays previous picks.

### Filters

Filters should stay restrained.

Current user-facing filters:

- Genre
- Decade

The data model can compute label and format options, but the product should not expose Label, Format, Style, or trivia-heavy filters until there is a strong reason.

Filter design rules:

- keep the hardware receiver dial feel
- avoid generic form UI
- show selectors only after a stash is loaded
- fade or disable dials when no stash is loaded
- preserve mobile fit

### Album Art

Artwork lookup order:

1. Use existing `coverImageUrl` when present.
2. For Discogs-backed albums, fetch Discogs release details and image gallery.
3. Use MusicBrainz and Cover Art Archive.
4. Fall back to iTunes search.
5. Use the vinyl loader fallback when no artwork is available.

Album art display rules:

- foreground cover art should stay readable
- blurred art backdrop can provide atmosphere
- mobile art sizing must be tuned separately for phone and tablet widths
- art gallery controls appear when more than one image exists

### Pop-Up Facts

Pop-up facts appear in the album slot when the user toggles the album-stage year.

Source behavior:

- Wikipedia is primary.
- TheAudioDB is fallback.

Fact behavior:

- show album summary when available
- show artist summary when available
- truncate long text
- show a `Continue...` source link when text is truncated or would overflow on mobile
- open source links in a new browser window/tab

### Sharing A Stash

Sharing starts from My Stash settings.

1. User marks a stash as shared.
2. App can generate or send access to the stash.
3. User can send a stash through Messages.
4. Recipient accepts the stash.
5. Accepted stash appears in Friends Stash.

Do not automatically add a sent stash to the recipient's Friends Stash before acceptance.

### Messages

Messages are the primary internal transmission mechanism for shared stashes.

Inbox behavior:

- show inbound messages only
- unread messages get a stronger visual state
- messages are condensed by default
- opening a message reveals the shared stash action
- `Accept Stash` grants access and marks the message read
- accepted stash appears in Friends Stash in a ready-to-load state
- accepting a stash should not automatically load it

Compose behavior:

- user searches by handle, public profile name, or display name
- returned member search results should not expose email in the response shape
- sender chooses a shared stash
- no shared stash should be selected by default for a new compose message
- send button text is `Share Stash`

Rate limit:

- 8 messages per sender per 10 minutes
- uses `rate_limit_log`
- returns `429` on rate-limit hit

Retention:

- messages older than 30 days are removed by Phase 5 cleanup

### Shared Links

Direct shared source links use:

```text
/?sharedSource={sourceId}
```

The older `/shared/{id}` page exists as a branded shared page/error experience, but the preferred raw-link behavior is:

1. user opens main page with shared source URL
2. app ensures access when signed in
3. app can load the shared stash or let user compare/load it from Friends Stash
4. shared link arrival cue appears only for direct shared links

### Profile

Signed-in users can edit:

- public profile name
- display name
- handle

These fields support member search and owner display for shared stashes.

### About

The footer contains an About icon that opens the About Shakedown Spins modal.

The About modal should stay concise and product-level. It can include:

- product description
- third-party source note
- copyright/licensing note
- contact link to `https://joekirchner.com/#contact`

## Visual And Interaction Direction

The interface should feel like a 1970s hi-fi receiver and listening-room object.

Core surfaces:

- brushed metal header
- warm wood paneling
- smoked glass display area
- tactile buttons and dials
- red action emphasis
- restrained green receiver glow
- vinyl loading animation

Typography:

- `Oswald` for hardware headings
- `Bitter` for analog/editorial supporting copy
- `Satoshi` for album title, artist, buttons, and newer UI controls

Main layout:

- header receiver fascia
- main player panel
- album display and readout
- random button and Recent Picks
- bottom utility strip with Filters, Stashes, Source
- bottom footer with Messages, profile/sign-out, About

Mobile priorities:

- keep Random docked at the bottom
- keep album art visible without overwhelming the screen
- keep stash cards expandable enough to show all actions
- keep footer controls centered
- make utility icon buttons small and circular
- avoid text wrapping inside tab buttons by switching to icons when needed

## Technical Stack

Runtime:

- SvelteKit 2
- Svelte 5 runes
- TypeScript
- Vite
- Vercel adapter

Database:

- Neon Postgres
- Drizzle ORM
- Auth.js Drizzle adapter

Authentication:

- Auth.js
- Resend magic links
- database sessions

Testing:

- `npm run check`
- Playwright e2e tests

External APIs:

- Resend
- Discogs OAuth/API
- Wikipedia
- TheAudioDB
- MusicBrainz
- Cover Art Archive
- iTunes Search

## Repository Map

Important files:

- `src/routes/+page.svelte`: main app orchestration and page state
- `src/routes/+page.server.ts`: initial page data load
- `src/auth.ts`: Auth.js and Resend magic-link config
- `src/lib/types.ts`: shared product/data types
- `src/lib/server/db/schema.ts`: Drizzle schema
- `src/lib/server/sources.ts`: My Stash, shared stash, overlap logic
- `src/lib/server/messages.ts`: member inbox, search, send, accept, read logic
- `src/lib/server/discogs.ts`: Discogs connection, import, release details
- `src/lib/server/discogs-oauth.ts`: Discogs OAuth 1.0a helper layer
- `src/lib/server/album-context.ts`: Wikipedia/TheAudioDB fact lookup
- `src/routes/api/artwork/+server.ts`: MusicBrainz/Cover Art Archive artwork lookup
- `src/lib/csv.ts`: CSV parser and preview logic
- `src/lib/filters.ts`: filter option and filtering logic
- `src/lib/randomizer.ts`: non-repeating randomizer state
- `src/lib/components/AlbumStage.svelte`: album art/facts/readout
- `src/lib/components/FiltersPanel.svelte`: filter dials
- `src/lib/components/MyStashSection.svelte`: My Stash shelf
- `src/lib/components/FriendsStashSection.svelte`: Friends Stash shelf
- `src/lib/components/SourcePanel.svelte`: CSV and Discogs source controls
- `src/lib/components/MessagesModal.svelte`: inbox and compose modal
- `src/lib/components/RecentPicksPanel.svelte`: Recent Picks panel

## Data Model

### Auth Tables

- `users`
- `accounts`
- `sessions`
- `verification_tokens`

Auth uses database sessions. Users are keyed by UUID and email.

### Discogs Tables

`discogs_connections` stores one active Discogs connection per user.

Important columns:

- `user_id`
- `auth_mode`: `personal_token` or `oauth`
- `username`
- `oauth_token`
- `oauth_token_secret`
- `discogs_user_id`

Despite the historical column names, `oauth_token` stores the active Discogs credential token for either auth mode.

### Source Tables

`sources` stores a user's named collections.

Important columns:

- `user_id`
- `kind`: `csv` or `discogs`
- `name`
- `visibility`: `private` or `shared`
- `sync_status`: `ready`, `syncing`, or `error`
- `last_synced_at`
- `album_count`

`source_albums` stores albums for each source.

Important columns:

- `source_id`
- `row_order`
- `artist`
- `title`
- `year`
- `genre`
- `label`
- `format`
- `discogs_id`
- `notes`
- `cover_image_url`

### Sharing Tables

`shared_source_access` grants a recipient access to a shared source.

Important columns:

- `source_id`
- `recipient_user_id`

The unique constraint prevents duplicate access rows for the same recipient/source pair.

### Messaging Tables

`member_messages` stores internal shared-stash messages.

Important columns:

- `sender_user_id`
- `recipient_user_id`
- `shared_source_id`
- `body`
- `read_at`
- `created_at`

Only recipient messages appear in the inbox.

### Preference Tables

`user_ui_preferences` stores signed-in UI preferences.

Current preference categories:

- welcome modal dismissal
- friend load modes
- friend shelf compare source selections

## Environment Variables

Required for a complete local or production setup:

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@YOUR-POOLED-HOST/neondb?sslmode=require&channel_binding=require
DATABASE_URL_UNPOOLED=postgresql://USERNAME:PASSWORD@YOUR-DIRECT-HOST/neondb?sslmode=require&channel_binding=require

AUTH_SECRET=replace-with-a-long-random-secret
AUTH_TRUST_HOST=true
AUTH_URL=http://localhost:5173

RESEND_API_KEY=re_xxxxxxxxx
AUTH_EMAIL_FROM="Shakedown Spins <auth@yourdomain.com>"

DISCOGS_CONSUMER_KEY=your-discogs-consumer-key
DISCOGS_CONSUMER_SECRET=your-discogs-consumer-secret

PHASE5_CLEANUP_TOKEN=replace-with-a-long-random-token
CRON_SECRET=replace-with-a-long-random-token
```

Environment rules:

- `DATABASE_URL` should be the pooled Neon URL for app runtime.
- `DATABASE_URL_UNPOOLED` should be the direct Neon URL for migrations.
- `AUTH_URL` must match the current environment.
- `AUTH_SECRET` must be present in production.
- `AUTH_EMAIL_FROM` must use a Resend-verified sender domain.
- `DISCOGS_CONSUMER_KEY` and `DISCOGS_CONSUMER_SECRET` must be present for OAuth to appear.
- Vercel must be redeployed after adding or changing env vars.

Discogs callback URLs:

```text
Local:
http://localhost:5173/api/discogs/oauth/callback

Production:
https://shakedownspins.joekirchner.com/api/discogs/oauth/callback
```

If Discogs only supports one callback per application, create separate Discogs applications for local and production.

## SQL Migrations

Apply migrations in this order:

```text
sql/001_phase1.sql
sql/002_phase2a_auth_and_sources.sql
sql/003_phase2b_discogs_connections.sql
sql/004_phase2d_owner_profiles.sql
sql/005_phase2e_shared_source_access.sql
sql/006_phase2f_member_messages.sql
sql/007_phase5_cleanup_and_retention.sql
sql/008_phase5_ui_preferences_and_cleanup_endpoint.sql
sql/009_phase5_discogs_source_uniqueness.sql
sql/010_phase6_discogs_auth_modes.sql
sql/011_phase6_public_profile_constraints.sql
```

Important migration outcomes:

- Auth tables exist.
- Source and source album tables exist.
- User profile fields exist.
- Shared source access exists.
- Member messages exist.
- Cleanup functions exist.
- UI preferences exist.
- One Discogs source per user is enforced.
- Discogs auth mode is explicit.

## API Surface

Primary app routes:

- `/`: main app
- `/signin`: auth action page
- `/signout`: sign-out action page
- `/verify-request`: magic-link email sent page
- `/shared/[id]`: branded shared collection page
- `/__e2e/messages`: test fixture route guarded to dev/test

Primary API routes:

- `POST /api/stashes`: create public Street Feed stash
- `GET /api/stashes/[id]`: load public stash
- `GET /api/sources`: list user's private sources
- `POST /api/sources`: create private source
- `GET /api/sources/[id]`: load private source
- `PATCH /api/sources/[id]`: rename, visibility, or replace source
- `DELETE /api/sources/[id]`: delete source
- `POST /api/discogs/token`: connect personal token
- `DELETE /api/discogs/token`: disconnect Discogs
- `GET /api/discogs/oauth/start`: start Discogs OAuth
- `GET /api/discogs/oauth/callback`: complete Discogs OAuth
- `POST /api/discogs/import`: import or refresh Discogs collection
- `GET /api/discogs/release`: fetch Discogs release details
- `GET /api/artwork`: fetch MusicBrainz/Cover Art Archive images
- `GET /api/album-context`: fetch Wikipedia/TheAudioDB facts
- `GET /api/members`: search members
- `GET /api/messages`: list messages
- `POST /api/messages`: send shared stash message
- `PATCH /api/messages/[id]`: read or accept message
- `GET /api/friends-stash/[id]`: load friend stash or matching overlap
- `DELETE /api/friends-stash/[id]`: remove friend stash access
- `PATCH /api/profile`: update profile
- `PATCH /api/preferences`: update UI preferences
- `GET|POST /api/admin/phase5-cleanup`: run protected cleanup

## Setup Directions For An Agent

Follow these steps to set up the app from a fresh checkout.

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` from `.env.example`.

Set:

- Neon pooled URL
- Neon unpooled URL
- Auth secret
- Auth URL
- Resend key
- verified sender
- Discogs app credentials
- cleanup token values

For local development:

```env
AUTH_URL=http://localhost:5173
```

For production:

```env
AUTH_URL=https://shakedownspins.joekirchner.com
```

### 3. Apply Database Migrations

Apply every SQL migration in order against the target Neon branch.

After applying, verify the main tables:

```sql
select to_regclass('public.users');
select to_regclass('public.sources');
select to_regclass('public.source_albums');
select to_regclass('public.discogs_connections');
select to_regclass('public.shared_source_access');
select to_regclass('public.member_messages');
select to_regclass('public.user_ui_preferences');
```

### 4. Configure Resend

1. Verify the sender domain in Resend.
2. Set `RESEND_API_KEY`.
3. Set `AUTH_EMAIL_FROM`.
4. Test a magic link locally or in production.

### 5. Configure Discogs

1. Create a Discogs application.
2. Add callback URL for the target environment.
3. Add `DISCOGS_CONSUMER_KEY`.
4. Add `DISCOGS_CONSUMER_SECRET`.
5. Restart local dev server or redeploy production.
6. Confirm `Connect with Discogs` appears in Source > Discogs.

### 6. Start Local Development

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

### 7. Run Checks

```bash
npm run check
npm run test:e2e
```

At minimum, run `npm run check` after code changes.

### 8. Deploy

1. Push to GitHub.
2. Import or redeploy on Vercel.
3. Set all environment variables in Vercel.
4. Confirm `vercel.json` cron is active.
5. Confirm production auth, Discogs OAuth, and database connectivity.

## Verification Checklist

Use this checklist before calling a setup complete.

### Auth

- Magic link sends.
- Email button opens app.
- User is signed in.
- Sign out works.
- Missing production `AUTH_SECRET` fails loudly.

### Street Feed

- Public CSV upload works.
- Street Feed shows latest public stashes.
- Loading Street Feed enables Random.

### My Stash

- Private CSV upload works.
- Load works.
- Clear works.
- Edit settings modal opens.
- Rename works.
- Make shared/private works.
- Delete confirmation works.
- Replace CSV works and preserves source identity.

### Discogs

- OAuth button appears when env vars are set.
- OAuth returns to `/?discogs=oauth-connected`.
- First OAuth connect auto-imports and auto-loads.
- Refresh works manually after the first import.
- Personal Token fallback works.
- Disconnect Discogs works.

### Friends Stash

- Message can be sent to another member.
- Recipient sees inbound message only.
- Recipient accepts stash.
- Accepted stash appears in Friends Stash.
- Full mode loads full collection.
- Matching mode loads overlap collection.
- Compare source persists per friend stash.
- Delete friend stash removes recipient access.

### Randomizer

- Random button is disabled until a stash is loaded.
- Random picks albums without immediate repeat when possible.
- Recent Picks updates.
- Filters affect the random pool.
- Clearing active stash returns shelf cards.

### Album Display

- Cover art loads.
- Multiple artwork images show gallery controls.
- Vinyl fallback appears when art is missing.
- Year toggle switches between art and facts.
- Continue links open source pages.

### Mobile

- Random button docks at bottom.
- Album art remains visible.
- Facts text fits and shows Continue when needed.
- My Stash cards show all content.
- Friends Stash cards show compare controls.
- Footer controls are centered.
- About icon stays small and round.

## Phase 5 Cleanup

Phase 5 cleanup removes operational data that should not grow forever.

Cleanup targets:

- expired sessions
- expired verification tokens
- rate-limit log entries older than 24 hours
- member messages older than 30 days

Manual SQL:

```sql
select * from preview_phase5_cleanup();
select * from run_phase5_cleanup();
```

Protected endpoint:

```text
GET /api/admin/phase5-cleanup
POST /api/admin/phase5-cleanup
```

Authorization:

- `PHASE5_CLEANUP_TOKEN`
- or Vercel `CRON_SECRET`

Vercel cron:

```json
{
  "crons": [
    {
      "path": "/api/admin/phase5-cleanup",
      "schedule": "0 6 * * *"
    }
  ]
}
```

## Security And Privacy Rules

Authentication:

- use magic links
- use database sessions
- require production `AUTH_SECRET`
- do not add password auth unless product need becomes clear

Member privacy:

- member search should match public-facing profile fields only
- member search responses should not expose email
- public/shared UI should show handles and profile names

Messages:

- rate limit sending
- show inbound messages only
- clear old messages through cleanup

Discogs:

- store one connection per user
- store one Discogs source per user
- support OAuth and Personal Token as auth modes
- do not show OAuth controls unless env vars exist

Uploads:

- enforce file size
- enforce file type or extension
- validate required headers and rows

Shared links:

- shared source URLs should be treated as access-bearing links
- owner identity shown should be intentional public profile data

## Product Boundaries

Do not expand filters beyond Genre and Decade without a clear product reason.

Do not turn Messages into a full social network.

Do not make Discogs auto-refresh in the background unless the product explicitly needs always-fresh collections.

Do not replace magic links with password accounts unless real users need it.

Do not make the UI look like a generic dashboard.

Do not expose every metadata field just because it exists.

## Known Current Decisions

- Magic links are the primary auth method.
- Discogs OAuth is primary; Personal Token is fallback.
- First OAuth connect auto-imports and auto-loads once.
- Later Discogs updates are manual.
- Wikipedia is primary for pop-up facts; TheAudioDB is fallback.
- Street Feed is capped to the latest 10 public stashes.
- Friends Stash access persists until recipient deletes it.
- Message retention is 30 days.
- UI preferences are partly server-side for signed-in users.

## Good Future Improvements

The next improvements should be chosen carefully.

High-value next work:

- finish live browser QA on mobile breakpoints
- reduce `src/routes/+page.svelte` responsibility further
- extract shared button/card/status style primitives
- add a simple Report a Bug link to the About modal
- polish Discogs connected actions such as `Refresh Discogs`
- add admin stats for user counts and product health
- improve CSV parsing with a proven parser if messy CSVs become common
- add more focused Playwright coverage for auth-adjacent and sharing flows

Lower-priority work:

- password account creation
- extra filters
- automatic Discogs background refresh
- complex social feeds
- expanded metadata browsing

## Agent Implementation Notes

When working on this app:

- read existing components before editing
- preserve Svelte 5 runes style
- use existing server helpers
- use `apply_patch` for manual edits
- run `npm run check` before finishing
- avoid broad refactors unless requested
- do not reset user changes
- keep UI copy short and product-specific
- keep mobile behavior in mind for every visual change

When working on Discogs:

- keep OAuth and Personal Token unified under one connection model
- do not create multiple Discogs connections per user
- do not create multiple Discogs sources per user
- keep callback URLs aligned with `AUTH_URL`
- disable SvelteKit preloading on OAuth start links

When working on sharing:

- access is durable through `shared_source_access`
- accepting a message grants access
- deleting a friend stash removes recipient access
- sharing a stash should not automatically force-load it for the recipient

When working on randomizer behavior:

- loading a new deck replaces the active deck
- clearing a deck restores the shelf
- filters apply only to the active loaded collection
- recent picks should stay compact

## Demo Path

Use this path to demonstrate the full product:

1. Open the main app.
2. Load a Street Feed stash.
3. Press Random.
4. Toggle facts from the year button.
5. Sign in with magic link.
6. Upload a CSV to My Stash.
7. Load the new stash.
8. Replace the CSV from Edit Stash.
9. Connect Discogs.
10. Confirm Discogs auto-imports and loads after OAuth.
11. Refresh Discogs manually.
12. Mark a stash shared.
13. Send it to another member through Messages.
14. Sign in as recipient.
15. Accept the stash.
16. Load the friend stash full collection.
17. Toggle matching albums.
18. Load matching collection.
19. Clear active stash.
20. Confirm the saved friend stash remains available.

## Troubleshooting

### OAuth Button Does Not Appear

Check:

- `DISCOGS_CONSUMER_KEY`
- `DISCOGS_CONSUMER_SECRET`
- server restart or Vercel redeploy
- user is on Source > Discogs and not already connected

### Discogs OAuth Returns To Error

Check:

- `AUTH_URL`
- Discogs app callback URL
- local vs production domain mismatch
- pending OAuth cookie state
- SvelteKit preload disabled on OAuth start link

### Magic Link Fails

Check:

- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_TRUST_HOST`
- `RESEND_API_KEY`
- `AUTH_EMAIL_FROM`
- Resend sender-domain verification

### Database Warning Appears

Check:

- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`
- Neon branch
- migrations applied to the same database the app uses

### Messages Do Not Work

Check:

- `sql/006_phase2f_member_messages.sql` applied
- sender and recipient are different users
- sender has a shared stash
- rate limit has not been hit

### Friend Stash Does Not Appear

Check:

- recipient accepted the message
- `shared_source_access` row exists
- source is still marked `shared`
- recipient did not delete access

## Definition Of Done

The application is set up correctly when:

- local app runs
- production deploy runs
- database migrations are applied
- magic-link auth works
- CSV upload and replace work
- Discogs OAuth works
- Discogs import/load works
- Street Feed loads
- My Stash loads
- Friends Stash loads
- Messages send and accept shared stashes
- Matching Albums works
- Randomizer works
- Filters work
- album art and facts work
- mobile layout is usable
- `npm run check` passes
