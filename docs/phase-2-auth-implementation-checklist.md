# Shakedown Spins Phase 2 Auth Implementation Checklist

This checklist breaks the auth recommendation into buildable steps.

## Step 1: Lock the Auth Decision

- confirm Auth.js as the provider
- confirm email magic link or OTP as the first sign-in method
- confirm Resend as the email provider
- confirm Discogs is not the primary auth provider

## Step 2: Add Dependencies

- add `@auth/sveltekit`
- add the `Drizzle Adapter`
- add the Resend package or chosen Resend transport dependency
- add Drizzle packages needed for Postgres/Neon integration

Decision note:
- use an existing Auth.js DB adapter
- use the Drizzle Adapter specifically
- do not build a custom adapter in Phase 2A unless we hit a real blocker

## Step 3: Define Environment Variables

Add the auth env vars needed for:
- Auth.js secret
- auth base URL / trusted origin handling
- Resend API key
- auth sender email / from address

Exact Phase 2A env vars:
- `AUTH_SECRET`
- `AUTH_TRUST_HOST`
- `AUTH_URL`
- `RESEND_API_KEY`
- `AUTH_EMAIL_FROM`

Document them in:
- `.env.example`
- `README.md`
- `docs/workflow.md` if needed

## Step 4: Create Auth Schema in Neon

Create the required auth tables:
- users
- accounts
- sessions
- verification tokens

Then add application-facing ownership fields:
- `sources.user_id`

Use the exact table contract defined in:
- [phase-2-auth-architecture.md](/Users/joe/Documents/Grateful-Stash/docs/phase-2-auth-architecture.md)

Do not rewrite Phase 1 public stash tables yet unless absolutely necessary.

Also create:
- `sources`
- `source_albums`

Keep the boundary clear:
- auth tables are adapter-owned
- source tables are app-owned

## Step 5: Wire Auth.js into SvelteKit

- add Auth.js server configuration
- wire `src/hooks.server.ts`
- add auth routes/endpoints
- expose current session to server-side layout data

## Step 6: Add Basic Auth UI

- add sign-in entrypoint
- add sign-out action
- add signed-in vs signed-out state handling
- keep the UI lightweight and compatible with the current design language

## Step 7: Protect User-Owned Source Flows

- keep public top-10 browsing available to signed-out users
- require auth for durable owned source creation
- require auth for future Discogs connection
- enforce ownership checks on source load/update/delete actions

## Step 8: Add Signed-In CSV Sources

- allow signed-in users to save durable CSV-backed sources
- keep anonymous public stash upload behavior separate if desired
- confirm session restore behavior works with durable owned sources

## Step 9: Add Email Delivery

- wire Resend for magic link or OTP delivery
- test local email flow
- test Vercel production email flow
- handle expired or reused links gracefully

## Step 10: Add QA Coverage

Manual checks:
- sign in
- sign out
- restore session
- signed-out public browsing
- signed-in owned source creation
- auth failure paths

## Step 11: Update Docs

Update:
- `README.md`
- `docs/workflow.md`
- `docs/phase-2-roadmap-spec.md`
- deployment/setup notes

## Step 12: Phase 2A Exit Criteria

Phase 2A auth is complete when:
- a user can sign in
- a user session survives refresh
- a signed-in user can create a durable owned source
- a signed-out user can still browse the public top-10 layer
- ownership checks are enforced server-side
