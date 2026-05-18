# Shakedown Spins Phase 2C Rich Metadata and Artwork Spec

This document defines the next concrete Phase 2 slice after auth, private sources, and Discogs import are working.

It answers the question:

> What should “more album covers, pictures, and details” actually mean in the product?

## Goal

Make imported collections feel more like a real owned catalog without breaking the simple listening ritual.

Phase 2C should improve:

- album detail quality
- cover-art reliability
- Discogs source fidelity
- collector-oriented browsing context

It should do that while keeping the album stage visually focused and easy to read.

## Product Intent

Right now the app is good at:

- loading a stash
- randomizing an album
- showing one main cover image

What still feels thin:

- metadata is minimal
- Discogs imports do not yet feel visually richer than CSV uploads
- there is no sense of alternate artwork or release-image depth
- users cannot see much of what makes a Discogs-backed release “real”

Phase 2C should close that gap.

## Phase 2C Scope

### In Scope

- richer release metadata for Discogs-backed sources
- storing more artwork fields on imported albums
- a stronger album detail display in the player area
- optional secondary images for releases when Discogs provides them
- better per-source metadata fidelity in `My Stash`

### Out Of Scope

- full Discogs marketplace features
- collection value pricing
- wantlist/sell-list support
- deep release version comparison UI
- multi-user shared editing
- complex bulk metadata repair tools

## What “More Covers, Pictures, and Details” Means

Phase 2C should add these concrete improvements.

### 1. Better Primary Cover Persistence

Each imported private album should store a durable primary cover image URL when available.

Expected behavior:

- Discogs-backed albums should prefer Discogs image data over ad hoc lookup
- CSV-only albums can still fall back to the current art lookup flow
- once imported, private sources should not need to rediscover the same image every time

### 2. Release Image Support

For Discogs-backed albums, store release image references so the app can show more than one image when available.

This should support:

- primary cover
- alternate cover/back cover/label shots when Discogs provides them
- future carousel/gallery UI

The initial UI does not need to expose a full gallery immediately, but the data model should support it.

### 3. Richer Album Detail Fields

Discogs-backed albums should support a stronger detail readout.

Recommended fields:

- `artist`
- `title`
- `year`
- `label`
- `format`
- `discogs_release_id`
- `discogs_resource_url`
- `country`
- `catalog_number`
- `style`
- `notes` or release notes if we intentionally support them later

Not every field must be shown at once, but storing them now will make the UI much easier to grow.

### 4. Better Source Identity

Private sources should more clearly show:

- source type (`csv` vs `discogs`)
- last import time
- album count
- source creation/update timing

Discogs sources should feel like a real connected record source, not just another stash row.

## Recommended UX Outcome

After Phase 2C, a signed-in user should be able to:

1. import a Discogs collection
2. load that source into My Stash
3. randomize a record
4. see a stronger album display with more trustworthy release details
5. optionally inspect extra artwork when available

The experience should still feel like:

- a listening-first app

and not like:

- a spreadsheet
- a Discogs admin screen

## UI Targets

### Album Stage

Keep the large main cover art treatment.

Additions should be restrained:

- preserve the main foreground cover
- preserve the blurred-art or vinyl fallback direction
- optionally add a small image-count affordance when a release has more than one image

### Album Details

The detail presentation should return in a stronger and more intentional way than the old removed metadata strip.

Recommended direction:

- a compact receiver-style detail rail
- or a small album facts drawer beneath the main readout

Initial detail priority:

1. year
2. label
3. format
4. style
5. country

### Image Expansion

If a release has multiple images, the first UI pass should be simple.

Recommended first implementation:

- small `View Images` or image-count button
- opens a modal or tray
- shows 2-6 release images in a simple gallery

This is better than forcing a carousel into the main album stage too early.

## Data Model Direction

Phase 2C likely needs to extend the current private-source schema.

Recommended additions to `source_albums` or related tables:

- `cover_image_url text`
- `thumb_image_url text`
- `discogs_release_id text`
- `discogs_resource_url text`
- `country text`
- `catalog_number text`
- `styles text[]`

Recommended new related table:

- `source_album_images`

Suggested shape:

- `id uuid primary key`
- `source_album_id uuid not null`
- `image_url text not null`
- `thumb_url text`
- `image_role text`
- `sort_order integer not null`
- `created_at timestamptz not null default now()`

This keeps the main album row light while allowing multi-image support.

## Delivery Sequence

### Phase 2C.1

- improve Discogs import mapping
- persist richer metadata on source albums
- persist primary cover image reliably

### Phase 2C.2

- surface richer metadata in the album UI
- strengthen My Stash source details

### Phase 2C.3

- add release-image gallery support
- expose secondary images in a modal or tray

## Success Criteria

Phase 2C is successful when:

- Discogs-backed albums show better details than CSV-only imports
- primary cover art is more reliable and less ephemeral
- at least one richer metadata surface is visible in the player UI
- the app supports release-image expansion for imported Discogs items
- the app still feels centered on random listening, not data management

## Recommended Next Build Slice

The best immediate implementation slice is:

### Build Slice A

- extend Discogs import mapping
- add richer metadata columns
- persist primary cover image + thumbnail
- show `label`, `format`, and `style` in a compact album-details UI

That is the highest-value first move because it improves both:

- data quality
- visible product quality

without forcing the full gallery work immediately.
