<script lang="ts">
  import VinylLoader from '$lib/components/VinylLoader.svelte';
  import { parseCsv } from '$lib/csv';
  import { buildFilterOptions, emptyFilters, filterAlbums } from '$lib/filters';
  import { nextPick, createRandomizerState, type RandomizerState } from '$lib/randomizer';
  import { clearActiveStashId, loadActiveStashId, saveActiveStashId } from '$lib/session';
  import type {
    ActiveCollectionState,
    Album,
    FeedData,
    FilterState,
    LoadedStash,
    StashSummary,
    UploadPreview
  } from '$lib/types';
  import { invalidate } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  let { data }: { data: FeedData } = $props();

  let stashes = $state<StashSummary[]>([]);
  let databaseAvailable = $state(false);
  let activeState = $state<ActiveCollectionState>({ status: 'idle' });
  let loadingRestore = $state(true);
  let restoringMessage = $state<string | null>(null);
  let pendingUpload = $state(false);
  let uploadError = $state<string | null>(null);
  let uploadSuccess = $state<string | null>(null);
  let highlightedStashId = $state<string | null>(null);
  let selectedFile: File | null = $state(null);
  let preview: UploadPreview | null = $state(null);
  let currentPick = $state<Album | null>(null);
  let displayedTitle = $state('');
  let displayedArtist = $state('');
  let artLoading = $state(false);
  let rollingSelection = $state(false);
  let titleShuffleInterval: number | null = null;
  let titleShuffleTimeout: number | null = null;
  let coverCache = new Map<string, string | null>();
  let randomizerState = $state<RandomizerState>(createRandomizerState());
  let filters = $state<FilterState>(emptyFilters());
  let expandedFilterDial = $state<'genre' | 'decade' | null>(null);
  let filterDialPage = $state({ genre: 0, decade: 0 });
  let filterTouchStartX = $state<number | null>(null);
  let stashName = $state('');
  let powerOn = $state(true);
  let tunerPosition = $state(58);
  let tuningKnobAngle = $state(18);
  const stashTimestampFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  const filteredAlbums = $derived(
    activeState.status === 'loaded'
      ? filterAlbums(activeState.collection.albums, filters)
      : []
  );

  const filterOptions = $derived(
    activeState.status === 'loaded'
      ? buildFilterOptions(activeState.collection.albums)
      : buildFilterOptions([])
  );

  const recentHistory = $derived(randomizerState.recentHistory);
  const activeFilterTags = $derived([
    ...filters.genre.map((value) => `Genre: ${value}`),
    ...filters.decade.map((value) => `Decade: ${value}`)
  ]);
  const selectedGenreLabel = $derived(filters.genre.length > 0 ? filters.genre.join(' / ') : 'All Genres');
  const selectedDecadeLabel = $derived(filters.decade.length > 0 ? filters.decade.join(' / ') : 'All Decades');
  const expandedFilterOptions = $derived(
    expandedFilterDial ? filterOptions[expandedFilterDial] : []
  );
  const expandedFilterPageCount = $derived(
    Math.max(1, Math.ceil(expandedFilterOptions.length / 4))
  );
  const expandedFilterPageOptions = $derived(
    expandedFilterOptions.slice(
      (expandedFilterDial ? filterDialPage[expandedFilterDial] : 0) * 4,
      ((expandedFilterDial ? filterDialPage[expandedFilterDial] : 0) + 1) * 4
    )
  );
  const activeStashSummary = $derived(
    activeState.status === 'loaded'
      ? stashes.find((stash) => stash.id === activeState.collection.source.id) ?? {
          id: activeState.collection.source.id,
          name: activeState.collection.source.label,
          albumCount: activeState.collection.albums.length,
          createdAt: new Date().toISOString()
        }
      : null
  );

  $effect(() => {
    stashes = data.stashes;
    databaseAvailable = data.databaseAvailable;
  });

  function resetPlaybackState() {
    randomizerState = createRandomizerState();
    currentPick = null;
    displayedTitle = '';
    displayedArtist = '';
    filters = emptyFilters();
  }

  function clearShuffleTimers() {
    if (titleShuffleInterval) {
      window.clearInterval(titleShuffleInterval);
      titleShuffleInterval = null;
    }

    if (titleShuffleTimeout) {
      window.clearTimeout(titleShuffleTimeout);
      titleShuffleTimeout = null;
    }
  }

  function scrambleText(target: string) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    return [...target]
      .map((character, index) => {
        if (character === ' ') return ' ';
        if (!/[a-z]/i.test(character)) return character;

        const settleThreshold = Math.floor(Math.random() * target.length);
        if (index < settleThreshold) return target[index];

        const randomCharacter = alphabet[Math.floor(Math.random() * alphabet.length)];
        return character === character.toLowerCase() ? randomCharacter.toLowerCase() : randomCharacter;
      })
      .join('');
  }

  function startTextShuffle(title: string, artist: string, duration = 650) {
    clearShuffleTimers();

    displayedTitle = scrambleText(title);
    displayedArtist = scrambleText(artist);

    titleShuffleInterval = window.setInterval(() => {
      displayedTitle = scrambleText(title);
      displayedArtist = scrambleText(artist);
    }, 55);

    titleShuffleTimeout = window.setTimeout(() => {
      clearShuffleTimers();
      displayedTitle = title;
      displayedArtist = artist;
    }, duration);
  }

  function defineRollingDice() {
    if (typeof window === 'undefined' || customElements.get('rolling-dice')) return;

    class RollingDice extends HTMLElement {
      currentFace = 1;
      rollCount = 0;
      isRolling = false;
      size = Number(this.getAttribute('size')) || 50;
      duration = Number(this.getAttribute('duration')) || 500;
      dice: HTMLDivElement | null = null;
      rollingTimer: number | null = null;
      faceRotations = {
        1: { x: 0, y: 0, z: 0 },
        2: { x: 0, y: -90, z: 0 },
        3: { x: -90, y: 0, z: 0 },
        4: { x: 90, y: 0, z: 0 },
        5: { x: 0, y: 90, z: 0 },
        6: { x: 0, y: 180, z: 0 }
      };

      constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.shadowRoot!.innerHTML = `
          <style>
            :host {
              display: inline-block;
              width: ${this.size}px;
              height: ${this.size}px;
              vertical-align: middle;
            }

            .dice-wrap {
              width: ${this.size}px;
              height: ${this.size}px;
              perspective: ${this.size * 8}px;
            }

            .dice {
              width: ${this.size}px;
              height: ${this.size}px;
              position: relative;
              transform-style: preserve-3d;
              transition: transform ${this.duration}ms cubic-bezier(0.2, 0.8, 0.2, 1);
            }

            .dice.rolling {
              animation: dice-pop ${this.duration}ms cubic-bezier(0.2, 0.8, 0.2, 1);
            }

            .die-face {
              position: absolute;
              inset: 0;
              background: #fff9ea;
              border: 1px solid rgba(122, 88, 58, 0.18);
              border-radius: 22%;
              box-shadow:
                inset 0 0 7px rgba(68, 43, 24, 0.12),
                0 4px 10px rgba(15, 23, 42, 0.14);
              backface-visibility: hidden;
            }

            .face-1 { transform: translateZ(${this.size / 2}px); }
            .face-2 { transform: rotateY(90deg) translateZ(${this.size / 2}px); }
            .face-3 { transform: rotateX(90deg) translateZ(${this.size / 2}px); }
            .face-4 { transform: rotateX(-90deg) translateZ(${this.size / 2}px); }
            .face-5 { transform: rotateY(-90deg) translateZ(${this.size / 2}px); }
            .face-6 { transform: rotateY(180deg) translateZ(${this.size / 2}px); }

            .pip {
              position: absolute;
              width: 16%;
              height: 16%;
              border-radius: 999px;
              background: #3c2315;
              transform: translate(-50%, -50%);
              box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.28);
            }

            .face-1 .pip:nth-child(1) { left: 50%; top: 50%; }
            .face-2 .pip:nth-child(1) { left: 17%; top: 17%; }
            .face-2 .pip:nth-child(2) { left: 83%; top: 83%; }
            .face-3 .pip:nth-child(1) { left: 17%; top: 17%; }
            .face-3 .pip:nth-child(2) { left: 50%; top: 50%; }
            .face-3 .pip:nth-child(3) { left: 83%; top: 83%; }
            .face-4 .pip:nth-child(1) { left: 17%; top: 17%; }
            .face-4 .pip:nth-child(2) { left: 83%; top: 17%; }
            .face-4 .pip:nth-child(3) { left: 17%; top: 83%; }
            .face-4 .pip:nth-child(4) { left: 83%; top: 83%; }
            .face-5 .pip:nth-child(1) { left: 17%; top: 17%; }
            .face-5 .pip:nth-child(2) { left: 83%; top: 17%; }
            .face-5 .pip:nth-child(3) { left: 50%; top: 50%; }
            .face-5 .pip:nth-child(4) { left: 17%; top: 83%; }
            .face-5 .pip:nth-child(5) { left: 83%; top: 83%; }
            .face-6 .pip:nth-child(1) { left: 17%; top: 17%; }
            .face-6 .pip:nth-child(2) { left: 83%; top: 17%; }
            .face-6 .pip:nth-child(3) { left: 17%; top: 50%; }
            .face-6 .pip:nth-child(4) { left: 83%; top: 50%; }
            .face-6 .pip:nth-child(5) { left: 17%; top: 83%; }
            .face-6 .pip:nth-child(6) { left: 83%; top: 83%; }

            @keyframes dice-pop {
              0% { scale: 1; }
              50% { scale: 1.08; }
              100% { scale: 1; }
            }
          </style>

          <div class="dice-wrap" aria-hidden="true">
            <div class="dice">
              <div class="die-face face-1"><span class="pip"></span></div>
              <div class="die-face face-2"><span class="pip"></span><span class="pip"></span></div>
              <div class="die-face face-3"><span class="pip"></span><span class="pip"></span><span class="pip"></span></div>
              <div class="die-face face-4"><span class="pip"></span><span class="pip"></span><span class="pip"></span><span class="pip"></span></div>
              <div class="die-face face-5"><span class="pip"></span><span class="pip"></span><span class="pip"></span><span class="pip"></span><span class="pip"></span></div>
              <div class="die-face face-6"><span class="pip"></span><span class="pip"></span><span class="pip"></span><span class="pip"></span><span class="pip"></span><span class="pip"></span></div>
            </div>
          </div>
        `;

        this.dice = this.shadowRoot!.querySelector('.dice');
      }

      connectedCallback() {
        this.roll();
        this.rollingTimer = window.setInterval(() => this.roll(), this.duration + 450);
      }

      disconnectedCallback() {
        if (this.rollingTimer) {
          window.clearInterval(this.rollingTimer);
          this.rollingTimer = null;
        }
      }

      getRandomFace() {
        const nextFace = Math.floor(Math.random() * 6) + 1;
        return nextFace === this.currentFace ? (nextFace % 6) + 1 : nextFace;
      }

      roll(finalFace?: number) {
        if (this.isRolling || !this.dice) return;

        this.isRolling = true;
        this.rollCount += 1;

        const nextFace =
          finalFace && finalFace >= 1 && finalFace <= 6 ? finalFace : this.getRandomFace();

        const rotation = this.faceRotations[nextFace as keyof typeof this.faceRotations];
        const spinX = this.rollCount * 720;
        const spinY = this.rollCount * 900;
        const spinZ = this.rollCount * 252;

        this.dice.classList.remove('rolling');
        void this.dice.offsetWidth;
        this.dice.classList.add('rolling');

        this.dice.style.transform = `
          rotateX(${rotation.x + spinX}deg)
          rotateY(${rotation.y + spinY}deg)
          rotateZ(${rotation.z + spinZ}deg)
        `;

        window.setTimeout(() => {
          this.currentFace = nextFace;
          this.isRolling = false;
          this.dice?.classList.remove('rolling');

          this.dispatchEvent(
            new CustomEvent('roll-complete', {
              detail: { value: nextFace },
              bubbles: true
            })
          );
        }, this.duration);
      }
    }

    customElements.define('rolling-dice', RollingDice);
  }

  async function restoreSession() {
    const savedId = loadActiveStashId();
    if (!savedId) {
      loadingRestore = false;
      return;
    }

    try {
      const response = await fetch(`/api/stashes/${savedId}`);
      if (!response.ok) {
        clearActiveStashId();
        restoringMessage = 'That stash moved on. Only the newest 10 stashes survive, so browse the current feed below.';
        loadingRestore = false;
        return;
      }

      const payload = (await response.json()) as { stash: LoadedStash };
      activeState = {
        status: 'loaded',
        collection: {
          source: { kind: 'top10', id: payload.stash.id, label: payload.stash.name },
          albums: payload.stash.albums
        }
      };
      resetPlaybackState();
    } catch {
      restoringMessage = 'Could not restore the previous stash. Browse the current feed below.';
    } finally {
      loadingRestore = false;
    }
  }

  onMount(() => {
    defineRollingDice();
    void restoreSession();
  });

  onDestroy(() => {
    clearShuffleTimers();
  });

  async function loadStash(stashId: string) {
    restoringMessage = null;
    const response = await fetch(`/api/stashes/${stashId}`);
    if (!response.ok) {
      restoringMessage = 'That stash moved on. Only the newest 10 stashes survive, so browse the current feed below.';
      clearActiveStashId();
      activeState = { status: 'idle' };
      return;
    }

    const payload = (await response.json()) as { stash: LoadedStash };
    activeState = {
      status: 'loaded',
      collection: {
        source: { kind: 'top10', id: payload.stash.id, label: payload.stash.name },
        albums: payload.stash.albums
      }
    };
    saveActiveStashId(payload.stash.id);
    resetPlaybackState();
  }

  function unloadStash() {
    clearActiveStashId();
    activeState = { status: 'idle' };
    currentPick = null;
    displayedTitle = '';
    displayedArtist = '';
    restoringMessage = null;
    filters = emptyFilters();
    expandedFilterDial = null;
  }

  function togglePower() {
    powerOn = !powerOn;
  }

  function nudgeTuner() {
    const direction = Math.random() < 0.5 ? -1 : 1;
    const distance = 4 + Math.floor(Math.random() * 8);
    tunerPosition = Math.max(8, Math.min(92, tunerPosition + direction * distance));
    tuningKnobAngle = Math.max(-34, Math.min(34, tuningKnobAngle + direction * (8 + Math.floor(Math.random() * 7))));
  }

  function formatStashTimestamp(value: string) {
    return stashTimestampFormatter.format(new Date(value));
  }

  async function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    selectedFile = input.files?.[0] ?? null;
    preview = null;
    uploadError = null;

    if (!selectedFile) return;

    const text = await selectedFile.text();
    preview = parseCsv(text);
  }

  async function submitUpload(event: SubmitEvent) {
    event.preventDefault();
    uploadError = null;
    uploadSuccess = null;

    if (!selectedFile || !preview || preview.validAlbums === 0) {
      uploadError = 'Choose a valid CSV file before uploading.';
      return;
    }

    pendingUpload = true;
    const formData = new FormData();
    formData.set('name', stashName);
    formData.set('file', selectedFile);

    try {
      const response = await fetch('/api/stashes', {
        method: 'POST',
        body: formData
      });
      const payload = (await response.json()) as { message?: string; stash?: StashSummary };
      if (!response.ok || !payload.stash) {
        uploadError = payload.message ?? 'Upload failed.';
        return;
      }

      await invalidate('/');
      stashes = [payload.stash, ...stashes.filter((stash) => stash.id !== payload.stash?.id)].slice(0, 10);
      highlightedStashId = payload.stash.id;
      uploadSuccess = `Your stash was created with ${payload.stash.albumCount} albums.`;
      stashName = '';
      selectedFile = null;
      preview = null;
      const input = document.getElementById('stash-file') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch {
      uploadError = 'Upload failed.';
    } finally {
      pendingUpload = false;
    }
  }

  async function rollNext() {
    if (activeState.status !== 'loaded') return;
    const result = nextPick(filteredAlbums, randomizerState);
    if (!result) return;

    rollingSelection = true;
    randomizerState = result.state;
    currentPick = result.pick;
    startTextShuffle(result.pick.title, result.pick.artist);
    try {
      await Promise.all([
        loadArt(result.pick),
        new Promise((resolve) => window.setTimeout(resolve, 650))
      ]);
    } finally {
      rollingSelection = false;
    }
  }

  async function loadArt(album: Album) {
    const key = `${album.artist}::${album.title}`.toLowerCase();
    if (coverCache.has(key)) {
      const cached = coverCache.get(key);
      currentPick = currentPick ? { ...currentPick, coverImageUrl: cached ?? undefined } : currentPick;
      if (cached) {
        randomizerState = {
          ...randomizerState,
          recentHistory: randomizerState.recentHistory.map((item) =>
            item.id === album.id ? { ...item, coverImageUrl: cached ?? undefined } : item
          )
        };
      }
      return;
    }

    artLoading = true;
    try {
      const url = new URL('https://itunes.apple.com/search');
      url.searchParams.set('term', `${album.artist} ${album.title}`);
      url.searchParams.set('entity', 'album');
      url.searchParams.set('limit', '10');
      const response = await fetch(url);
      const data = await response.json();
      const match = data.results?.find((result: Record<string, string>) => {
        return (
          result.collectionName?.toLowerCase() === album.title.toLowerCase() &&
          result.artistName?.toLowerCase() === album.artist.toLowerCase()
        );
      });
      const artwork = match?.artworkUrl100 ? String(match.artworkUrl100).replace('100x100', '600x600') : null;
      coverCache.set(key, artwork);
      if (currentPick?.id === album.id) {
        currentPick = { ...album, coverImageUrl: artwork ?? undefined };
      }
      if (artwork) {
        randomizerState = {
          ...randomizerState,
          recentHistory: randomizerState.recentHistory.map((item) =>
            item.id === album.id ? { ...item, coverImageUrl: artwork ?? undefined } : item
          )
        };
      }
    } catch {
      coverCache.set(key, null);
    } finally {
      artLoading = false;
    }
  }

  function toggleFilter(key: keyof FilterState, value: string) {
    const values = new Set(filters[key]);
    if (values.has(value)) values.delete(value);
    else values.add(value);
    filters = { ...filters, [key]: [...values] };
  }

  function clearFilters() {
    filters = emptyFilters();
  }

  function toggleFilterDial(dial: 'genre' | 'decade') {
    filterDialPage = { ...filterDialPage, [dial]: 0 };
    expandedFilterDial = expandedFilterDial === dial ? null : dial;
  }

  function changeExpandedFilterPage(direction: -1 | 1) {
    if (!expandedFilterDial) return;
    const currentPage = filterDialPage[expandedFilterDial];
    const nextPage = currentPage + direction;
    if (nextPage < 0 || nextPage >= expandedFilterPageCount) return;
    filterDialPage = { ...filterDialPage, [expandedFilterDial]: nextPage };
  }

  function handleFilterTouchStart(event: TouchEvent) {
    filterTouchStartX = event.touches[0]?.clientX ?? null;
  }

  function handleFilterTouchEnd(event: TouchEvent) {
    if (filterTouchStartX === null) return;
    const touchEndX = event.changedTouches[0]?.clientX ?? filterTouchStartX;
    const deltaX = touchEndX - filterTouchStartX;
    if (Math.abs(deltaX) > 36) {
      changeExpandedFilterPage(deltaX < 0 ? 1 : -1);
    }
    filterTouchStartX = null;
  }

  function handleKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const isInteractive = target
      ? ['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT'].includes(target.tagName) || target.isContentEditable
      : false;
    if (event.code === 'Space' && activeState.status === 'loaded' && !isInteractive) {
      event.preventDefault();
      void rollNext();
    }
  }
</script>

<svelte:head>
  <title>Turntable Station</title>
  <meta
    name="description"
    content="Load a public stash, roll a random album, and keep the music moving."
  />
  <meta property="og:title" content="Turntable Station" />
  <meta
    property="og:description"
    content="Load a public stash, roll a random album, and keep the music moving."
  />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="page">
  <div class="grain"></div>
  <main class="shell">
    <section class="hero">
      <div class="shop-sign panel">
        <div class="sign-ornament left">
          <button
            type="button"
            class:off={!powerOn}
            class="power-button"
            aria-label={powerOn ? 'Turn header power off' : 'Turn header power on'}
            aria-pressed={powerOn}
            onclick={togglePower}
          ></button>
          <span class="control-label">Power</span>
        </div>
        <div class="marquee-copy">
          <div class="brand-block">
            <h1 class:powered={powerOn}>Turntable Station</h1>
          </div>
          <div class="receiver-divider" aria-hidden="true"></div>
          <div class="radio-scale" style={`--tuner-position:${tunerPosition}%`} aria-hidden="true">
            <div class="band-row">
              <span class="band-label">FM</span>
              <span>88</span>
              <span>92</span>
              <span>96</span>
              <span>100</span>
              <span>104</span>
              <span>108</span>
              <span class="frequency-spacer"></span>
              <span class="band-unit">MHz</span>
            </div>
            <div class="band-row">
              <span class="band-label">AM</span>
              <span>530</span>
              <span>600</span>
              <span>700</span>
              <span>800</span>
              <span>1000</span>
              <span>1200</span>
              <span>1600</span>
              <span class="band-unit">kHz</span>
            </div>
          </div>
        </div>
        <div class="sign-ornament right">
          <button
            type="button"
            class="tuning-knob"
            aria-label="Nudge tuner"
            style={`--knob-angle:${tuningKnobAngle}deg`}
            onclick={nudgeTuner}
          ></button>
          <span class="control-label">Tuning</span>
        </div>
      </div>
    </section>

    <section class="grid">
      <section class="panel player-panel turntable-panel">
        <article class="album-card">
          <div class="album-display">
            <div class:is-rolling={rollingSelection} class="album-stage">
              <div class:has-art={Boolean(currentPick?.coverImageUrl) && !artLoading} class="art-slot">
                {#if artLoading}
                  <VinylLoader size={340} active={true} />
                {:else if currentPick?.coverImageUrl}
                  <img
                    class="art-backdrop"
                    src={currentPick.coverImageUrl}
                    alt=""
                    aria-hidden="true"
                  />
                  <img
                    class="cover-art"
                    src={currentPick.coverImageUrl}
                    alt={`Cover art for ${currentPick.title}`}
                  />
                {:else}
                  <VinylLoader size={340} />
                {/if}
              </div>
            </div>
          </div>

          <div class="album-copy lcd-copy">
            {#if activeState.status === 'idle'}
              <h3>No stash loaded</h3>
              <p class="artist">Pick one from the right-side crate to wake the platter.</p>
            {:else if artLoading}
              <div class="pick-reveal loading-placeholder">
                <h3>{displayedTitle || currentPick?.title || 'Loading cover art'}</h3>
                <p class="artist">{displayedArtist || currentPick?.artist || 'Hold tight'}</p>
              </div>
            {:else if currentPick}
              {#key currentPick.id}
                <div class="pick-reveal">
                  <h3 in:fly={{ y: 12, duration: 320 }}>{displayedTitle || currentPick.title}</h3>
                  <p class="artist" in:fly={{ y: 16, duration: 380, delay: 70 }}>
                    {displayedArtist || currentPick.artist}
                  </p>
                  <p class="meta" in:fade={{ duration: 320, delay: 120 }}>
                    {#if currentPick.year}{currentPick.year}{/if}
                    {#if currentPick.label} · {currentPick.label}{/if}
                    {#if currentPick.format} · {currentPick.format}{/if}
                  </p>
                </div>
              {/key}
            {:else}
              <h3>Nothing selected yet</h3>
              <p class="artist">Press Random or hit Space to reveal the next album.</p>
            {/if}

            {#if restoringMessage}
              <p class="status-note">{restoringMessage}</p>
            {/if}
          </div>
        </article>
      </section>

      <div class="queue-column">
        <button class="random-button" onclick={rollNext} disabled={activeState.status !== 'loaded' || filteredAlbums.length === 0 || rollingSelection}>
          {#if rollingSelection}
            <rolling-dice size="34" duration="500"></rolling-dice>
          {:else}
            Random
          {/if}
        </button>

        <aside class="panel queue-panel">
          <div class="panel-header">
          </div>

          {#if !databaseAvailable}
            <p class="status-error">
              Database connection is not configured yet. Set `DATABASE_URL` and `DATABASE_URL_UNPOOLED`
              to enable the public stash feed.
            </p>
          {/if}

          <section class="history queue-section">
            <div class="queue-section-header">
              <h3>Recent Picks</h3>
            </div>
            {#if recentHistory.length === 0}
              <p class="status-note">No picks yet.</p>
            {:else}
              <div class="history-list">
                {#each recentHistory.slice(1, 6) as album, index}
                  <div class="history-item">
                    <div class="history-index">{index + 1}</div>
                    <div class="history-art">
                      {#if album.coverImageUrl}
                        <img src={album.coverImageUrl} alt={`Cover art for ${album.title}`} />
                      {:else}
                        <VinylLoader size={48} active={true} />
                      {/if}
                    </div>
                    <div class="history-copy">
                      <strong>{album.title}</strong>
                      <span>{album.artist}</span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </section>
        </aside>
      </div>
    </section>

    <section class="bottom-strip panel">
      <section class="bottom-panel crate-panel queue-section bottom-stashes">
        <div class="queue-section-header">
          <h3>{activeState.status === 'loaded' ? 'Loaded Stash' : 'Available Stashes'}</h3>
          {#if activeState.status === 'loaded'}
            <div class="filter-actions stash-panel-actions">
              <button class="text-button" type="button" onclick={unloadStash}>Clear</button>
            </div>
          {:else}
            <span>{stashes.length} loaded into the room</span>
          {/if}
        </div>

        {#if activeState.status === 'loaded' && activeStashSummary}
          <div class="crate-feed loaded-crate-feed">
            <article class="stash-card record-card highlighted loaded-stash-card">
              <div class="stash-card-top">
                <div>
                  <h3>{activeStashSummary.name}</h3>
                  <p>{activeStashSummary.albumCount} albums loaded into the receiver</p>
                </div>
                <span class="loaded-indicator">Live</span>
              </div>
            </article>
          </div>
        {:else if stashes.length === 0}
          <div class="empty-state">
            <h3>No public stashes yet</h3>
            <p>Upload the first stack below.</p>
          </div>
        {:else}
          <div class="crate-feed">
            {#each stashes as stash}
              <article class:highlighted={highlightedStashId === stash.id} class="stash-card record-card">
                <div class="stash-card-top">
                  <div>
                    <h3>{stash.name}</h3>
                    <p>{stash.albumCount} albums · {formatStashTimestamp(stash.createdAt)}</p>
                  </div>
                  <button class="load-button" onclick={() => loadStash(stash.id)}>Load Stash</button>
                </div>
              </article>
            {/each}
          </div>
        {/if}
      </section>

      <section class="bottom-panel source-panel">
        <div class="queue-section-header">
          <h3>Source</h3>
        </div>

        <form onsubmit={submitUpload} class="upload-form compact-upload">
          <label>
            <span>Stash Name</span>
            <input bind:value={stashName} maxlength="100" placeholder="Collection Name" />
          </label>

          <label>
            <span>CSV File</span>
            <input id="stash-file" type="file" accept=".csv,text/csv" onchange={handleFileChange} />
          </label>

          <div class="source-status">
            {#if preview}
              <p class="status-note">
                Found {preview.validAlbums} valid albums, {preview.skippedRows} rows skipped.
              </p>
            {/if}

            {#if uploadError}
              <p class="status-error">{uploadError}</p>
            {/if}

            {#if uploadSuccess}
              <p class="status-success">{uploadSuccess}</p>
            {/if}
          </div>

          <div class="source-actions">
            <button type="submit" disabled={pendingUpload || !preview || preview.validAlbums === 0}>
              {pendingUpload ? 'Uploading...' : 'Upload Stash'}
            </button>
            {#if pendingUpload}
              <div class="pending-inline">
                <VinylLoader size={30} active={true} />
              </div>
            {/if}
          </div>
        </form>
      </section>

      <section class="bottom-panel filter-panel">
        {#if activeState.status === 'loaded'}
          <div class="selector-bank">
            <div class="selector-bank-head">
              <div>
                <h3>Filters</h3>
              </div>
              <div class="filter-actions">
                {#if activeFilterTags.length > 0}
                  <button class="text-button" onclick={clearFilters}>Clear</button>
                {/if}
                {#if expandedFilterDial}
                  <button class="text-button" onclick={() => (expandedFilterDial = null)}>
                    Back To Filters
                  </button>
                {/if}
              </div>
            </div>

            {#if expandedFilterDial === null}
              <div class="selector-grid">
                <button class="selector-unit" onclick={() => toggleFilterDial('genre')}>
                  <span class="selector-label">Genre</span>
                  <span class="selector-knob selector-knob-genre" aria-hidden="true"></span>
                  <span class="selector-value">{selectedGenreLabel}</span>
                </button>

                <button class="selector-unit" onclick={() => toggleFilterDial('decade')}>
                  <span class="selector-label">Decade</span>
                  <span class="selector-knob selector-knob-decade" aria-hidden="true"></span>
                  <span class="selector-value">{selectedDecadeLabel}</span>
                </button>
              </div>
            {:else}
              <div
                class="filter-group compact-filter-group rotary-expanded-group"
                ontouchstart={handleFilterTouchStart}
                ontouchend={handleFilterTouchEnd}
              >
                <div class="rotary-expanded-head">
                  <h4>{expandedFilterDial}</h4>
                  {#if expandedFilterOptions.length > 4}
                    <div class="rotary-pagination">
                      <button
                        class="rotary-nav"
                        onclick={() => changeExpandedFilterPage(-1)}
                        disabled={(expandedFilterDial ? filterDialPage[expandedFilterDial] : 0) === 0}
                        aria-label="Previous filter options"
                      >
                        ←
                      </button>
                      <span class="rotary-page-indicator">
                        {(expandedFilterDial ? filterDialPage[expandedFilterDial] : 0) + 1}/{expandedFilterPageCount}
                      </span>
                      <button
                        class="rotary-nav"
                        onclick={() => changeExpandedFilterPage(1)}
                        disabled={(expandedFilterDial ? filterDialPage[expandedFilterDial] : 0) >= expandedFilterPageCount - 1}
                        aria-label="Next filter options"
                      >
                        →
                      </button>
                    </div>
                  {/if}
                </div>
                <div class="rotary-option-grid">
                  {#each expandedFilterPageOptions as option, index}
                    <button
                      class:rotary-option-active={filters[expandedFilterDial].includes(option)}
                      class="rotary-option"
                      style={`--option-angle:${-18 + index * 12}deg;`}
                      onclick={() => toggleFilter(expandedFilterDial, option)}
                    >
                      <span class="rotary-option-knob" aria-hidden="true"></span>
                      <span class="rotary-option-label">{option}</span>
                    </button>
                  {/each}
                </div>
                {#if expandedFilterOptions.length > 4}
                  <p class="rotary-swipe-hint">Swipe or use arrows to browse more options.</p>
                {/if}
              </div>
            {/if}

            {#if activeFilterTags.length > 0}
              <div class="active-filter-tags">
                {#each activeFilterTags as tag}
                  <span class="active-filter-chip">{tag}</span>
                {/each}
              </div>
            {/if}
          </div>
        {:else}
          <div class="selector-bank">
            <div class="selector-bank-head">
              <div>
                <h3>Filters</h3>
                <p class="filter-summary">Load a stash to activate genre and decade filters.</p>
              </div>
            </div>
          </div>
        {/if}
      </section>
    </section>
  </main>
</div>

<style>
  :global(html) {
    color-scheme: dark;
  }

  :global(:root) {
    --color-bg: #1a120d;
    --color-surface: #5f391b;
    --color-accent: #d45d3a;
    --color-paper: #f3ddb0;
    --color-muted: #b09169;
    --color-text: #f7ead0;
    --color-text-muted: #dbc8a4;
    --color-border: #8b6138;
    --color-danger: #bf5a38;
    --font-display: "Oswald", sans-serif;
    --font-body: "Bitter", serif;
    --font-ui: "Satoshi", "Avenir Next", "Helvetica Neue", sans-serif;
    --shadow-panel: 0 18px 30px rgba(0, 0, 0, 0.28);
  }

  :global(body) {
    margin: 0;
    min-height: 100vh;
    color: var(--color-text);
    font-family: var(--font-body);
    background:
      linear-gradient(180deg, rgba(255, 232, 187, 0.06), transparent 18%),
      linear-gradient(90deg, rgba(71, 31, 14, 0.16), rgba(120, 60, 27, 0.08) 16%, rgba(66, 29, 15, 0.14) 33%, rgba(116, 56, 26, 0.08) 52%, rgba(68, 31, 16, 0.14) 72%, rgba(112, 53, 24, 0.08) 100%),
      linear-gradient(180deg, #7b311b 0%, #6a2917 24%, #5b2415 48%, #4a1d12 72%, #38160e 100%);
  }

  .page {
    position: relative;
    overflow-x: hidden;
    min-height: 100vh;
  }

  .page::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at center, transparent 52%, rgba(0, 0, 0, 0.24) 100%),
      linear-gradient(180deg, rgba(255, 235, 203, 0.04), rgba(22, 9, 5, 0.12));
    opacity: 0.72;
  }

  .page::after {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(180deg, transparent 0 31.8%, rgba(37, 15, 8, 0.18) 32%, rgba(163, 103, 63, 0.08) 32.3%, transparent 32.6%, transparent 65.6%, rgba(37, 15, 8, 0.18) 65.8%, rgba(163, 103, 63, 0.08) 66.1%, transparent 66.4%),
      radial-gradient(120% 18% at 50% 10%, rgba(54, 19, 9, 0.26), transparent 70%),
      radial-gradient(120% 18% at 50% 54%, rgba(54, 19, 9, 0.22), transparent 70%);
    opacity: 0.72;
  }

  .grain {
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0.16;
    background-image:
      repeating-linear-gradient(
        180deg,
        rgba(43, 17, 8, 0.12) 0 2px,
        rgba(126, 63, 29, 0.04) 2px 5px,
        rgba(41, 15, 8, 0.1) 5px 7px,
        transparent 7px 13px
      ),
      radial-gradient(36% 6% at 18% 14%, rgba(48, 15, 7, 0.3), transparent 70%),
      radial-gradient(28% 5% at 66% 22%, rgba(61, 21, 10, 0.24), transparent 72%),
      radial-gradient(32% 6% at 42% 58%, rgba(48, 15, 7, 0.28), transparent 72%),
      radial-gradient(30% 5% at 78% 76%, rgba(62, 22, 10, 0.24), transparent 72%);
    background-size: 100% 16px, 100% 100%, 100% 100%, 100% 100%, 100% 100%;
    mix-blend-mode: multiply;
  }

  .shell {
    position: relative;
    z-index: 1;
    max-width: 1540px;
    margin: 0 auto;
    padding: 20px 16px 40px;
  }

  .panel {
    position: relative;
    padding: 18px;
    border-radius: 24px;
    border: 2px solid rgba(54, 26, 14, 0.78);
    background:
      linear-gradient(180deg, rgba(255, 236, 196, 0.05), transparent 18%),
      linear-gradient(135deg, #7a4a24 0%, #5f381b 30%, #4a2814 65%, #6f4522 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 232, 187, 0.18),
      inset 0 -1px 0 rgba(38, 18, 10, 0.45),
      var(--shadow-panel);
  }

  .panel::after {
    content: "";
    position: absolute;
    inset: 10px;
    border-radius: 16px;
    border: 1px solid rgba(255, 217, 153, 0.08);
    pointer-events: none;
  }

  .hero {
    margin-bottom: 10px;
  }

  .shop-sign {
    min-height: 64px;
    display: grid;
    grid-template-columns: 82px minmax(0, 1fr) 74px;
    align-items: center;
    padding: 6px 8px;
    overflow: hidden;
    background:
      radial-gradient(90% 120% at 50% -55%, rgba(255, 255, 255, 0.66), transparent 44%),
      repeating-linear-gradient(
        0deg,
        rgba(255, 255, 255, 0.18) 0 1px,
        rgba(92, 86, 78, 0.13) 1px 2px,
        rgba(255, 255, 255, 0.05) 2px 4px
      ),
      linear-gradient(180deg, #ebe7de 0%, #d2cbc0 18%, #aaa297 49%, #c7c0b5 76%, #f0ece4 100%);
    border: 1px solid rgba(38, 30, 23, 0.82);
    border-radius: 10px;
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.72),
      inset 0 -3px 5px rgba(34, 28, 22, 0.34),
      inset 0 0 0 1px rgba(255, 255, 255, 0.24),
      0 14px 22px rgba(22, 10, 5, 0.16);
  }

  .sign-ornament {
    position: relative;
    overflow: hidden;
    display: grid;
    gap: 3px;
    place-items: center;
    align-content: center;
    min-height: 48px;
    padding-top: 1px;
  }

  .sign-ornament::before,
  .sign-ornament::after {
    content: "";
    position: absolute;
    pointer-events: none;
  }

  .sign-ornament::before {
    width: 6px;
    aspect-ratio: 1;
    top: 5px;
    left: 6px;
    border-radius: 999px;
    background:
      radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.78), transparent 26%),
      radial-gradient(circle, #8a8073 0%, #312b25 82%);
    box-shadow:
      inset 0 1px 1px rgba(255, 255, 255, 0.5),
      0 1px 2px rgba(0, 0, 0, 0.42);
  }

  .sign-ornament::after {
    width: 6px;
    aspect-ratio: 1;
    bottom: 5px;
    left: 6px;
    border-radius: 999px;
    background:
      radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.78), transparent 26%),
      radial-gradient(circle, #8a8073 0%, #312b25 82%);
    box-shadow:
      inset 0 1px 1px rgba(255, 255, 255, 0.5),
      0 1px 2px rgba(0, 0, 0, 0.42);
  }

  .sign-ornament.right::before,
  .sign-ornament.right::after {
    left: auto;
    right: 6px;
  }

  .power-button {
    appearance: none;
    -webkit-appearance: none;
    border: 0;
    cursor: pointer;
    position: relative;
    z-index: 1;
    width: 23px;
    aspect-ratio: 1;
    border-radius: 999px;
    background:
      radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.92), transparent 18%),
      repeating-conic-gradient(from 28deg, rgba(255, 255, 255, 0.22) 0 5deg, rgba(64, 58, 51, 0.14) 5deg 10deg),
      radial-gradient(circle, #d5cec1 0%, #a69d90 54%, #403830 100%);
    border: 1px solid rgba(51, 43, 35, 0.58);
    box-shadow:
      inset 0 2px 2px rgba(255, 255, 255, 0.58),
      inset 0 -4px 5px rgba(0, 0, 0, 0.34),
      0 2px 4px rgba(0, 0, 0, 0.26);
  }

  .power-button:hover,
  .power-button:focus-visible,
  .tuning-knob:hover,
  .tuning-knob:focus-visible {
    transform: translateY(-1px);
    outline: none;
  }

  .power-button:active,
  .tuning-knob:active {
    transform: translateY(0);
  }

  .power-button::after {
    content: "";
    position: absolute;
    right: -13px;
    top: -13px;
    width: 5px;
    aspect-ratio: 1;
    border-radius: 999px;
    background: #d55f32;
    box-shadow: 0 0 10px rgba(213, 95, 50, 0.75);
  }

  .power-button.off::after {
    background: rgba(112, 89, 77, 0.64);
    box-shadow: none;
  }

  .tuning-knob {
    appearance: none;
    -webkit-appearance: none;
    border: 1px solid rgba(39, 32, 26, 0.72);
    cursor: pointer;
    position: relative;
    z-index: 1;
    width: 38px;
    aspect-ratio: 1;
    border-radius: 999px;
    background:
      radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.86), transparent 16%),
      repeating-conic-gradient(from 20deg, rgba(255, 255, 255, 0.28) 0 4deg, rgba(80, 72, 62, 0.2) 4deg 9deg),
      radial-gradient(circle, #efe8d7 0%, #c4b9a5 42%, #756b5f 70%, #24201c 100%);
    box-shadow:
      inset 0 2px 2px rgba(255, 255, 255, 0.62),
      inset 0 -5px 8px rgba(0, 0, 0, 0.42),
      0 0 0 4px rgba(48, 41, 35, 0.36),
      0 5px 9px rgba(0, 0, 0, 0.28);
    transition:
      transform 360ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 180ms ease;
  }

  .tuning-knob::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 5px;
    width: 2px;
    height: 11px;
    transform: translateX(-50%) rotate(var(--knob-angle, 18deg));
    transform-origin: 50% 14px;
    border-radius: 999px;
    background: #2d251f;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2);
    transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .control-label {
    position: relative;
    z-index: 1;
    color: #3b342c;
    font-family: var(--font-display);
    font-size: 0.39rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
    line-height: 1;
  }

  .marquee-copy {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(195px, 0.95fr) 1px minmax(292px, 1.05fr);
    align-items: center;
    gap: 16px;
    margin: 0;
    padding: 1px 13px 0;
    min-height: 48px;
    text-align: left;
  }

  .marquee-copy::before,
  .marquee-copy::after {
    display: none;
  }

  .brand-block {
    display: grid;
    justify-items: center;
    align-items: center;
    gap: 0;
  }

  .receiver-divider {
    align-self: stretch;
    width: 1px;
    background:
      linear-gradient(180deg, transparent, rgba(45, 38, 31, 0.52) 22%, rgba(45, 38, 31, 0.52) 78%, transparent);
    box-shadow: 1px 0 0 rgba(255, 255, 255, 0.32);
  }

  .radio-scale {
    position: relative;
    width: 100%;
    display: grid;
    gap: 4px;
    align-self: center;
    margin: 0;
    padding: 3px 0;
    color: #1f1b17;
    font-family: var(--font-body);
    font-size: clamp(0.44rem, 0.6vw, 0.56rem);
    letter-spacing: 0.04em;
  }

  .radio-scale::before {
    content: "";
    position: absolute;
    left: var(--tuner-position, 58%);
    top: 1px;
    width: 2px;
    height: 34px;
    background: #8e2e24;
    box-shadow: 0 0 3px rgba(142, 46, 36, 0.35);
    transition:
      left 560ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 180ms ease;
  }

  .radio-scale::after {
    display: none;
  }

  .band-row {
    position: relative;
    display: grid;
    grid-template-columns: 26px repeat(7, minmax(0, 1fr)) 32px;
    align-items: end;
    gap: 7px;
    padding-top: 8px;
    border-top: 1px solid rgba(34, 29, 24, 0.55);
  }

  .band-row::before {
    content: "";
    position: absolute;
    left: 33px;
    right: 36px;
    top: 3px;
    height: 7px;
    background:
      repeating-linear-gradient(
        90deg,
        rgba(34, 29, 24, 0.62) 0 1px,
        transparent 1px 5.25%
      );
    opacity: 0.86;
  }

  .band-label,
  .band-unit {
    font-family: var(--font-display);
    font-size: 0.72em;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .band-row span {
    text-align: center;
    white-space: nowrap;
  }

  .frequency-spacer {
    visibility: hidden;
  }

  h1 {
    color: transparent;
    -webkit-text-stroke: 0.75px rgba(25, 20, 17, 0.92);
    font-size: clamp(1.24rem, 2.32vw, 2.25rem);
    line-height: 0.86;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    text-shadow:
      0 1px 0 rgba(255, 255, 255, 0.22),
      0 -1px 0 rgba(0, 0, 0, 0.08);
    transition:
      -webkit-text-stroke-color 180ms ease,
      color 180ms ease,
      text-shadow 180ms ease,
      opacity 180ms ease;
  }

  h1.powered {
    color: transparent;
    -webkit-text-stroke: 0.7px rgb(212, 58, 58);
    animation: title-powered-pulse 2.8s ease-in-out infinite;
    text-shadow:
      0 0 1px rgba(212, 58, 58, 0.95),
      0 0 7px rgba(212, 58, 58, 0.42),
      0 0 5px rgba(240, 210, 255, 0.74),
      0 0 12px rgba(193, 118, 255, 0.5),
      0 0 20px rgba(148, 66, 255, 0.26),
      0 1px 0 rgba(0, 0, 0, 0.18);
  }

  .power-button:not(.off)::after {
    animation: power-indicator-pulse 1.9s ease-in-out infinite;
  }

  @keyframes title-powered-pulse {
    0%,
    100% {
      opacity: 0.96;
      text-shadow:
        0 0 1px rgba(212, 58, 58, 0.95),
        0 0 7px rgba(212, 58, 58, 0.42),
        0 0 5px rgba(240, 210, 255, 0.74),
        0 0 12px rgba(193, 118, 255, 0.5),
        0 0 20px rgba(148, 66, 255, 0.26),
        0 1px 0 rgba(0, 0, 0, 0.18);
    }
    50% {
      opacity: 1;
      text-shadow:
        0 0 1px rgba(212, 58, 58, 0.95),
        0 0 8px rgba(212, 58, 58, 0.48),
        0 0 6px rgba(240, 210, 255, 0.8),
        0 0 14px rgba(193, 118, 255, 0.56),
        0 0 24px rgba(148, 66, 255, 0.3),
        0 1px 0 rgba(0, 0, 0, 0.18);
    }
  }

  @keyframes power-indicator-pulse {
    0%,
    100% {
      box-shadow: 0 0 8px rgba(213, 95, 50, 0.52);
      opacity: 0.84;
    }
    50% {
      box-shadow: 0 0 12px rgba(213, 95, 50, 0.82);
      opacity: 1;
    }
  }

  @media (max-width: 900px) {
    .shop-sign {
      grid-template-columns: 54px minmax(0, 1fr) 58px;
      min-height: 60px;
    }

    .marquee-copy {
      grid-template-columns: minmax(158px, 0.9fr) 1px minmax(225px, 1.1fr);
      gap: 10px;
      padding-inline: 9px;
    }

    h1 {
      font-size: clamp(1.05rem, 2.25vw, 1.65rem);
    }

  }

  @media (max-width: 680px) {
    .shop-sign {
      grid-template-columns: 30px minmax(0, 1fr) 32px;
      min-height: 50px;
      gap: 2px;
      padding: 4px;
    }

    .power-button {
      width: 17px;
    }

    .tuning-knob {
      width: 22px;
    }

    .control-label {
      display: none;
    }

    .marquee-copy {
      grid-template-columns: minmax(0, 1fr);
      gap: 4px;
      margin: 0 2px;
      padding: 4px 5px;
      text-align: center;
    }

    .receiver-divider {
      display: none;
    }

    .radio-scale {
      width: 100%;
      font-size: 0.33rem;
    }

    .band-row {
      gap: 3px;
      grid-template-columns: 16px repeat(7, minmax(0, 1fr)) 18px;
      padding-top: 5px;
    }

    .band-row::before {
      left: 18px;
      right: 19px;
    }

    h1 {
      font-size: clamp(0.74rem, 3.5vw, 0.98rem);
      letter-spacing: 0.07em;
    }
  }

  h1,
  h2,
  h3,
  h4 {
    margin: 0;
    font-family: var(--font-display);
  }

  h2 {
    font-size: 1.6rem;
  }

  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(360px, 0.95fr);
    gap: 16px;
    align-items: stretch;
    margin-bottom: 16px;
  }

  .queue-column {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 14px;
    align-items: stretch;
  }

  .player-panel,
  .queue-panel,
  .bottom-strip {
    overflow: hidden;
  }

  .player-panel {
    background:
      linear-gradient(180deg, rgba(255, 238, 200, 0.05), transparent 12%),
      linear-gradient(135deg, #6f4220 0%, #432310 100%);
  }

  .queue-panel {
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    gap: 10px;
    background:
      linear-gradient(180deg, rgba(255, 241, 210, 0.06), transparent 12%),
      linear-gradient(135deg, #63381c 0%, #412312 100%);
    border-color: rgba(255, 228, 177, 0.06);
    box-shadow:
      inset 0 1px 0 rgba(255, 237, 201, 0.09),
      inset 0 -1px 0 rgba(18, 8, 5, 0.2),
      0 12px 20px rgba(23, 10, 6, 0.14);
  }

  .panel-header,
  .filters-head,
  .queue-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .queue-section-header span {
    color: #d2b994;
    font-size: 0.9rem;
  }

  .queue-section-header h3,
  .selector-bank-head h3 {
    font-size: 1.02rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #f0d7a2;
  }

  .album-card {
    display: grid;
    grid-template-rows: minmax(572px, 1fr) auto;
    gap: 18px;
  }

  .album-display {
    position: relative;
    min-height: 572px;
    border-radius: 20px;
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba(255, 244, 220, 0.08), transparent 12%),
      linear-gradient(180deg, #2d1c12 0%, #160e09 100%);
    border: 1px solid rgba(255, 233, 198, 0.1);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      inset 0 -1px 0 rgba(0, 0, 0, 0.28);
  }

  .album-stage {
    position: absolute;
    inset: 18px;
    display: grid;
    place-items: center;
    padding: 12px;
    border-radius: 14px;
    background:
      radial-gradient(circle at 50% 42%, rgba(129, 233, 161, 0.16), transparent 34%),
      linear-gradient(180deg, rgba(190, 255, 210, 0.06), transparent 12%),
      linear-gradient(180deg, #394147 0%, #2b3238 18%, #171c20 100%);
    border: 1px solid rgba(167, 190, 177, 0.11);
    box-shadow:
      inset 0 1px 0 rgba(237, 255, 243, 0.08),
      inset 0 -1px 0 rgba(10, 13, 15, 0.44),
      inset 0 0 0 1px rgba(78, 91, 87, 0.14),
      0 0 18px rgba(70, 168, 101, 0.06);
    transition:
      background 220ms ease,
      box-shadow 220ms ease,
      border-color 220ms ease,
      transform 220ms ease;
  }

  .album-stage.is-rolling {
    background:
      radial-gradient(circle at 50% 42%, rgba(255, 112, 112, 0.24), transparent 34%),
      radial-gradient(circle at 50% 50%, rgba(255, 169, 90, 0.14), transparent 54%),
      linear-gradient(180deg, rgba(255, 220, 190, 0.08), transparent 12%),
      linear-gradient(180deg, #463535 0%, #342425 18%, #1f1718 100%);
    border-color: rgba(255, 176, 132, 0.24);
    box-shadow:
      inset 0 1px 0 rgba(255, 241, 230, 0.12),
      inset 0 -1px 0 rgba(20, 12, 12, 0.46),
      inset 0 0 0 1px rgba(126, 78, 67, 0.24),
      0 0 18px rgba(255, 120, 70, 0.2),
      0 0 42px rgba(212, 58, 58, 0.18);
    transform: scale(1.008);
  }

  .art-slot {
    position: relative;
    width: min(78vw, 510px);
    aspect-ratio: 1;
    border-radius: 16px;
    display: grid;
    place-items: center;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 42%, rgba(133, 232, 162, 0.2), transparent 44%),
      linear-gradient(180deg, rgba(233, 255, 238, 0.1), transparent 8%),
      linear-gradient(180deg, #15201a 0%, #0a0f0d 100%);
    border: 4px solid rgba(136, 149, 142, 0.5);
    box-shadow:
      inset 0 0 0 1px rgba(18, 28, 24, 0.52),
      inset 0 0 24px rgba(98, 198, 124, 0.1),
      0 8px 16px rgba(0, 0, 0, 0.18);
  }

  .art-slot.has-art {
    background:
      radial-gradient(circle at 50% 50%, rgba(129, 233, 161, 0.16), transparent 52%),
      linear-gradient(180deg, #0d1512 0%, #070b09 100%);
  }

  .art-slot .cover-art {
    position: relative;
    z-index: 2;
    width: min(88%, 450px);
    height: min(88%, 450px);
    object-fit: cover;
    border-radius: 10px;
    box-shadow:
      0 18px 34px rgba(0, 0, 0, 0.38),
      0 0 0 1px rgba(255, 244, 218, 0.22);
  }

  .art-backdrop {
    position: absolute;
    inset: -12%;
    z-index: 1;
    width: 124%;
    height: 124%;
    object-fit: cover;
    filter: blur(24px) saturate(1.08) brightness(0.62);
    opacity: 0.78;
    transform: scale(1.04);
  }

  .art-slot::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
      radial-gradient(circle at 50% 50%, transparent 0 42%, rgba(5, 9, 7, 0.34) 72%),
      linear-gradient(180deg, rgba(132, 225, 151, 0.1), transparent 34%, rgba(0, 0, 0, 0.18));
  }

  .art-slot :global(.record-loader) {
    position: relative;
    z-index: 2;
  }

  .lcd-copy {
    display: grid;
    gap: 4px;
    min-height: 170px;
    padding: 18px;
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255, 251, 237, 0.28), transparent 8%),
      linear-gradient(180deg, #f7e7bf 0%, #efd59e 100%);
    color: #382214;
    border: 1px solid rgba(104, 61, 28, 0.18);
  }

  .loading-dice {
    display: flex;
    align-items: center;
    min-height: 40px;
  }

  .pick-reveal {
    display: grid;
    gap: 2px;
  }

  .loading-placeholder {
    opacity: 0.92;
  }

  .lcd-copy h3 {
    font-size: clamp(1.3rem, 2.3vw, 1.9rem);
    line-height: 1.06;
    font-family: var(--font-ui);
    font-weight: 700;
    font-style: normal;
    letter-spacing: 0.01em;
    color: #2f1c10;
    margin-bottom: 0;
    text-align: left;
  }

  .artist {
    margin: 0;
    font-size: clamp(0.95rem, 1.72vw, 1.3rem);
    line-height: 1.05;
    font-family: var(--font-ui);
    font-weight: 500;
    letter-spacing: 0.01em;
    color: #633920;
    text-align: left;
  }

  .meta {
    margin: 0;
    color: #7d5c3d;
    font-size: 0.9rem;
  }

  .queue-section {
    display: grid;
    gap: 12px;
    padding: 16px;
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255, 230, 186, 0.06), transparent 10%),
      linear-gradient(180deg, #2e1a10 0%, #1a100a 100%);
    border: 1px solid rgba(255, 228, 177, 0.08);
  }

  .history.queue-section {
    gap: 12px;
    padding: 18px;
    border-radius: 22px;
    background:
      linear-gradient(180deg, rgba(255, 234, 193, 0.08), transparent 10%),
      linear-gradient(180deg, #312014 0%, #1b110b 100%);
    border-color: rgba(255, 228, 177, 0.06);
  }

  .crate-feed {
    position: relative;
    display: grid;
    gap: 12px;
    max-height: 520px;
    overflow: auto;
    padding: 20px 12px 12px;
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(37, 18, 11, 0.22), transparent 14%),
      linear-gradient(180deg, #261208 0%, #170b05 100%);
  }

  .stash-card {
    position: relative;
    padding: 18px 16px 14px;
    border-radius: 16px;
    color: #2d1e13;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.36), transparent 14%),
      linear-gradient(180deg, #f4dfb3 0%, #ecd19b 100%);
    border: 1px solid rgba(92, 58, 27, 0.18);
  }

  .stash-card.highlighted {
    border-color: rgba(212, 93, 58, 0.72);
    box-shadow: 0 0 0 2px rgba(212, 93, 58, 0.18);
  }

  .stash-card-top {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 10px;
  }

  .stash-card-top p {
    margin: 4px 0 0;
    color: rgba(70, 43, 22, 0.76);
    font-size: 0.9rem;
  }

  .load-button {
    align-self: start;
    min-width: 84px;
    padding: 12px 16px;
    border-radius: 14px;
    background:
      linear-gradient(180deg, #d96c43 0%, #bf512f 58%, #963721 100%);
    color: #fff0cf;
    box-shadow:
      inset 0 1px 0 rgba(255, 227, 183, 0.3),
      0 6px 12px rgba(122, 41, 18, 0.22);
  }

  .load-button:hover:not(:disabled) {
    transform: translateY(-1px) scale(1.02);
  }

  .history-list {
    display: grid;
    gap: 10px;
  }

  .history-item {
    display: grid;
    grid-template-columns: 18px 78px minmax(0, 1fr);
    align-items: center;
    gap: 14px;
    padding: 13px 14px;
    border-radius: 12px;
    background: rgba(149, 102, 58, 0.1);
    border: 1px solid rgba(255, 229, 187, 0.1);
  }

  .history-item {
    color: var(--color-paper);
    background:
      linear-gradient(180deg, rgba(255, 237, 205, 0.1), rgba(47, 22, 12, 0.24));
    border-color: rgba(255, 228, 177, 0.12);
    box-shadow:
      inset 0 1px 0 rgba(255, 241, 218, 0.06),
      0 4px 10px rgba(10, 4, 2, 0.08);
  }

  .history-item span {
    color: #d8bf97;
  }

  .history-index {
    color: rgba(241, 215, 157, 0.44);
    font-family: var(--font-display);
    font-size: 0.86rem;
    letter-spacing: 0.08em;
    text-align: center;
  }

  .history-art {
    width: 78px;
    height: 78px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba(255, 240, 207, 0.06), rgba(29, 13, 8, 0.34));
    box-shadow:
      inset 0 0 0 1px rgba(255, 228, 177, 0.08),
      0 4px 10px rgba(8, 3, 2, 0.12);
  }

  .history-art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .history-copy {
    display: grid;
    gap: 6px;
    min-width: 0;
  }

  .history-copy strong {
    font-size: 1.18rem;
    line-height: 1.12;
  }

  .history-copy span {
    font-size: 0.98rem;
    line-height: 1.08;
    color: #c8b08a;
  }

  .random-button {
    display: grid;
    place-items: center;
    min-height: 98px;
    padding: 20px 20px 22px;
    border-radius: 20px;
    border: 0;
    cursor: pointer;
    background:
      radial-gradient(circle at 50% 28%, #d43a3a 0%, #b6462a 55%, #8f1d1d 100%);
    color: #ffe6b7;
    font-family: var(--font-display);
    font-size: 2.42rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    box-shadow:
      inset 0 1px 0 rgba(255, 213, 161, 0.2),
      0 10px 18px rgba(86, 18, 8, 0.26);
  }

  .random-button:disabled {
    cursor: default;
  }

  .bottom-strip {
    display: grid;
    grid-template-columns: 420px minmax(320px, 1fr) minmax(300px, 1fr);
    gap: 16px;
    align-items: stretch;
    background:
      linear-gradient(180deg, rgba(255, 238, 200, 0.05), transparent 12%),
      linear-gradient(135deg, #6e3f1e 0%, #4d2b15 100%);
  }

  .bottom-panel {
    padding: 14px;
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(35, 16, 9, 0.18), transparent 14%),
      linear-gradient(180deg, #381f12 0%, #24150d 100%);
    border: 1px solid rgba(255, 228, 177, 0.08);
  }

  .bottom-stashes {
    max-height: 100%;
  }

  .bottom-stashes .crate-feed {
    max-height: 320px;
  }

  .loaded-crate-feed {
    max-height: none;
  }

  .loaded-stash-card {
    min-height: 116px;
    background:
      linear-gradient(90deg, rgba(130, 205, 102, 0.18), transparent 18%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.42), transparent 14%),
      linear-gradient(180deg, #f4dfb3 0%, #e7c98b 100%);
    border-color: rgba(108, 163, 77, 0.34);
    box-shadow:
      0 0 0 2px rgba(212, 93, 58, 0.14),
      0 14px 24px rgba(67, 28, 13, 0.12);
  }

  .stash-panel-actions {
    align-items: center;
  }

  .loaded-indicator {
    align-self: start;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 11px;
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(116, 166, 95, 0.2), rgba(49, 86, 40, 0.18));
    border: 1px solid rgba(168, 220, 144, 0.24);
    color: #315226;
    font-family: var(--font-display);
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.22),
      0 0 12px rgba(121, 198, 97, 0.12);
  }

  .loaded-indicator::before {
    content: "";
    width: 7px;
    aspect-ratio: 1;
    border-radius: 999px;
    background: #79c661;
    box-shadow: 0 0 8px rgba(121, 198, 97, 0.45);
  }

  .utility-panel {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
  }

  .wide-knob-panel {
    justify-content: space-evenly;
    padding-inline: 18px;
  }

  .utility-cluster span {
    color: #f1d89c;
    font-family: var(--font-display);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-size: 0.8rem;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
  }

  .utility-cluster {
    position: relative;
    display: grid;
    gap: 12px;
    justify-items: center;
    min-width: 96px;
    padding: 14px 10px 6px;
  }

  .utility-cluster::before {
    content: "";
    position: absolute;
    top: 4px;
    width: 94px;
    height: 94px;
    border-radius: 999px;
    background:
      repeating-conic-gradient(
        from -110deg,
        rgba(241, 216, 156, 0.95) 0deg 1.6deg,
        transparent 1.6deg 11deg
      );
    mask: radial-gradient(circle, transparent 0 32px, #000 33px 47px, transparent 48px);
    opacity: 0.72;
    pointer-events: none;
  }

  .knob {
    position: relative;
    z-index: 1;
    width: 78px;
    aspect-ratio: 1;
    border-radius: 999px;
    background:
      radial-gradient(circle at 34% 30%, rgba(255, 255, 255, 0.78), transparent 14%),
      repeating-radial-gradient(circle, rgba(84, 61, 40, 0.15) 0 2px, transparent 2px 6px),
      radial-gradient(circle, #f0e1c8 0%, #c7b091 46%, #735b45 72%, #241a13 100%);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.36),
      inset 0 -5px 8px rgba(52, 32, 17, 0.42),
      0 8px 16px rgba(0, 0, 0, 0.32),
      0 0 0 4px rgba(36, 23, 15, 0.72);
  }

  .knob::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 12px;
    width: 4px;
    height: 24px;
    border-radius: 999px;
    transform: translateX(-50%);
    background: linear-gradient(180deg, #2d1c10 0%, #8f5e25 100%);
    box-shadow: 0 0 0 1px rgba(255, 228, 177, 0.14);
  }

  .knob::after {
    content: "";
    position: absolute;
    inset: 20px;
    border-radius: 999px;
    border: 1px solid rgba(255, 247, 225, 0.24);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
  }

  .utility-cluster:first-child .knob {
    transform: rotate(34deg);
  }

  .utility-cluster:nth-child(2) .knob {
    transform: rotate(8deg);
  }

  .utility-cluster:last-child .knob {
    transform: rotate(16deg);
  }

  .utility-cluster:first-child::after,
  .utility-cluster:nth-child(2)::after,
  .utility-cluster:last-child::after {
    position: absolute;
    bottom: 32px;
    font-family: var(--font-display);
    font-size: 0.72rem;
    color: #f1d89c;
    letter-spacing: 0.12em;
    opacity: 0.8;
  }

  .utility-cluster:first-child::after {
    content: "MIN        MAX";
  }

  .utility-cluster:nth-child(2)::after,
  .utility-cluster:last-child::after {
    content: "−          +";
  }

  .source-panel,
  .filter-panel {
    display: grid;
    gap: 12px;
    align-content: start;
  }

  .selector-bank {
    display: grid;
    gap: 10px;
    padding: 14px;
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.24)),
      rgba(27, 13, 8, 0.3);
    border: 1px solid rgba(255, 225, 176, 0.12);
  }

  .selector-bank-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: start;
  }

  .filter-summary {
    margin: 2px 0 0;
    color: #d7be94;
    font-size: 0.84rem;
  }

  .selector-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .selector-unit {
    display: grid;
    justify-items: center;
    gap: 10px;
    padding: 14px 12px 16px;
    border-radius: 18px;
    text-transform: none;
    letter-spacing: 0.02em;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.26)),
      linear-gradient(180deg, #3a2013 0%, #21120c 100%);
    border: 1px solid rgba(255, 225, 176, 0.12);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.08),
      inset 0 -1px 0 rgba(0, 0, 0, 0.24);
  }

  .selector-label {
    color: #f1d79d;
    font-family: var(--font-display);
    font-size: 0.84rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .selector-value {
    min-height: 2.4em;
    display: grid;
    place-items: center;
    text-align: center;
    color: #f4e2bf;
    font-size: 0.95rem;
    line-height: 1.15;
  }

  .selector-knob {
    position: relative;
    width: 82px;
    aspect-ratio: 1;
    border-radius: 999px;
    background:
      radial-gradient(circle at 34% 30%, rgba(255, 255, 255, 0.78), transparent 14%),
      repeating-radial-gradient(circle, rgba(84, 61, 40, 0.15) 0 2px, transparent 2px 6px),
      radial-gradient(circle, #f0e1c8 0%, #c7b091 46%, #735b45 72%, #241a13 100%);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.36),
      inset 0 -5px 8px rgba(52, 32, 17, 0.42),
      0 8px 16px rgba(0, 0, 0, 0.32),
      0 0 0 4px rgba(36, 23, 15, 0.72);
  }

  .selector-knob::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 12px;
    width: 4px;
    height: 24px;
    border-radius: 999px;
    transform: translateX(-50%);
    background: linear-gradient(180deg, #2d1c10 0%, #8f5e25 100%);
    box-shadow: 0 0 0 1px rgba(255, 228, 177, 0.14);
  }

  .selector-knob::after {
    content: "";
    position: absolute;
    inset: -10px;
    border-radius: 999px;
    background:
      repeating-conic-gradient(
        from -110deg,
        rgba(241, 216, 156, 0.95) 0deg 1.6deg,
        transparent 1.6deg 11deg
      );
    mask: radial-gradient(circle, transparent 0 40px, #000 41px 47px, transparent 48px);
    opacity: 0.68;
    pointer-events: none;
  }

  .selector-knob-genre {
    transform: rotate(28deg);
  }

  .selector-knob-decade {
    transform: rotate(336deg);
  }

  .filter-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  .active-filter-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .active-filter-chip {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(241, 223, 183, 0.18), rgba(111, 60, 29, 0.32));
    border: 1px solid rgba(255, 228, 177, 0.14);
    color: #f5e2bc;
    font-size: 0.84rem;
  }

  .upload-form {
    display: grid;
    gap: 10px;
  }

  .compact-upload {
    margin-top: 4px;
  }

  label {
    display: grid;
    gap: 6px;
  }

  label span {
    color: #eedcb7;
    font-size: 0.92rem;
  }

  input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid rgba(255, 228, 177, 0.14);
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(248, 228, 190, 0.12), rgba(52, 23, 11, 0.32)),
      rgba(28, 13, 8, 0.72);
    color: var(--color-text);
    padding: 12px 14px;
    font: inherit;
  }

  button {
    border: 0;
    border-radius: 16px;
    cursor: pointer;
    padding: 12px 16px;
    font-family: var(--font-display);
    font-size: 0.95rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    transition: transform 140ms ease, opacity 140ms ease;
  }

  button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .source-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  .secondary,
  .chip,
  .text-button,
  .stash-card-top button {
    background:
      linear-gradient(180deg, #f1dfb7 0%, #dfc28b 100%);
    color: #3a210f;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
  }

  .text-button {
    padding: 8px 12px;
    border-radius: 999px;
  }

  .status-note,
  .status-success,
  .status-error {
    margin: 0;
    padding: 9px 12px 9px 14px;
    border-radius: 8px;
    font-size: 0.88rem;
    letter-spacing: 0.02em;
    border-left: 3px solid transparent;
  }

  .status-note {
    background:
      linear-gradient(90deg, rgba(250, 227, 178, 0.12), rgba(250, 227, 178, 0.05));
    color: #f3e2bc;
    border-left-color: rgba(243, 226, 188, 0.56);
  }

  .status-success {
    background:
      linear-gradient(90deg, rgba(116, 166, 95, 0.18), rgba(116, 166, 95, 0.07));
    color: #dceec9;
    border-left-color: rgba(180, 226, 159, 0.7);
  }

  .status-error {
    background:
      linear-gradient(90deg, rgba(184, 74, 49, 0.2), rgba(184, 74, 49, 0.08));
    color: #f8d1c5;
    border-left-color: rgba(255, 160, 138, 0.7);
  }

  .empty-state {
    padding: 18px;
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.06), rgba(31, 14, 8, 0.3));
    border: 1px dashed rgba(255, 225, 176, 0.18);
    color: var(--color-text-muted);
  }

  .pending-inline {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #f3e2bc;
  }

  .filter-group + .filter-group {
    margin-top: 14px;
  }

  .compact-filter-group {
    margin-top: 0;
    padding: 14px;
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(255, 228, 177, 0.06), rgba(24, 10, 6, 0.2));
    border: 1px solid rgba(255, 228, 177, 0.08);
  }

  .rotary-expanded-group {
    padding-top: 16px;
  }

  .rotary-expanded-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .rotary-expanded-group h4 {
    margin-bottom: 0;
  }

  .rotary-pagination {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .rotary-nav {
    min-width: 38px;
    padding: 8px 10px;
    border-radius: 999px;
    font-size: 1rem;
    line-height: 1;
  }

  .rotary-page-indicator {
    color: #e7d3ae;
    font-size: 0.82rem;
    letter-spacing: 0.08em;
  }

  .rotary-swipe-hint {
    margin: 10px 0 0;
    color: #cdb58d;
    font-size: 0.8rem;
  }

  .rotary-option-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .rotary-option {
    display: grid;
    justify-items: center;
    gap: 8px;
    padding: 10px 8px 12px;
    border-radius: 16px;
    text-transform: none;
    letter-spacing: 0.01em;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.06), rgba(31, 14, 8, 0.22)),
      linear-gradient(180deg, #321b11 0%, #1f120c 100%);
    border: 1px solid rgba(255, 225, 176, 0.1);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.06),
      inset 0 -1px 0 rgba(0, 0, 0, 0.22);
  }

  .rotary-option-knob {
    position: relative;
    width: 46px;
    aspect-ratio: 1;
    border-radius: 999px;
    transform: rotate(var(--option-angle, 0deg));
    background:
      radial-gradient(circle at 34% 30%, rgba(255, 255, 255, 0.78), transparent 14%),
      repeating-radial-gradient(circle, rgba(84, 61, 40, 0.15) 0 2px, transparent 2px 6px),
      radial-gradient(circle, #f0e1c8 0%, #c7b091 46%, #735b45 72%, #241a13 100%);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.34),
      inset 0 -4px 7px rgba(52, 32, 17, 0.4),
      0 6px 12px rgba(0, 0, 0, 0.28),
      0 0 0 3px rgba(36, 23, 15, 0.72);
  }

  .rotary-option-knob::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 8px;
    width: 3px;
    height: 12px;
    border-radius: 999px;
    transform: translateX(-50%);
    background: linear-gradient(180deg, #2d1c10 0%, #8f5e25 100%);
    box-shadow: 0 0 0 1px rgba(255, 228, 177, 0.12);
  }

  .rotary-option-label {
    min-height: 2.1em;
    display: grid;
    place-items: center;
    text-align: center;
    color: #f0ddb8;
    font-size: 0.76rem;
    line-height: 1.15;
  }

  .rotary-option-active {
    background:
      linear-gradient(180deg, rgba(217, 108, 67, 0.22), rgba(78, 24, 13, 0.28)),
      linear-gradient(180deg, #422015 0%, #24110b 100%);
    border-color: rgba(255, 201, 148, 0.28);
  }

  .rotary-option-active .rotary-option-knob {
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.34),
      inset 0 -4px 7px rgba(52, 32, 17, 0.4),
      0 0 0 3px rgba(36, 23, 15, 0.72),
      0 0 0 1px rgba(255, 206, 148, 0.38),
      0 8px 16px rgba(174, 78, 44, 0.22);
  }

  .rotary-option-active .rotary-option-label {
    color: #ffe8c3;
  }

  .filter-group h4 {
    color: #f1d79d;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.86rem;
    margin-bottom: 8px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .chip {
    border-radius: 999px;
    text-transform: none;
    letter-spacing: 0.01em;
  }

  .chip-active {
    background:
      linear-gradient(180deg, #d96c43 0%, #bb4d2f 100%);
    color: #ffe7c5;
  }

  @media (max-width: 1240px) {
    .grid {
      grid-template-columns: 1fr;
    }

    .bottom-strip {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 820px) {
    .selector-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 860px) {
    .shell {
      padding: 14px 12px 28px;
    }

    .queue-column {
      gap: 10px;
    }

    .queue-panel {
      gap: 8px;
    }

    .bottom-strip {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .art-slot {
      width: min(92vw, 520px);
    }

    .queue-section,
    .bottom-panel {
      padding: 14px;
    }

    .panel-header,
    .filters-head,
    .queue-section-header,
    .stash-card-top,
    .source-actions {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
