# Shakedown Spins

Shakedown Spins turns a music collection export into a fast random listening ritual. Instead of staring at a spreadsheet or scrolling endlessly through a library, you can load a stash, spin for the next album, and rediscover records through a focused, receiver-inspired interface.

It is a `SvelteKit + TypeScript` app for public top-10 stash uploads, stash loading, album randomization, and filters, wrapped in the current 1970s receiver-style UI.

## Phase 1 Includes

- Public stash uploads backed by Postgres
- Newest-10 stash feed on the homepage
- One-click stash loading and clearing
- Album randomization with recent-picks history
- Genre and decade filters
- Album-art lookup with spinning-vinyl fallback
- Mobile-friendly layout tuned for iPhone-sized screens

## Environment Variables

Copy [.env.example](/Users/joe/Documents/Grateful-Stash/.env.example) to `.env` and fill in:

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@YOUR-POOLED-HOST/neondb?sslmode=require&channel_binding=require
DATABASE_URL_UNPOOLED=postgresql://USERNAME:PASSWORD@YOUR-DIRECT-HOST/neondb?sslmode=require&channel_binding=require
```

Notes:
- `DATABASE_URL` should use your pooled Neon connection string.
- `DATABASE_URL_UNPOOLED` should use your direct/unpooled Neon connection string.

## Setup

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
2. Apply the Phase 1 SQL in [sql/001_phase1.sql](/Users/joe/Documents/Grateful-Stash/sql/001_phase1.sql) to your Postgres database.
3. Install dependencies with `npm install`.
4. Run the app with `npm run dev`.

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

The importer is forgiving about many real-world header variants, but `Artist` and `Title` are the core fields every upload needs.

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

Then open the local app, usually at [http://localhost:5173](http://localhost:5173), and test:

- upload a CSV
- load a stash
- randomize albums
- clear and reload a stash
- filter by genre or decade
- verify the newest-10 public stash feed updates as expected

## Deploy

Typical production setup for Phase 1:

1. Push the repo to GitHub.
2. Import the repo into Vercel as a `SvelteKit` project.
3. Set `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in Vercel environment variables.
4. Apply [sql/001_phase1.sql](/Users/joe/Documents/Grateful-Stash/sql/001_phase1.sql) to the target Neon database branch.
5. Deploy from `main`.

Deployment notes:
- Leave Vercel `Output Directory` blank for this SvelteKit app.
- The app expects the `create_stash` SQL function from the migration file.

## Notes

- The Phase 1 homepage SSRs the newest 10 stashes from Postgres.
- The public feed is intentionally capped at the newest 10 stashes, so older uploads rotate out.
- The old Apps Script version is kept under [legacy](/Users/joe/Documents/Grateful-Stash/legacy) for reference only; the active app lives under [src](/Users/joe/Documents/Grateful-Stash/src).
- The broader operating flow is documented in [docs/workflow.md](/Users/joe/Documents/Grateful-Stash/docs/workflow.md).

## Troubleshooting

- `DATABASE_URL_UNPOOLED is not configured`
  Usually means `.env` is missing `DATABASE_URL_UNPOOLED`, or the dev server needs a restart after env changes.
- The page loads but stash data is empty
  Usually means Neon is not connected, the SQL migration was not applied, or the Vercel/local env vars do not match the active database branch.
