# Shakedown Spins Workflow

This document captures the practical working flow for Phase 1 of Shakedown Spins.

It covers:
- the user-facing stash flow
- the local development flow
- the GitHub and Vercel publishing flow
- the database update flow

## User Workflow

The Phase 1 product flow is intentionally simple:

1. Open the homepage.
2. Upload a CSV and provide a collection name.
3. Create a public stash.
4. Load one stash into the current tab.
5. Press `Random` to reveal albums from that loaded stash.
6. Use filters like `Genre` or `Decade` to narrow the pool.
7. Clear the loaded stash when you want to return to the public feed.

Important product rules:
- only the newest 10 public stashes remain in the feed
- stash loading is tab-local
- no stash is preloaded by default
- the app should feel usable even when album art is missing

## Local Development Workflow

Use this whenever making changes to the app:

1. Work locally in [/Users/joe/Documents/Grateful-Stash](/Users/joe/Documents/Grateful-Stash).
2. Start the app with:

```bash
npm run dev
```

3. Test the affected flow in the browser.
4. Run:

```bash
npm run check
```

5. Repeat until the change is stable.

Good local checks for most UI/product changes:
- upload a sample CSV
- load a stash
- randomize at least a few albums
- verify empty and loaded states
- test on mobile layout when relevant

## GitHub Publishing Workflow

Once a local change is ready:

1. Review your working tree:

```bash
git status
```

2. Stage the intended files:

```bash
git add .
```

3. Commit with a clear message:

```bash
git commit -m "Describe the change"
```

4. Push to GitHub:

```bash
git push origin main
```

Guidelines:
- do not commit `.env`
- do not commit `node_modules`
- do not commit `.svelte-kit`
- do not commit `.vercel/output`

## Vercel Deployment Workflow

Vercel is the production deployment target.

Normal deployment flow:

1. Push changes to GitHub.
2. Vercel auto-deploys from `main`.
3. Verify the latest deployment in Vercel.
4. Check the live app for the affected behavior.

Important Vercel expectations:
- framework preset: `SvelteKit`
- build command: `npm run build`
- output directory: blank
- install command: `npm install`

If the deployed site looks stale:
- confirm the latest commit reached GitHub
- confirm Vercel deployed the latest commit
- confirm `.vercel/output` is not tracked in git

## Neon Database Workflow

Neon backs the public stash data.

Typical flow:

1. Keep your local `.env` pointed at the intended Neon branch.
2. Apply SQL changes from [sql/001_phase1.sql](/Users/joe/Documents/Grateful-Stash/sql/001_phase1.sql) when schema or DB-function behavior changes.
3. Verify that both env vars are present:
   - `DATABASE_URL`
   - `DATABASE_URL_UNPOOLED`

Connection expectations:
- `DATABASE_URL` uses the pooled Neon host
- `DATABASE_URL_UNPOOLED` uses the direct host

If local UI loads but data is missing:
- check `.env`
- restart the dev server
- confirm the SQL migration has been applied

## Content / CSV Workflow

When testing or preparing collections:

1. Prepare a CSV with at least:
   - `Artist`
   - `Title`
2. Optionally include:
   - `Year`
   - `Genre`
   - `Label`
   - `Format`
   - `Discogs ID`
   - `Notes`
3. Upload the CSV.
4. Review the parsed row count preview.
5. Rename the collection before upload if needed.

The importer accepts many header aliases, but the most reliable baseline remains:

```csv
Artist,Title,Year,Genre
```

## Release Workflow

Use this checklist before calling a change complete:

1. Local app works.
2. `npm run check` passes.
3. The affected flow has been tested manually.
4. GitHub has the intended commit.
5. Vercel has deployed the intended commit.
6. Production behavior matches local behavior.

## Phase 1 Boundaries

Phase 1 is complete when changes are mostly:
- bug fixes
- polish
- import reliability
- deployment stability

Phase 2 begins when work shifts into:
- Discogs integration
- richer release metadata
- multi-image artwork flows
- accounts or private collections
- expanded source models
