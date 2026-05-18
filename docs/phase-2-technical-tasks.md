# Shakedown Spins Phase 2 Technical Tasks

This document breaks the approved Phase 2 direction into concrete technical work.

## Track 1: Authentication and User Identity

### Tasks
- choose auth provider and session approach
- add user session handling to SvelteKit
- create `users` table
- add auth callback / session route handling
- define signed-in vs signed-out app behavior
- add protected server helpers for user-owned routes

### Output
- a signed-in user context available to server and client flows

## Track 2: Source Model and Schema

### Tasks
- design `sources` table
- design `source_albums` table
- define `kind`, `visibility`, and ownership rules
- create migrations for new Phase 2 tables
- add indexes for source lookup and source album retrieval
- define source summary queries for UI use

### Output
- durable user-owned sources with first-class storage

## Track 3: Source Domain Layer

### Tasks
- create shared source types
- create source repository / service helpers
- refactor active collection loading to support:
  - public stash
  - owned CSV source
  - owned Discogs source
- define source summary DTOs for the UI
- update restore-session logic for durable owned sources

### Output
- the app loads collections from a source model rather than only stash records

## Track 4: Signed-In CSV Sources

### Tasks
- adapt Phase 1 CSV upload flow for signed-in owned collections
- keep shared parser and normalization logic
- write uploaded collections into Phase 2 source tables
- support naming and saving a user-owned source
- keep anonymous public stash creation available separately if desired

### Output
- signed-in users can create durable CSV-backed sources

## Track 5: Discogs Integration

### Tasks
- define Discogs connection flow
- store Discogs OAuth/token state securely
- fetch Discogs collection data
- map Discogs release data into normalized source/source_album rows
- persist source sync metadata
- support import retry / failure state
- support loading an imported Discogs source into the app

### Output
- real Discogs collections usable inside Shakedown Spins

## Track 6: Sync and Import Status

### Tasks
- create `source_sync_runs` or equivalent tracking table
- store sync status, started time, completed time, and error state
- expose sync summaries to the UI
- design server actions or jobs for re-sync

### Output
- import/sync behavior is understandable and observable

## Track 7: UI and Product Flow

### Tasks
- design sign-in entry and signed-in empty states
- redesign the `Source` area into source management
- add owned-source list and active-source state
- add Discogs connect/import UI
- add source sync status UI
- update loaded collection UI from “stash” language to broader “source” language where appropriate

### Output
- the app feels coherent as it shifts from public stashes to owned sources

## Track 8: Metadata Enrichment

### Tasks
- normalize richer metadata fields from Discogs
- update album detail display to use richer metadata when available
- preserve Phase 1 fallback behavior when data is sparse
- add release/source IDs to the domain model

### Output
- better album fidelity without overwhelming the UI

## Track 9: Artwork Model Preparation

### Tasks
- define a future-friendly image model for albums/releases
- stop assuming one permanent cover image field is enough
- decide how to store front/back/inner/label references later
- keep Phase 2 implementation compatible with a future artwork carousel

### Output
- the schema and domain model can support richer release imagery later

## Track 10: Durable Sharing

### Tasks
- define shareable source URL model
- define private vs shared visibility behavior
- create route handling for shared owned collections
- add sharing UI only after source import is stable

### Output
- durable collection sharing without relying on the public top-10 feed

## Track 11: Backward Compatibility

### Tasks
- preserve the Phase 1 public feed
- keep public top-10 stash loading working
- avoid breaking anonymous public usage while adding signed-in durable flows
- document the relationship between public stash flow and owned-source flow

### Output
- Phase 2 grows the product without invalidating Phase 1

## Track 12: Deployment and Ops

### Tasks
- add required auth env vars
- add Discogs env vars or secrets
- verify Vercel auth callback configuration
- verify Neon migration workflow for new tables
- document new setup requirements in README/workflow docs

### Output
- Phase 2 can be deployed and operated without tribal knowledge

## Suggested Milestone Breakdown

### Milestone 1
- auth
- users
- sources
- signed-in CSV source creation

### Milestone 2
- Discogs connection
- Discogs import
- source sync status

### Milestone 3
- richer metadata
- improved source browser
- release/image model groundwork

### Milestone 4
- durable sharing
- visibility rules
- polish and stabilization
