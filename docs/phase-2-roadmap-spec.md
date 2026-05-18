# Shakedown Spins Phase 2 Roadmap / Spec

This document defines the recommended Phase 2 scope for Shakedown Spins.

It is meant to turn the current Phase 1 product into a more durable, richer collection experience without losing the core “load a stash, spin an album, keep the music moving” ritual.

## Why Phase 2 Exists

Phase 1 proves the core loop:
- upload a collection
- load a stash
- randomize albums
- filter the pool
- enjoy a focused listening experience

Phase 2 expands that loop from a public, ephemeral demo into a more durable personal product.

The main product shift is:
- from anonymous public stash uploads
- to connected, user-owned, richer sources

## Phase 2 Goals

1. Let users connect and keep their own sources, especially Discogs.
2. Preserve the current random-listening ritual instead of turning the app into a generic library manager.
3. Add richer album metadata and source fidelity.
4. Make collections more durable than the public top-10 feed.
5. Prepare the app for richer artwork flows and collector-oriented browsing.

## Product Principles

Phase 2 should:
- keep the receiver/listening-room visual system
- keep the album hero area as the center of the experience
- keep random discovery as the main action
- make source ownership and sync understandable
- avoid collapsing into a spreadsheet UI

Phase 2 should not:
- become a full Discogs clone
- become a general-purpose collection database app first
- overload the first screen with account and management complexity

## Recommended Phase 2 Scope

### In Scope

- User accounts or persistent user identity
- Private user-owned collections
- Discogs import / connection flow
- Multiple source types under one user
- Richer album metadata from trusted source records
- More durable saved collections
- A better source-management UI
- Preparatory support for multi-image album artwork

### Out of Scope

- Full marketplace or social network features
- Full collection editing and conflict resolution UI
- Arbitrary theme import/export
- Deep recommendation engine work
- Multi-user collaborative editing
- Complex permissions beyond basic ownership / sharing

## Phase 2 Feature Pillars

## 1. Accounts and Identity

### Goal
Give each user a durable place to keep collections and sources.

### Recommended Behavior
- A user can sign in and return to their saved collections.
- Public top-10 browsing can still exist, but it becomes just one source mode.
- Signed-in users can have private collections that do not rotate out.

### Why It Matters
This is the foundation for Discogs sync, private sources, and durable sharing.

## 2. Discogs Integration

### Goal
Allow a user to connect Discogs and import their collection as a first-class source.

### Recommended Behavior
- User connects Discogs.
- App imports collection metadata into user-owned source records.
- A source shows sync status and last updated time.
- The user can choose one Discogs collection/source to load into the randomizer.

### Phase 2 Expectation
Phase 2 should focus on importing and using Discogs data, not on mirroring every Discogs management action.

### Important Design Requirement
Discogs should feel like a source feeding Shakedown Spins, not like a separate product embedded awkwardly in it.

## 3. Source Management

### Goal
Replace the single public-stash mental model with a clearer source model.

### Recommended Source Types
- Public top-10 stash
- Uploaded CSV collection
- Connected Discogs collection

### Recommended Behavior
- A signed-in user can see a list of owned sources.
- Each source shows:
  - source type
  - collection name
  - album count
  - sync status when relevant
  - last updated date
- One source is loaded into the listening experience at a time.

### UI Direction
The existing lower utility modules should evolve into:
- source library
- source status
- source actions

without losing the receiver-inspired framing.

## 4. Durable Collections

### Goal
Move beyond ephemeral top-10-only storage for user-owned collections.

### Recommended Behavior
- Public anonymous stashes can remain ephemeral.
- User-owned sources should persist until deleted or replaced.
- Session restore should prefer the user’s last active durable source when available.

### Why It Matters
This gives the product continuity and makes returning users worthwhile.

## 5. Richer Metadata

### Goal
Improve album detail quality and future-proof the album display.

### Recommended Metadata Priorities
- year
- genre
- label
- format
- exact release identifiers
- normalized source ownership / provenance

### Future-Facing Addition
Prepare the model for a release-level image gallery:
- front cover
- back cover
- inner sleeve
- label

Phase 2 does not have to fully ship all of that imagery, but the data model should stop assuming a single cover image forever.

## 6. Sharing and URLs

### Goal
Make more durable sharing possible.

### Recommended Behavior
- Signed-in users can share a durable collection link.
- Public top-10 anonymous stashes can remain lighter-weight and temporary.

### Why It Matters
Phase 1 sharing is mostly transient and public-feed dependent. Phase 2 should make “this is my collection, send it to someone” a real product feature.

## Recommended Delivery Sequence

### Phase 2A: Foundation
- accounts / identity
- user-owned collection model
- updated source model
- durable storage for owned sources

### Phase 2B: Discogs
- Discogs connection flow
- import pipeline
- basic sync state
- source loading from Discogs-owned collections

### Phase 2C: Metadata and Display
- richer metadata mapping
- improved source browser
- groundwork for multi-image art
- stronger collection detail views

### Phase 2D: Durable Sharing
- user-owned collection links
- public/private visibility rules
- polished source management

## Data Model Direction

Phase 2 should stop centering everything around only `stashes`.

Recommended conceptual shift:

- `users`
- `sources`
- `source_albums`
- `public_stashes` or a public-publish layer when needed

Recommended source fields:
- `id`
- `user_id`
- `kind` (`csv`, `discogs`, `top10-public`)
- `name`
- `visibility`
- `sync_status`
- `last_synced_at`
- `album_count`
- `created_at`
- `updated_at`

Recommended album/source relationship needs:
- stable source-level album identity
- release/source IDs when available
- room for richer image references later

## UI / Design Impact

Phase 2 should extend the current design system, not replace it.

### Areas that will need design work
- sign-in / connect flow
- Discogs import and sync states
- source library / source browser
- active-source selection
- durable collection detail states
- possibly a richer album image carousel

### What should remain stable
- the receiver/listening-room aesthetic
- the album hero area
- the red `Random` action as the center ritual
- the sense that the app is an object, not a dashboard

## Risks

### Product Risks
- too much account/sync complexity could bury the listening ritual
- Discogs integration could become the product instead of supporting it

### Technical Risks
- source-model migration from Phase 1 tables
- release matching quality
- richer image sourcing and caching
- auth + ownership rules in SSR routes

### UX Risks
- source management could become cluttered
- private/public distinctions could become confusing
- too much metadata could weaken the clean album display

## Success Criteria

Phase 2 is successful if:
- a user can sign in
- a user can connect or import a durable source
- a user can load that source and use the current randomizer ritual
- the app still feels simple at the point of use
- the product feels more like a real home for a collection, not just a demo feed

## Open Questions

These are the highest-value questions to answer before implementation starts:

1. Do you want Phase 2 accounts immediately, or do you want a “connected source without full account product” interim step?
2. Should Discogs be the first and only connected source in early Phase 2, or do you want the source model designed for multiple integrations immediately?
3. Should public anonymous top-10 stashes remain a permanent product surface in Phase 2, or become a secondary/demo mode?
4. Do you want durable shareable collection URLs in the first Phase 2 milestone, or after Discogs import is stable?
5. Should private collections be the default for signed-in users, with sharing as an explicit opt-in?

## Recommendation

My recommended default answers are:

- yes, include accounts in Phase 2
- yes, make Discogs the first connected source
- keep public top-10 stashes, but as a lighter public layer
- delay durable sharing until after source import is stable
- make user-owned collections private by default

That gives the cleanest progression:

1. durable identity
2. durable sources
3. Discogs connection
4. richer metadata
5. shareable owned collections
