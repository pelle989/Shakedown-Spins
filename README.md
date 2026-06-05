# Shakedown Spins

A record collection randomizer. Connect your Discogs account, paste a personal token, or import a CSV, then press Random and let the app decide.

Shakedown Spins is built for collectors who want a faster listening ritual: load a stash, filter by genre or decade when needed, share collections with friends, and randomize through your full collection or only the albums you both own.

## Features

- Random selection from Street Feed, My Stash, or Friends Stash.
- Recent pick history for quick listening context.
- Filter by genre and decade.
- Import from Discogs with OAuth or a personal access token.
- Upload CSV stashes and replace an existing CSV while preserving share links.
- Share stashes with other members through Messages.
- Accept friend stashes and compare matching albums.
- Load a friend's full shared collection or only the matching overlap albums.
- View inline album notes and fact snippets from Wikipedia, with TheAudioDB as an optional fallback.
- Load cover art from Discogs, with MusicBrainz / Cover Art Archive and iTunes fallbacks.

## Live Demo

Production: [shakedownspins.joekirchner.com](https://shakedownspins.joekirchner.com)

## Getting Started

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Configuration

The app runs without database-backed member features only in limited local/demo modes. For the full product, configure these environment variables:

```bash
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...
AUTH_SECRET=replace-with-a-long-random-secret
AUTH_TRUST_HOST=true
AUTH_URL=https://your-production-domain.example
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM="Shakedown Spins <hello@example.com>"
DISCOGS_CONSUMER_KEY=your-discogs-consumer-key
DISCOGS_CONSUMER_SECRET=your-discogs-consumer-secret
THEAUDIODB_API_KEY=your-theaudiodb-key
PHASE5_CLEANUP_TOKEN=replace-with-a-long-random-token
CRON_SECRET=replace-with-a-long-random-token
```

Notes:

- `AUTH_SECRET` is required outside development. Production will fail loudly if it is missing.
- `DISCOGS_CONSUMER_KEY` and `DISCOGS_CONSUMER_SECRET` enable Discogs OAuth.
- `THEAUDIODB_API_KEY` is optional. If omitted, album context falls back to Wikipedia-only behavior.
- `PHASE5_CLEANUP_TOKEN` or `CRON_SECRET` protects the cleanup endpoint.

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

The importer handles common Discogs export header variants. `Artist` and `Title` are the only required fields.

## Data Sources

Album notes and fact snippets may reference Wikipedia, TheAudioDB, and Discogs data. Cover art may come from Discogs, MusicBrainz / Cover Art Archive, and iTunes. All third-party content belongs to its respective owners.

## Privacy And Security

- Magic-link sign-in is handled through Auth.js and Resend.
- Discogs OAuth credentials and personal-token connections are stored server-side for signed-in users.
- Local browser storage is used only for UI preferences such as selected friend stash compare mode.
- Secrets and database URLs must be configured through environment variables, not committed to source.
- User uploads are parsed as CSV text and are not executed.

## Known Limitations

- Street Feed is intentionally capped to the latest public stashes.
- Friend stashes appear after the recipient accepts the shared stash message.
- Matching albums depend on normalized artist and title metadata.
- Discogs imports can still be affected by Discogs rate limits or upstream API availability.

## Development

Run checks:

```bash
npm run check
```

Run Playwright tests:

```bash
npm run test:e2e
```

## License

[MIT](LICENSE)
