# Grateful-Stash

Phase 1 of Grateful-Stash is a fresh `SvelteKit + TypeScript` app for public top-10 stash uploads, stash loading, album randomization, filters, and clipboard sharing.

## Setup

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
2. Apply the Phase 1 SQL in [sql/001_phase1.sql](/Users/joe/Documents/Grateful-Stash/sql/001_phase1.sql) to your Postgres database.
3. Install dependencies with `npm install`.
4. Run the app with `npm run dev`.

## Notes

- The Phase 1 homepage SSRs the newest 10 stashes from Postgres.
- The app expects the `create_stash` SQL function from the migration file.
- The old Apps Script files remain in the repo for reference only; the active app now lives under `src/`.
