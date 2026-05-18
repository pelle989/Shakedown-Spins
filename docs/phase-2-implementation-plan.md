# Shakedown Spins Phase 2 Implementation Plan

This document turns the approved Phase 2 roadmap into a practical delivery plan.

Approved defaults:
- accounts are included from the start
- Discogs is the first connected source
- the public top-10 feed remains as a lighter public layer
- durable sharing comes after import is stable
- user-owned collections are private by default

Phase 2 should extend Phase 1, not replace it.

## Phase 2A: Identity and Source Foundation

### Goal
Add durable user identity and a source model that can support private collections and Discogs import.

### Deliverables
- authentication system selected and integrated
- user record model
- source record model
- source album record model
- source ownership and visibility rules
- app state updated to load from durable sources, not only public stashes

### User Outcome
- a user can sign in
- a user can have private sources
- a user can load one owned source into the listening flow

### Exit Criteria
- sign-in works in production
- a user-owned CSV source can be created and loaded
- Phase 1 public top-10 behavior still works

## Phase 2B: Discogs Import

### Goal
Let a signed-in user connect Discogs and import collection data into a durable source.

### Deliverables
- Discogs connection flow
- secure token handling
- Discogs import job or import flow
- source sync status model
- last-synced metadata
- UI for connected-source creation and loading

### User Outcome
- a user can connect Discogs
- a user can import their collection
- a user can load that imported source and randomize albums from it

### Exit Criteria
- Discogs import succeeds for real user collections
- imported sources behave like first-class sources in the app
- sync failures are understandable in the UI

## Phase 2C: Richer Metadata and Collection Experience

### Goal
Improve source fidelity and album detail quality without breaking the current listening ritual.

### Deliverables
- richer metadata normalization
- stronger source detail view
- improved album detail display
- groundwork for multi-image artwork support
- release/source identifiers stored in a future-friendly way

### User Outcome
- the loaded collection feels more like a real owned catalog
- album details are more trustworthy and more useful

### Exit Criteria
- richer metadata is stored and displayed consistently
- the album display still feels simple and centered on listening

## Phase 2D: Durable Sharing

### Goal
Make owned collections shareable without depending on the public top-10 feed.

### Deliverables
- durable shareable source URLs
- visibility rules for private vs shared collections
- route handling for owned/shared source pages
- UI for share state and shared collection access

### User Outcome
- a user can choose to share a durable collection link
- private-by-default ownership remains intact

### Exit Criteria
- owned collection sharing works
- private collections stay private unless explicitly shared

## Architecture Direction

Phase 2 should move from a stash-only model to a source-driven model.

Recommended conceptual entities:
- `users`
- `sources`
- `source_albums`
- `source_sync_runs`
- `public_stash_publications` or a similar public-layer entity if needed

Recommended product distinction:
- public stashes remain a public feed layer
- durable sources become the signed-in user’s real collection layer

## Recommended Order of Technical Decisions

1. Choose auth provider and session model
2. Define new schema and migration strategy
3. Define source model and ownership rules
4. Build signed-in CSV source creation
5. Add Discogs connection and import
6. Add richer metadata handling
7. Add durable sharing

## Migration Strategy

Phase 2 should avoid risky in-place rewrites of Phase 1 tables where possible.

Recommended approach:
- keep Phase 1 public stash behavior working
- add new Phase 2 source tables alongside existing Phase 1 tables
- migrate only the application flow that needs durable sources
- leave public top-10 behavior as a thinner public mode

This reduces the risk of breaking production Phase 1 behavior while building Phase 2.

## UI Strategy

Keep:
- the receiver/listening-room direction
- the album hero area
- the `Random` ritual

Evolve:
- `Source` into a real source-management surface
- `Loaded Stash` into a broader active-source concept
- filters so they work cleanly with owned sources and imported metadata

Add:
- auth screens or auth entrypoints
- Discogs connect/import states
- source library states
- sync status messaging
- shared/private status UI

## Success Markers

Phase 2 is on track when:
- users can sign in
- users can keep private durable sources
- Discogs import works for real collections
- the app still feels simple at point of use
- public stashes remain understandable as the lighter public layer
