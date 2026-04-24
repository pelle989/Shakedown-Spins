# Grateful-Stash Phase 1/2/3 Plan

## Summary
Build Grateful-Stash as a standalone `SvelteKit + TypeScript` app on Vercel with Neon Postgres. Phase 1 ships a public, ephemeral top-10 stash experience: anonymous CSV uploads with user-supplied stash names, client-side row-count preview, tab-local stash loading, stash overview previews, album randomization, filters, album-art lookup, keyboard roll control, a shared vinyl-record loading indicator, and clipboard sharing. Phase 2 adds local accounts, private user-owned sources, shared album sources, multiple active stashes, long-overdue weighting, 3-attempt played/skip flow with optional Last.fm scrobbling, durable shareable URLs, and PWA support. Phase 3 adds skin import/export and customization polish.

Reuse behavioral ideas from `Randomizer` where useful, but do not port its DOM/controller implementation.

## Key Changes

### Phase 1: Public Top-10 Stash
- Build a fresh SvelteKit app with SSR on `/` and a small domain/service layer.
- Phase 1 has no stash permalinks and no durable public URLs beyond `/`.
- The upload flow requires two user inputs:
  - a stash name
  - a CSV file
- Stash names are not unique in Phase 1; multiple stashes may share the same name.
- Stash names must be trimmed, non-empty, and capped at `100` characters.
- The homepage server-renders the newest 10 stashes, newest first.
- If zero stashes exist, the homepage shows an intentional empty state:
  - explain that no public stashes have been uploaded yet
  - keep the upload panel visible as the primary action
  - keep the randomizer disabled until a stash is loaded
- Each stash feed card shows:
  - stash name
  - album count
  - relative upload time
  - top-5 stash overview albums
  - `Load Stash` action
- The stash overview is display-only. It helps visitors preview the collection without loading it.
- The top-5 overview albums are computed during `create_stash`, stored in `stashes.stash_preview_json`, and rendered from that stored summary data on the homepage feed.
- `stash_preview_json` is denormalized feed summary data only; full stash contents remain sourced from `stash_albums`.
- Phase 1 does not show a cross-visitor “latest pick” on stash cards.
- The UI should explain that stashes are ephemeral and only the newest 10 remain, so rotation is expected behavior rather than an error.
- Visitors can load one stash into an active tab-local session; the selected stash id is stored in `sessionStorage`.
- Session behavior is intentionally per-tab in Phase 1. Loading a stash in one tab does not update other tabs.
- Treat “no stash loaded” as an explicit UI state, not as a partially populated source.
- Represent active collection state with one shared explicit shape before component work begins. Default contract:

```ts
type ActiveCollectionState =
  | { status: "idle" }
  | { status: "loaded"; collection: AlbumCollection }
```

- On reload, restore the saved stash if it still exists; otherwise clear the saved id, show a clear “stash moved on” message explaining that only the newest 10 stashes survive, and keep the user on `/` with the current feed visible.
- Randomization is album-based only:
  - no preselected album on stash load
  - no repeats within a cycle
  - when a cycle resets, the first pick cannot equal the last pick of the prior cycle
  - `recentHistory` stores completed picks only and is capped at 5
- The “copy recent picks” action uses the same capped `recentHistory` list; there is no separate full-session history in Phase 1.
- When a stash is loaded, pressing `Space` triggers the next roll.
- The `Space` shortcut is disabled when no stash is loaded and suppressed while focus is inside an input, textarea, button, link, or other interactive control.
- The `Space` shortcut must call `event.preventDefault()` when it triggers a roll so the page does not scroll.
- Album art is fetched on demand in the browser from iTunes Search only when a revealed pick has no existing art.
- Phase 1 does not persist fetched art to the database. A short-lived per-tab cache keyed by normalized `artist + title` is allowed to avoid repeated lookups within the same session.
- Filters are included in Phase 1 and apply only to the currently loaded stash collection.
- Phase 1 filter dimensions are:
  - `genre` when present in CSV
  - `decade` when `year` is present
  - `label` when present
  - `format` when present
- Filter UI only shows a field when the loaded collection has at least 2 distinct populated values for that field.
- Sharing in Phase 1 is clipboard-only:
  - copy current pick text
  - copy current session’s recent pick list
- Open Graph metadata for `/` is generic site metadata:
  - `og:title`: `Grateful-Stash`
  - `og:description`: `Load a public stash, roll a random album, and keep the music moving.`
  - `og:image`: default site/share image based on the app logo mark, not stash-specific

### Phase 1: CSV Contract, Preview, Limits, and Backend Rules
- Accept one CSV upload per stash creation.
- CSV columns:
  - required: `Artist`, `Title`
  - optional: `Year`, `Genre`, `Label`, `Format`, `Discogs ID`, `Notes`
- Column matching is case-insensitive and trims surrounding whitespace.
- CSV mapping:
  - `Artist` -> `artist`
  - `Title` -> `title`
  - `Year` -> `year`
  - `Genre` -> `genre`
  - `Label` -> `label`
  - `Format` -> `format`
  - `Discogs ID` -> `discogsId`
  - `Notes` -> `notes`
- `Genre` may contain multiple values separated by commas and is normalized into `string[]`.
- `Year` accepts only a clean integer year. Valid values are four-digit integers; any non-integer or mixed-format value such as `1975/76` or `ca. 1968` is normalized to `null`.
- A row is valid only if trimmed `Artist` and `Title` are both present.
- Blank or invalid rows are ignored during parsing.
- A stash upload is rejected if zero valid rows remain after parsing.
- Before submission, the client parses the selected CSV locally and shows a preview summary such as `Found 143 valid albums, 4 rows skipped.`
- The upload submit action remains disabled until the client-side preview detects at least one valid row.
- The client-side preview and the server-side upload path must use the same shared parsing and normalization module so row counts, field mapping, and validation behavior stay consistent.
- Phase 1 limits:
  - rate limit: `3` successful stash creations per IP hash per rolling `1 hour`
  - file size cap: `5 MB`
  - album cap: `2,000` valid albums per stash
- Use Neon Postgres with:
  - `DATABASE_URL` for pooled reads
  - `DATABASE_URL_UNPOOLED` for transactional writes and DB function calls
- Use Neon branching as the development workflow:
  - one production branch for deployed production
  - one shared development branch for local development and all preview deployments
  - optional short-lived schema-risk branches only when needed, then merge back into development
- Do not create per-preview Neon branches; Vercel preview deployments share the development branch.
- Phase 1 uses the tables `stashes`, `stash_albums`, and `rate_limit_log`.
- The `stashes` table stores:
  - `id` as UUID primary key
  - `name`
  - `created_at`
  - `album_count`
  - `stash_preview_json`
- The `stash_albums` table stores:
  - `id`
  - `stash_id`
  - `row_order`
  - `artist`
  - `title`
  - `year`
  - `genre`
  - `label`
  - `format`
  - `discogs_id`
  - `notes`
- The `rate_limit_log` table stores:
  - `id`
  - `ip_hash`
  - `created_at`
- `stash_albums.id` is the primary key UUID and is the source for `Album.id` in Phase 1.
- `genre` is stored in Postgres as `text[]` to match the normalized `string[]` application shape.
- Phase 1 does not include `latest_pick_title`, `latest_pick_artist`, or `latest_picked_at` on `stashes`.
- Phase 1 does not store `cover_image_url` in `stash_albums`; fetched art remains client-only.
- Table rules:
  - `stash_albums.stash_id` must reference `stashes(id) ON DELETE CASCADE`
  - pruning an old stash deletes its albums through the FK cascade
- Add DB constraints for established invariants:
  - stash name must be trimmed and non-empty
  - stash name length must be `<= 100`
  - `album_count > 0`
  - `row_order >= 0`
  - `UNIQUE (stash_id, row_order)`
- `row_order` is assigned by the server from parsed CSV row order after invalid rows are removed. The client does not supply it.
- The route trims the stash name before calling `create_stash`. `create_stash` receives the trimmed value and writes that exact value to the database.
- On Vercel, the route extracts the client IP from the `x-forwarded-for` header, takes the first comma-separated value, trims whitespace, and hashes that normalized IP string. If the header is absent, it may fall back to another trusted platform header only if explicitly available in the deployment environment.
- Client IPs are hashed with SHA-256 before storage or comparison in rate limiting. If a server-side secret is introduced later, it should be applied consistently to the hash input; Phase 1 can ship with plain SHA-256 of the normalized IP string.
- The rolling window in `create_stash` is computed in SQL using entries newer than `now() - interval '1 hour'`.
- All stash creation must go through a single Postgres function: `create_stash`.
- `create_stash` is the only source of truth for:
  - inserting the stash
  - inserting albums
  - computing `album_count` from the inserted valid album rows
  - computing `stash_preview_json` from the inserted stash albums
  - pruning old rate-limit rows
  - evaluating allow/deny for rate limiting
  - writing the successful rate-limit row
  - pruning the oldest stash if count exceeds 10
- `create_stash` return contract on success:
  - the created stash summary row with `id`, `name`, `album_count`, `created_at`, and `stash_preview_json`
- `create_stash` return contract on rate-limit failure:
  - no stash row created
  - no album rows created
  - an explicit failure outcome the route can translate to HTTP `429`
- Any other DB error from `create_stash` propagates through the route as HTTP `500`.
- If the app role does not have direct table write access, define `create_stash` with `SECURITY DEFINER` and controlled ownership so the function can perform writes safely.
- Guard create/prune concurrency with a transaction-scoped Postgres advisory lock inside `create_stash`.
- The advisory lock intentionally serializes stash uploads globally in Phase 1. This is acceptable for a low-volume top-10 feed and should not be treated as a performance bug unless real traffic proves otherwise.
- The route layer only:
  - extracts and hashes the client IP
  - validates request shape and file size
  - trims the stash name
  - parses and normalizes CSV rows using the shared parser module
  - calls `create_stash`
  - translates DB outcomes into HTTP responses
- The upload UI must provide a pending state:
  - disable submit while the request is in flight
  - show a clear `Uploading stash...` state
  - prevent duplicate submissions
  - restore the form on failure
- After successful upload:
  - refresh the stash feed in-place without a full page reload
  - use SvelteKit invalidation or an equivalent store-backed refresh path
  - place the new stash at the top of the visible feed
  - visually highlight the new stash in the feed
  - do not auto-load the new stash
  - remove the oldest visible stash if needed to keep the feed at 10
  - show a confirmation message including `album_count`, for example: `Your stash was created with 147 albums.`

### Phase 1: Visual Design System and Loading Indicator
- Lock the Phase 1 visual direction before major component styling: weathered shack, dusty amber light, paper labels, patched analog gear.
- Express all design values as CSS custom properties at the app root; components consume tokens only and do not hardcode colors or font families.
- Use this initial token set:

```css
:root {
  --color-bg: #16100c;
  --color-surface: #4a3328;
  --color-accent: #c58b31;
  --color-paper: #d7c3a0;
  --color-muted: #7b6a52;
  --color-text: #f3e7d1;
  --color-text-muted: #c3b08d;
  --color-border: #6b4e3a;
  --color-danger: #b04a2f;

  --font-display: "Oswald", sans-serif;
  --font-body: "Bitter", serif;

  --radius-card: 14px;
  --radius-pill: 999px;
  --shadow-panel: 0 10px 30px rgba(0, 0, 0, 0.28);
  --shadow-paper: 0 4px 14px rgba(0, 0, 0, 0.18);

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
}
```

- Typography defaults:
  - `Oswald` for titles, labels, buttons, and source headers
  - `Bitter` for metadata, body text, helper text, and album details
- Use a spinning vinyl record as the universal loading indicator across the app.
- The loading indicator is a CSS-styled SVG record with visible grooves, center label, and spindle hole.
- The center label uses `--color-paper` and `--color-accent` from the shared token set.
- The indicator must scale cleanly from large panel states down to `24px` without losing legibility.
- Loading behavior:
  - ambient or idle loading states spin at approximately 33 1/3 RPM, about one rotation every 10 seconds
  - active loading states spin faster to signal urgency
  - `prefers-reduced-motion` must be respected by pausing or fading rather than spinning
- Phase 1 loading-indicator placements:
  - album-art slot while iTunes art is fetching
  - upload panel while stash submission is in flight
  - stash load transition while restoring from `sessionStorage` on reload
- UI composition for Phase 1:
  - top-level receiver/session area
  - active album card
  - recent history strip
  - stash feed/browser
  - stash upload panel
- Keep a single built-in default skin in Phase 1: `shack`.
- Optional secondary built-in skin selection can exist in Phase 2 for logged-in users, but arbitrary import/export is deferred to Phase 3.

### Public Types and Source Model
Use these source concepts consistently across phases:

```ts
type Top10AlbumSource = {
  kind: "top10"
  id: string
  label: string
}

type UserAlbumSource = {
  kind: "csv" | "discogs"
  id: string
  label: string
}

type SharedAlbumSource = {
  kind: "shared"
  id: string
  label: string
}

type StoreAlbumSource = {
  kind: "store"
  id: string
  label: string
}

type AlbumSource =
  | Top10AlbumSource
  | UserAlbumSource
  | SharedAlbumSource
  | StoreAlbumSource

type Album = {
  id: string
  title: string
  artist: string
  year?: number
  genre?: string[]
  label?: string
  format?: string
  discogsId?: string
  notes?: string
  catalogNumber?: string // Phase 2: Discogs/user collection data
  style?: string[] // Phase 2: Discogs style data
  coverImageUrl?: string
}

type AlbumCollection = {
  source: AlbumSource
  albums: Album[]
}
```

Defaults by phase:
- Phase 1 uses `Top10AlbumSource` only when a stash is loaded.
- `AlbumCollection` always means the full album set for the currently loaded source, not the filtered subset.
- `Album.source` is intentionally omitted; collection-level source is the source of truth in Phase 1 and Phase 2 unless future per-album provenance requires a separate field.
- `catalogNumber` and `style` are Phase 2 fields and are not populated from Phase 1 stash CSV uploads.

### Phase 2: Accounts, Expanded Playback Modes, Shareable URLs, and PWA
- Add local account creation with Auth.js using email/password authentication and Neon-backed sessions.
- Add private user-owned album sources:
  - CSV imports
  - Discogs-connected collections
- Add shared album sources as durable computed collections created from overlap between two or more users.
- Expand active collection handling to support multiple loaded stashes or sources at once.
- Users can keep more than one source loaded in a session and switch between them by name, such as `Full Stash` and `Christmas Stash`.
- Each loaded source maintains its own independent cycle state, filter state, and recent pick history.
- The active collection contract expands in Phase 2 from a single loaded collection to a keyed collection map with one designated active context.
- Introduce an optional long-overdue weighting mode in Phase 2.
- Long-overdue weighting increases the probability of albums that have not been selected recently.
- This mode requires persisted per-user pick history and does not change the default unbiased random mode.
- The weighting formula and overdue threshold are defined during Phase 2 implementation, after the persisted pick-history schema is finalized.
- Add an opt-in 3-attempt played/skip flow in Phase 2.
- The user may roll up to 3 candidates in one round before deciding.
- After the third candidate, or earlier if the user decides sooner, they choose one of these outcomes:
  - mark one pick as played
  - skip the round entirely
- The 3-attempt played/skip flow works with or without Last.fm and is not dependent on a Last.fm connection.
- Add optional Last.fm scrobbling in Phase 2 for users who connect a Last.fm account.
- When Last.fm is connected, a played pick from the 3-attempt flow can be submitted as a scrobble.
- The 3-attempt played/skip flow is an opt-in mode layered on top of the existing randomizer, not a replacement for single-roll use.
- Introduce the first true shareable URLs in Phase 2 only:
  - shared collection pages
  - store profile pages
  - approved-connection profile pages showing member-since date, album count, current source label, shared albums in common, and shared groups in common
- Do not add durable URLs for ephemeral Phase 1 stashes.
- Shareable Phase 2 pages must support:
  - stable OG metadata per page
  - explicit access control
  - clear distinction between unauthorized, missing, and removed resources
- Shared-source recompute timing is:
  - immediate after in-app approval/removal and CSV-backed source replacement or edit
  - daily cron after Discogs sync marks sources stale
- Keep user collections private; only shared/intersection outputs are visible where the product explicitly allows them.
- Phase 2 implementation must begin with a dedicated workflow/spec pass for connection requests, invite acceptance, approval, and overlap recomputation before coding starts; this is the most complex Phase 2 feature.
- Add PWA support in Phase 2:
  - installable manifest
  - service worker for offline app shell
  - app icons derived from the finalized logo mark
  - offline handling limited to shell and last-known client state; network-backed source refreshes and uploads remain unavailable offline
- PWA theming should use the active built-in skin tokens, but Phase 2 does not expose arbitrary skin import/export.

### Phase 3: Customization and Skin JSON Schema
- Move skin import/export entirely to Phase 3.
- Phase 3 includes:
  - skin JSON import/export
  - validation and preview flow
  - local/imported skin storage strategy
- Skin JSON uses a constrained schema so imported skins can only override approved visual tokens:

```json
{
  "name": "Shack",
  "author": "grateful-stash",
  "version": "1",
  "tokens": {
    "color-bg": "#16100C",
    "color-surface": "#4A3328",
    "color-accent": "#C58B31",
    "color-paper": "#D7C3A0",
    "color-muted": "#7B6A52",
    "color-text": "#F3E7D1",
    "color-text-muted": "#C3B08D",
    "color-border": "#6B4E3A",
    "color-danger": "#B04A2F",
    "font-display": "Oswald",
    "font-body": "Bitter",
    "radius-card": "14px",
    "radius-pill": "999px",
    "shadow-panel": "panel-md",
    "shadow-paper": "paper-sm"
  }
}
```

- Phase 3 validation rules:
  - valid JSON only
  - required `name` and `tokens`
  - unknown token keys rejected
  - spacing tokens are structural and are not overridable per skin; keys such as `space-1` through `space-6` must be rejected
  - colors restricted to `#rgb`, `#rrggbb`, `rgb()`, `rgba()`, `hsl()`, `hsla()`
  - fonts restricted to an explicit allowlist defined during Phase 3 implementation; validation cannot ship until that list exists
  - radius values restricted to safe length tokens such as `px`, `rem`, or `%`
  - shadows are not arbitrary CSS strings; they must be chosen from a fixed preset allowlist such as `none`, `panel-sm`, `panel-md`, `paper-sm`, `paper-md`
  - the preset-to-CSS mapping table for all allowed shadow presets must be defined before Phase 3 validation or import/export work begins
  - invalid imports fail without changing the active skin

## Test Plan

### Phase 1
- Valid CSV plus stash name creates a stash and places it in the top-10 feed.
- Stash names accept duplicates, reject blank values, and reject values over 100 characters.
- CSV parsing accepts case-insensitive required columns and maps optional columns correctly.
- Client-side pre-upload preview shows valid-row and skipped-row counts before submission.
- Submit stays disabled until the preview detects at least one valid row.
- Year parsing accepts only clean integer years and normalizes mixed-format values to `null`.
- Blank/invalid rows are skipped; uploads with zero valid rows fail cleanly.
- Invalid CSV, blank name, oversized file, and over-cap album count fail cleanly.
- Concurrent stash creation never leaves more than 10 visible stashes.
- Rate limiting is enforced at `3` successful stash creations per IP hash per rolling hour through the DB create path only.
- On Vercel, IP extraction uses the first value from `x-forwarded-for` before hashing.
- Loading a stash replaces the active collection and resets cycle/history.
- Session restore reloads an existing stash and gracefully clears a rotated one.
- Per-tab session behavior is stable: loading a stash in one tab does not update another tab.
- The zero-stash homepage shows the intentional empty state with upload-first guidance.
- SSR on `/` renders the feed without a hydration flash of the wrong randomizer state.
- Feed cards render stash name, album count, relative upload time, and the top-5 overview albums.
- The stash overview remains display-only and does not load the stash automatically.
- Randomizer never repeats within a cycle and respects the cycle-boundary rule.
- Pressing `Space` rolls the next album only when a stash is loaded and focus is not inside an interactive control.
- The vinyl record loading indicator appears in the art slot, upload pending state, and stash-restore transition.
- Ambient loading states animate at the slower record speed, active loading states animate faster, and reduced-motion mode disables spinning appropriately.
- Filters show only supported fields with 2+ distinct populated values, narrow the active pool correctly, and disable rolling when zero matches remain.
- iTunes art lookup only keeps the art slot loading; it does not block metadata reveal.
- Per-tab art caching prevents repeated lookups for the same normalized album within a session.
- Clipboard share actions reflect the capped completed-picks history only.
- Components consume root tokens only; no hardcoded palette/font values appear in component styles.
- Local/dev and preview environments can create/read stashes against the shared Neon development branch without touching production data.
- Empty-state behavior uses the chosen explicit active-collection shape consistently across store, hydration, and consuming components.
- Pruning the oldest stash deletes dependent `stash_albums` rows via cascade.
- `create_stash` returns the created stash summary on success, returns a distinct rate-limit failure outcome on rejection, and surfaces other DB failures as HTTP `500`.
- Loaded albums expose `Album.id` from the `stash_albums.id` UUID primary key.
- `genre` round-trips correctly between CSV normalization, Postgres `text[]`, and the TypeScript `string[]` shape.
- `stash_preview_json` is populated during stash creation and rendered correctly in the feed.
- Rate-limit pruning and counting operate correctly on `rate_limit_log.ip_hash` and `rate_limit_log.created_at`.
- Upload UI prevents duplicate submissions, shows a pending state, refreshes the feed in-place after success, highlights the new stash without auto-loading it, and displays the created album count in the confirmation message.
- The “stash moved on” message explains the top-10 rotation rule and directs the visitor back to the current feed.
- Client-side preview counts match the server-side accepted row count because both paths use the shared parser module.

### Phase 2
- User sign-up, login, logout, and session expiry work without password hash leakage.
- CSV and Discogs sources normalize into `UserAlbumSource` consistently, including `catalogNumber` and `style` when present.
- Users can keep multiple sources loaded and switch between them without losing each source’s independent cycle state, filter state, or recent history.
- Long-overdue weighting changes pick probability only when that mode is enabled and uses persisted per-user pick history.
- The default random mode remains unbiased when overdue weighting is off.
- The 3-attempt mode allows up to 3 candidate rolls, then records either a played selection or a skipped round.
- The 3-attempt mode works without a Last.fm connection.
- Played selections can be scrobbled to Last.fm when a Last.fm account is connected.
- Shared sources recompute immediately for in-app source/member changes and via cron for Discogs sync changes.
- Durable shareable pages render correct OG metadata and enforce access rules.
- Approved-connection profile pages expose only the allowed summary fields.
- Users never see another user’s raw private collection unless the product explicitly exposes a computed shared result.
- Store discovery and artist-match intersections behave as specified.
- PWA install prompt, manifest, icons, and offline shell behavior work on supported mobile browsers.

### Phase 3
- Skin import rejects malformed JSON, unknown tokens, spacing token overrides, invalid values, and oversized files without changing the active skin.
- Skin export round-trips the active customized skin correctly.
- Built-in and imported skins can both be selected safely.
- Imported skins cannot inject unsupported CSS values outside the approved token set.
- Font validation uses the finalized allowlist only.
- Shadow preset validation rejects any non-preset value.
- All allowed shadow presets resolve through the finalized preset-to-CSS mapping table.

## Assumptions and Defaults
- Phase 1 stashes are intentionally ephemeral and are not individually shareable by URL.
- Generic site OG metadata is sufficient for Phase 1 because `/` is the only public route that matters.
- Durable shareable URLs begin in Phase 2 when the app has stable user-owned and shared resources worth linking to.
- `Top10AlbumSource` is the Phase 1 loaded-source model replacing the earlier Phase 1 `"stash"` naming.
- Neon branching stays simple at first: production branch, one shared development branch, and only occasional short-lived schema branches when needed.
- The implementation should preserve conceptual behavior from `Randomizer` without porting its DOM/controller implementation.
- Phase 2 multi-source state requires an intentional state-model expansion and a dedicated component/store refactor pass; it should not be treated as a drop-in extension of the Phase 1 single-collection model.
- Phase 2 Last.fm integration requires its own auth and API configuration pass before implementation.
- Phase 3 font validation depends on a future explicit allowlist and should not be treated as implementation-ready until that list is defined.
- Phase 3 shadow validation depends on a complete preset-to-CSS mapping table and should not be treated as implementation-ready until that table is defined.
