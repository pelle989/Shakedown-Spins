# Visual System Tightening Plan

## Goal
Keep the strong 1970s receiver / listening-room identity, while reducing CSS drift and repeated one-off styling.

This plan is about turning the current visual language into a smaller reusable system so future work is:

- faster
- more consistent
- easier to maintain
- less likely to create UI drift

The goal is not a redesign. The goal is a calmer, more durable system underneath the existing GUI.

## Why This Matters
The app already has a strong visual direction:

- brushed receiver panels
- warm metallic cards
- red/orange primary action language
- stash-card identity
- hardware-style tabs and dials
- branded modals and status strips

What has grown organically is the implementation:

- similar buttons are styled in multiple places
- panel headers are repeated across components
- status strips vary by area
- card shells and modal shells are close, but not fully systematized

This creates two long-term problems:

1. visual drift  
Small differences accumulate until the GUI feels less intentional.

2. slower development  
Future UI changes require touching many local styles instead of updating a shared system.

## Core Principle
Do not systematize everything at once.

Instead:

1. define the small set of shared visual primitives
2. apply them to the most repeated UI patterns
3. migrate gradually as each area is touched

This should be an incremental cleanup lane, not a giant restyle.

## System Layers

### 1. Tokens
Shared tokens should be the smallest reusable values:

- color roles
- radius roles
- spacing roles
- shadow roles
- font roles
- panel border roles
- motion durations

These should describe intent, not location.

Examples:

- `--action-primary-bg`
- `--action-primary-text`
- `--panel-surface-dark`
- `--panel-surface-warm`
- `--status-success-bg`
- `--status-error-bg`
- `--radius-card`
- `--radius-pill`
- `--shadow-panel`
- `--shadow-card`

### 2. Shared UI Families
These are the visual building blocks that should behave consistently across the app:

- primary action button
- secondary action button
- destructive action button
- icon button
- tab button
- panel header
- stash card shell
- modal shell
- status strip

### 3. Section-Specific Skins
These are the area-specific looks that can still vary, while using the shared system:

- album stage
- recent picks
- filters
- street feed
- my stash
- friends stash
- source
- messages

The shared system should define the skeleton. Each section can still have a skin.

## Proposed Shared Component Families

### Primary Action
Used for:

- `Load`
- `Random`
- `Upload Stash`
- `Import Discogs`
- `Replace Stash`

Rules:

- always warm/high-emphasis
- same font family
- same letter-spacing family
- consistent hover lift
- predictable disabled state

### Secondary Action
Used for:

- `Edit`
- `Back`
- `Clear`
- `Copy Link`
- `Send Stash`

Rules:

- pill-like or hardware utility style
- less visual weight than primary
- same spacing rhythm everywhere

### Destructive Action
Used for:

- `Delete`
- `Unshare`
- `Reset Discogs Key`

Rules:

- visually related to the button family
- stronger warning color language
- never visually confused with standard utility actions

### Tab System
Used for:

- stash tabs
- source tabs
- messages inbox/compose switch

Rules:

- same active/inactive logic
- same radius family
- same pressed/hover behavior
- same mobile collapse logic pattern

### Panel Header
Used for:

- `Recent Picks`
- `Filters`
- `Stashes`
- `Source`

Rules:

- same height
- same text style
- same alignment
- same spacing above content

### Card Shell
Used for:

- street feed cards
- my stash cards
- friends stash cards
- loaded stash cards

Rules:

- shared card structure
- shared notch treatment
- shared padding baseline
- variants only where content truly differs

### Modal Shell
Used for:

- sign in
- welcome
- discogs connect
- delete confirmations
- profile
- expired link

Rules:

- shared backdrop pattern
- shared interior spacing scale
- shared heading hierarchy
- shared close action placement rules

### Status Strip
Used for:

- success
- error
- informational note
- arrival cues

Rules:

- same border logic
- same spacing logic
- same readable contrast system
- section-specific color variants allowed

## First 5 Standardization Tasks

### Task 1. Normalize Buttons
Create a shared button family and map all current button variants into:

- primary
- secondary
- destructive
- icon-only

Priority files:

- `src/routes/+page.svelte`
- `src/lib/components/MyStashSection.svelte`
- `src/lib/components/FriendsStashSection.svelte`
- `src/lib/components/SourcePanel.svelte`
- `src/lib/components/MessagesModal.svelte`

### Task 2. Normalize Panel Headers
Make all section headers use one shared panel-header recipe.

Priority targets:

- `Recent Picks`
- `Filters`
- `Stashes`
- `Source`

### Task 3. Normalize Stash Cards
Create one shared stash-card shell and then allow only light variants for:

- street feed
- my stash
- friends stash
- loaded state

This is one of the biggest wins for both consistency and maintainability.

### Task 4. Normalize Modals
Create one shared modal shell and move current modal layouts toward the same spacing and heading rules.

This should cover:

- auth modal
- welcome modal
- delete confirmations
- discogs warning/connect modals
- profile modal

### Task 5. Normalize Status Messaging
Bring all status bars/notes into a small, shared status system.

Examples:

- success
- error
- info
- temporary arrival cue

This should reduce “special one-off message styling” across the app.

## Suggested Rollout Order

### Phase A. Token Cleanup
Define or rename shared CSS variables for:

- surface colors
- action colors
- text roles
- radii
- shadows

Do this first, lightly.

### Phase B. Button System
Buttons are the highest-value repeated element.

Why first:

- repeated everywhere
- currently close, but not fully unified
- easy to drift visually

### Phase C. Panel Header + Status Strip
These are smaller wins that make the app feel calmer immediately.

### Phase D. Card Shell Unification
This is a larger cleanup, but worth it because the stash system is central to the app.

### Phase E. Modal Shell Unification
Do this after cards/buttons/headers, once the base primitives are cleaner.

## What Not To Do

### Do not over-abstract too early
Avoid turning every class into a generic framework before the repeated patterns are stable.

### Do not flatten the visual personality
The app should still feel like a real object, not a generic web UI kit.

### Do not rewrite every component at once
This is a migration path, not a one-shot refactor.

## Success Criteria
The visual system is “tightened” when:

- buttons feel like one family
- stash cards feel like one family
- panel headers are identical in rhythm and style
- modals feel structurally related
- status messages follow one logic
- new UI features can be added mostly by reusing existing visual primitives

## Recommended Next Step
If this plan is picked up later, start with:

1. button family audit
2. panel-header audit
3. stash-card shell audit

That sequence should produce the best ratio of effort to visible improvement.
