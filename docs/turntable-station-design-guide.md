# Turntable Station Design Guide

## Purpose
This document captures the visual and interaction direction for the `Turntable Station` interface so it can be reused in later implementation phases, redesigns, or AI-assisted UI work.

This is not a product spec. It is a design and art-direction guide.

## Core Design Idea
The app should feel like a physical 1970s hi-fi component sitting in a wood-paneled listening room.

The experience combines:
- a brushed-aluminum stereo receiver header
- warm wood cabinetry and paneling
- a large album display area that feels like a lit receiver display bay
- tactile hardware-like controls
- a curated record-collection browsing experience

The page should feel like a real object, not a generic web dashboard.

## Visual Identity

### Overall Mood
- 1970s receiver
- warm wood veneer
- smoked glass and brushed aluminum
- tactile knobs, lights, and tuning hardware
- intimate listening-room atmosphere
- collector-focused, not corporate

### What It Should Not Feel Like
- a SaaS dashboard
- a default music app
- neon arcade UI everywhere
- flat modern minimalism
- rustic shack branding
- overly psychedelic poster art across the whole layout

The page can have personality, but the main visual language should be vintage hi-fi realism.

## Layout Model

### Top Header
The header should read like a real stereo receiver fascia.

It includes:
- a left power control
- a central title area
- a radio frequency scale with a red tuner
- a right tuning knob

The title should be the focal point, but the hardware should make the whole strip feel believable.

### Main Content
The main body uses a two-column composition:

- Left:
  - large album art display
  - album metadata below
- Right:
  - random button
  - recent picks

The left side is the hero. The right side supports the listening flow.

### Bottom Strip
The lower row contains the utility sections:
- loaded or available stash
- source/upload area
- filters

These should feel like lower receiver modules or attached control bays, not separate cards from another product.

## Materials

### Wood
Use warm 1970s wall paneling and cabinet wood tones.

Characteristics:
- reddish-brown to walnut range
- subtle grain
- broad horizontal panel feeling
- warm and slightly darkened, not orange plastic

### Metal
Brushed aluminum should be used in the header and selected hardware surfaces.

Characteristics:
- horizontal grain
- soft beveling
- restrained contrast
- realistic highlights

### Receiver Glow
Green should be used sparingly as receiver energy:
- album display cavity glow
- loaded/live state hints
- subtle equipment illumination

Do not let green dominate the whole page.

### Action Color
Red is the main action color.

Use it for:
- the random button
- the tuner needle
- selective emphasis

Purple or neon effects should be limited and controlled, mainly for powered title treatment if used.

## Typography

### Header / Receiver Branding
The header title should feel engraved, outlined, or illuminated like receiver branding.

Powered-off state:
- transparent fill
- dark outline
- understated, engraved feel

Powered-on state:
- transparent fill
- red outline
- glow treatment
- still grounded in receiver realism

### App Fonts
Use:
- `Oswald` for strong display and hardware-like headings
- `Bitter` for supporting body copy when a more analog/editorial tone is needed
- `Satoshi` for album title and artist presentation

### Album Metadata
Use:
- album title: `Satoshi Bold`
- artist: `Satoshi Medium`

Presentation rules:
- left aligned
- compact vertical rhythm
- album title is primary
- artist is secondary
- metadata line is smaller and subdued

## Header Rules

### Header Composition
The header should stay compact.

It should include:
- power button
- title
- FM/AM scale
- red tuner needle
- tuning knob

It should not include:
- extra slogans unless necessary
- oversized decorative badges
- railroad-station or poster-sign motifs

### Header Interaction
- clicking the tuning knob moves the red tuner left or right randomly
- the tuner should move smoothly, never jump
- the tuning knob should visibly rotate when used
- clicking the power button toggles the title from unlit to glowing

### Header Feel
The best reference is a realistic brushed-aluminum nameplate, not a theme park sign.

## Album Display Rules

### Purpose
The album display is the hero visual zone.

It should feel like:
- a receiver display bay
- a lit listening station
- a place where art and music metadata take center stage

### Art Treatment
If cover art exists:
- show a sharp foreground cover
- use a blurred enlarged version of the same art behind it
- keep the foreground art readable
- keep the background subtle

If cover art does not exist:
- show a large spinning vinyl fallback
- keep the receiver glow behind it so the state still feels intentional

### Styling
The display frame should be:
- metallic
- restrained
- not overdecorated
- slightly green-lit

The art should remain the focal point, not the bezel.

## Recent Picks Rules

### Role
Recent Picks is a compact listening history, not a giant feed.

### Presentation
Each item should include:
- small index
- cover art thumbnail
- album title
- artist

Design rules:
- brighter rows than before, but still warm and dark
- enough spacing for scanability
- artist line slightly dimmer than title
- consistent row rhythm

### Behavior
Recent picks should show previous picks, not the current selection.

## Stash Panel Rules

### Unloaded State
Show the available stash list.

Each card should feel like:
- a physical collection card
- clear summary first
- obvious `Load Stash` action

### Loaded State
Once a stash is loaded:
- hide the full list
- show only the active stash
- include a `Clear` action

The loaded stash should feel visually distinct from the unloaded cards.

Recommended signals:
- brighter card surface
- subtle live indicator
- slightly stronger accent edge or glow

## Filters Rules

### Scope
Filters should remain simple:
- Genre
- Decade

### Interaction Model
The main state uses two large rotary-style selector controls.

When one is activated:
- it is replaced by smaller rotary option buttons
- only that filter family is shown
- arrows or swipe can move through more options

This should feel like hardware-inspired selection, not pill chips or a generic form.

## Buttons

### Random
The `Random` button is the main call to action.

It should be:
- large
- red
- tactile
- unmistakable

When rolling:
- the dice animation replaces the label
- the album display receives an energized visual state

### Other Buttons
Secondary buttons should stay simpler and smaller.

Use consistent wording:
- `Load Stash`
- `Upload Stash`
- `Clear`

Avoid adding too many actions at once.

## Empty, Loading, and Error States

These states should feel like part of the device, not generic app messaging.

### Good Patterns
- short copy
- single-line status strips
- visual motion doing part of the communication
- consistent panel structure, even when content is loading

### Avoid
- paragraphs of explanation
- generic placeholder language
- too many stacked notices

## Motion

### Preferred Motion
- smooth tuner glide
- subtle powered light pulse
- restrained text reveals
- record spin that is visibly readable
- gentle emphasis when randomization occurs

### Avoid
- constant flashy animation
- large bouncing elements
- motion that fights the realism of the receiver theme

## Color System

### Main Roles
- wood browns: environment and cabinet
- aluminum silver: hardware/header
- green: receiver energy and display glow
- red: actions and tuner accents
- cream/gold: paper and vintage warmth

### Rule
Each accent color should have a job.

Do not let:
- green become the action color
- purple spread beyond the header power state
- red appear everywhere at equal intensity

## Mobile Guidance

On mobile:
- the album art should stay large
- the header should compress cleanly
- tiny labels may disappear when needed
- controls should stay readable before decorative

The mobile layout should preserve hierarchy, not just stack everything mechanically.

## Reuse Prompt
Use this section when asking an AI or future designer to continue the interface direction:

> Design this interface as a realistic 1970s stereo receiver and listening station. Use warm wood wall paneling, brushed aluminum, smoked-glass receiver styling, and subtle green receiver glow. The page should feel like a physical hi-fi component, not a generic music app. Keep the header compact and realistic with a power button, receiver title, radio scale, red tuner needle, and tuning knob. The left side should feature a large album display with a sharp foreground cover and a blurred background version of the same art when available. If no art exists, show a large spinning vinyl fallback. The right side should support the listening flow with a large red Random button and a clean Recent Picks history. Filters should feel like rotary selector hardware, not chips or form controls. Use restrained motion, tactile surfaces, and consistent hierarchy. Preserve realism and avoid overdecorating the layout.

## Future Enhancements To Preserve
These ideas fit the direction and can be added later without changing the visual identity:
- multi-image album art carousel
- release-image gallery in Phase 2
- richer stash browsing
- stronger mobile art interactions
- more realistic receiver status strips

## Final Rule
When in doubt, choose the option that makes the app feel more like a believable vintage hi-fi object and less like a themed web dashboard.
