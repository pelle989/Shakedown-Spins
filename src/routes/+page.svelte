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
  let loadingStashId = $state<string | null>(null);
  let uploadError = $state<string | null>(null);
  let uploadSuccess = $state<string | null>(null);
  let stashNameError = $state<string | null>(null);
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
  let sourceCollapsed = $state(true);
  let availableStashesSection: HTMLElement | null = null;
  let highlightAvailableStashes = $state(false);
  let availableStashesHighlightTimeout: number | null = null;
  const stashTimestampFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
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
          createdAt: new Date().toISOString(),
          stashBadgeKey: '',
          stashPreview: []
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

    if (availableStashesHighlightTimeout) {
      window.clearTimeout(availableStashesHighlightTimeout);
      availableStashesHighlightTimeout = null;
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
    loadingStashId = stashId;
    try {
      const response = await fetch(`/api/stashes/${stashId}`);
      if (!response.ok) {
        restoringMessage =
          'That stash moved on. Only the newest 10 stashes survive, so browse the current feed below.';
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
    } finally {
      loadingStashId = null;
    }
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
    stashNameError = null;

    if (!stashName.trim()) {
      stashNameError = 'Stash name is required.';
      return;
    }

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
        if (payload.message === 'Stash name is required.') {
          stashNameError = payload.message;
          return;
        }
        uploadError = payload.message ?? 'Upload failed.';
        return;
      }

      await invalidate('/');
      stashes = [payload.stash, ...stashes.filter((stash) => stash.id !== payload.stash?.id)].slice(0, 10);
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

    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }

    try {
      await Promise.all([
        loadArt(result.pick),
        new Promise((resolve) => window.setTimeout(resolve, 650))
      ]);
    } finally {
      rollingSelection = false;
    }
  }

  function scrollToAvailableStashes() {
    highlightAvailableStashes = true;
    if (availableStashesHighlightTimeout) {
      window.clearTimeout(availableStashesHighlightTimeout);
    }
    availableStashesHighlightTimeout = window.setTimeout(() => {
      highlightAvailableStashes = false;
      availableStashesHighlightTimeout = null;
    }, 1800);
    availableStashesSection?.scrollIntoView({
      block: 'start',
      behavior: 'smooth'
    });
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
  <title>Shakedown Spins</title>
  <meta
    name="description"
    content="Load a public stash, roll a random album, and keep the music moving."
  />
  <meta property="og:title" content="Shakedown Spins" />
  <meta
    property="og:description"
    content="Load a public stash, roll a random album, and keep the music moving."
  />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="page">
  <div class="grain"></div>
  <main class="shell">
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
            <div class="lcd-main">
              {#if currentPick}
                {#key currentPick.id}
                  <div class:loading-placeholder={artLoading} class="pick-reveal">
                    <div class="readout-row" in:fade={{ duration: 220 }}>
                      <span class="readout-label">Album</span>
                      <h3 in:fly={{ y: 12, duration: 320 }}>
                        {displayedTitle || currentPick.title}
                      </h3>
                    </div>
                    <div class="readout-row" in:fade={{ duration: 260, delay: 60 }}>
                      <span class="readout-label">Artist</span>
                      <p class="artist" in:fly={{ y: 16, duration: 380, delay: 70 }}>
                        {displayedArtist || currentPick.artist}
                      </p>
                    </div>
                  </div>
                {/key}
              {:else if activeState.status === 'idle'}
                <div class="pick-reveal">
                  <button class="jump-to-stashes" type="button" onclick={scrollToAvailableStashes}>
                    Load a Stash
                  </button>
                </div>
              {:else}
                <div class="pick-reveal">
                  <div class="readout-row">
                    <span class="readout-label">Album</span>
                    <h3>Nothing selected yet</h3>
                  </div>
                  <div class="readout-row">
                    <span class="readout-label">Artist</span>
                    <p class="artist">Press Random or hit Space to reveal the next album.</p>
                  </div>
                </div>
              {/if}
            </div>

            {#if activeState.status !== 'idle'}
              <div class="meta-strip">
                <div class="meta-cell">
                  <span class="meta-label">Year</span>
                  <span class="meta-value">{currentPick?.year ?? '—'}</span>
                </div>
                <div class="meta-cell">
                  <span class="meta-label">Label</span>
                  <span class="meta-value">{currentPick?.label ?? '—'}</span>
                </div>
                <div class="meta-cell">
                  <span class="meta-label">Format</span>
                  <span class="meta-value">{currentPick?.format ?? '—'}</span>
                </div>
              </div>
            {/if}

            {#if restoringMessage}
              <p class="status-note">{restoringMessage}</p>
            {/if}
          </div>
        </article>
      </section>

      <div class="queue-column">
        <button
          class:random-button-idle={activeState.status === 'idle'}
          class="random-button"
          onclick={rollNext}
          disabled={activeState.status !== 'loaded' || filteredAlbums.length === 0 || rollingSelection}
        >
          <span class="random-button-content">
            {#if rollingSelection}
              <rolling-dice size="34" duration="500"></rolling-dice>
            {:else}
              Random
            {/if}
          </span>
        </button>

        <aside class="panel queue-panel">
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
                        <VinylLoader size={48} animated={false} />
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

      <section
        bind:this={availableStashesSection}
        class:bottom-stashes-highlighted={highlightAvailableStashes}
        class="bottom-panel crate-panel queue-section bottom-stashes"
      >
        <div class="queue-section-header">
          <h3>{activeState.status === 'loaded' ? 'Loaded Stash' : 'Available Stashes'}</h3>
          {#if activeState.status !== 'loaded'}
            <span>{stashes.length} loaded into the room</span>
          {/if}
        </div>

        {#if activeState.status === 'loaded' && activeStashSummary}
          <div class="crate-feed loaded-crate-feed">
            <span class="loaded-indicator">Live</span>
            <article class="stash-card record-card loaded-stash-card">
              <div class="stash-card-top">
                <div class="stash-card-heading">
                  <div>
                    <h3>{activeStashSummary.name}</h3>
                    <p>{activeStashSummary.albumCount} albums loaded into the receiver</p>
                  </div>
                </div>
                <div class="loaded-stash-actions">
                  <button class="load-button clear-stash-button" type="button" onclick={unloadStash}>Clear</button>
                </div>
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
            {#each stashes as stash, index}
              <article class="stash-card record-card">
                <div class="stash-card-top">
                  <div class="stash-card-heading">
                    <span class="stash-index">{index + 1}</span>
                    <div>
                      <h3>{stash.name}</h3>
                      <p>{stash.albumCount} albums · {formatStashTimestamp(stash.createdAt)}</p>
                    </div>
                  </div>
                  <button
                    class="load-button"
                    type="button"
                    disabled={loadingStashId === stash.id}
                    onclick={() => loadStash(stash.id)}
                  >
                    {loadingStashId === stash.id ? 'Loading...' : 'Load Stash'}
                  </button>
                </div>
              </article>
            {/each}
          </div>
        {/if}
      </section>

      <section class="bottom-panel source-panel">
        <div class="queue-section-header">
          <h3>Source</h3>
          <button class="text-button" type="button" onclick={() => (sourceCollapsed = !sourceCollapsed)}>
            {sourceCollapsed ? 'Open' : 'Close'}
          </button>
        </div>

        {#if !sourceCollapsed}
          <form onsubmit={submitUpload} class="upload-form compact-upload">
            <label class:field-error={!!stashNameError}>
              <span>Stash Name</span>
              <input
                bind:value={stashName}
                class:input-error={!!stashNameError}
                maxlength="100"
                placeholder="Collection Name"
                oninput={() => (stashNameError = null)}
              />
              {#if stashNameError}
                <p class="field-error-text">{stashNameError}</p>
              {/if}
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
              <button class="load-button upload-button" type="submit" disabled={pendingUpload || !preview || preview.validAlbums === 0}>
                {pendingUpload ? 'Uploading...' : 'Upload Stash'}
              </button>
              {#if pendingUpload}
                <div class="pending-inline">
                  <VinylLoader size={30} active={true} />
                </div>
              {/if}
            </div>
          </form>
        {:else}
          <p class="status-note source-collapsed-note">Open Source to upload a new stash.</p>
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
    background-attachment: fixed;
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
    opacity: 0.24;
    background-image:
      repeating-linear-gradient(
        90deg,
        rgba(86, 37, 19, 0.22) 0 3px,
        rgba(135, 70, 33, 0.1) 3px 8px,
        rgba(78, 31, 16, 0.18) 8px 15px,
        rgba(145, 80, 41, 0.08) 15px 28px,
        rgba(70, 27, 14, 0.14) 28px 42px,
        rgba(120, 58, 28, 0.08) 42px 64px
      ),
      repeating-linear-gradient(
        180deg,
        rgba(43, 17, 8, 0.12) 0 2px,
        rgba(126, 63, 29, 0.04) 2px 5px,
        rgba(41, 15, 8, 0.1) 5px 7px,
        transparent 7px 13px
      ),
      radial-gradient(14% 4% at 18% 18%, rgba(63, 23, 11, 0.28), transparent 72%),
      radial-gradient(18% 5% at 58% 22%, rgba(82, 31, 15, 0.22), transparent 74%),
      radial-gradient(16% 4% at 74% 46%, rgba(64, 24, 11, 0.24), transparent 72%),
      radial-gradient(18% 5% at 34% 68%, rgba(88, 37, 18, 0.22), transparent 74%),
      radial-gradient(36% 6% at 18% 14%, rgba(48, 15, 7, 0.3), transparent 70%),
      radial-gradient(28% 5% at 66% 22%, rgba(61, 21, 10, 0.24), transparent 72%),
      radial-gradient(32% 6% at 42% 58%, rgba(48, 15, 7, 0.28), transparent 72%),
      radial-gradient(30% 5% at 78% 76%, rgba(62, 22, 10, 0.24), transparent 72%);
    background-size:
      100% 100%,
      100% 16px,
      100% 100%,
      100% 100%,
      100% 100%,
      100% 100%,
      100% 100%,
      100% 100%,
      100% 100%;
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
      radial-gradient(120% 100% at 50% -12%, rgba(255, 255, 255, 0.52), transparent 34%),
      linear-gradient(180deg, #ddd8d1 0%, #c9c4bc 18%, #a7a29c 48%, #c3beb6 78%, #e2ddd6 100%);
    border-color: rgba(56, 50, 44, 0.72);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.52),
      inset 0 -2px 4px rgba(48, 43, 37, 0.28),
      inset 0 0 0 1px rgba(255, 255, 255, 0.18),
      var(--shadow-panel);
  }

  .queue-panel {
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    gap: 10px;
    background:
      radial-gradient(120% 100% at 50% -12%, rgba(255, 255, 255, 0.5), transparent 34%),
      linear-gradient(180deg, #d7d2cb 0%, #c3beb7 18%, #9f9a94 48%, #bbb6af 78%, #dbd6cf 100%);
    border-color: rgba(56, 50, 44, 0.64);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.46),
      inset 0 -2px 4px rgba(42, 37, 31, 0.24),
      inset 0 0 0 1px rgba(255, 255, 255, 0.16),
      0 12px 20px rgba(23, 10, 6, 0.14);
  }

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
      radial-gradient(circle at 50% 42%, rgba(71, 236, 224, 0.16), transparent 36%),
      linear-gradient(180deg, rgba(200, 255, 251, 0.08), transparent 12%),
      linear-gradient(180deg, #394147 0%, #2b3238 18%, #171c20 100%);
    border: 1px solid rgba(104, 201, 196, 0.14);
    box-shadow:
      inset 0 1px 0 rgba(230, 255, 253, 0.12),
      inset 0 -1px 0 rgba(10, 13, 15, 0.44),
      inset 0 0 0 1px rgba(86, 124, 122, 0.18),
      0 0 18px rgba(71, 236, 224, 0.1);
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
      radial-gradient(circle at 50% 42%, rgba(78, 236, 224, 0.2), transparent 44%),
      linear-gradient(180deg, rgba(226, 255, 253, 0.12), transparent 8%),
      linear-gradient(180deg, #15201a 0%, #0a0f0d 100%);
    border: 4px solid rgba(102, 181, 178, 0.52);
    box-shadow:
      inset 0 0 0 1px rgba(17, 31, 29, 0.56),
      inset 0 0 26px rgba(71, 236, 224, 0.16),
      0 8px 16px rgba(0, 0, 0, 0.18);
  }

  .art-slot.has-art {
    background:
      radial-gradient(circle at 50% 50%, rgba(71, 236, 224, 0.18), transparent 52%),
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
      linear-gradient(180deg, rgba(80, 240, 229, 0.12), transparent 34%, rgba(0, 0, 0, 0.18));
  }

  .art-slot :global(.record-loader) {
    position: relative;
    z-index: 2;
    width: min(100%, 340px);
    height: auto;
    max-width: 100%;
    max-height: 100%;
    margin: 0 auto;
  }

  .lcd-copy {
    display: grid;
    gap: 10px;
    min-height: 170px;
    padding: 14px;
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(214, 255, 248, 0.08), transparent 14%),
      linear-gradient(180deg, #233233 0%, #131c1d 34%, #0a1011 100%);
    color: #dff8ef;
    border: 1px solid rgba(111, 151, 146, 0.28);
    box-shadow:
      inset 0 1px 0 rgba(239, 255, 252, 0.08),
      inset 0 0 0 1px rgba(20, 34, 35, 0.44),
      inset 0 0 22px rgba(83, 232, 215, 0.08);
  }

  .lcd-main {
    display: grid;
    align-content: center;
    min-height: 126px;
    padding: 14px 16px 12px;
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(203, 255, 247, 0.06), transparent 16%),
      linear-gradient(180deg, rgba(0, 0, 0, 0.16), transparent 28%),
      linear-gradient(180deg, #10201f 0%, #0a1213 100%);
    border: 1px solid rgba(108, 157, 150, 0.18);
    box-shadow:
      inset 0 1px 0 rgba(238, 255, 252, 0.06),
      inset 0 0 18px rgba(78, 228, 211, 0.08);
  }

  .pick-reveal {
    display: grid;
    gap: 12px;
  }

  .loading-placeholder {
    opacity: 0.92;
  }

  .readout-row {
    display: grid;
    gap: 4px;
  }

  .readout-label {
    font-family: var(--font-display);
    font-size: 0.68rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(207, 47, 47, 0.72);
  }

  .lcd-copy h3 {
    font-size: clamp(1.36rem, 2.3vw, 1.95rem);
    line-height: 1.02;
    font-family: var(--font-ui);
    font-weight: 700;
    font-style: normal;
    letter-spacing: 0.01em;
    color: #f4f2df;
    margin: 0;
    text-align: left;
    text-shadow: 0 0 8px rgba(189, 243, 236, 0.08);
  }

  .artist {
    margin: 0;
    font-size: clamp(0.94rem, 1.6vw, 1.18rem);
    line-height: 1.08;
    font-family: var(--font-ui);
    font-weight: 500;
    letter-spacing: 0.01em;
    color: #c7e8df;
    text-align: left;
  }

  .jump-to-stashes {
    justify-self: center;
    align-self: start;
    margin-top: 8px;
    min-width: 168px;
    padding: 13px 20px;
    border-radius: 12px;
    background:
      linear-gradient(180deg, #f3e6c9 0%, #e1c895 100%);
    border: 2px solid rgba(207, 47, 47, 0.72);
    color: #7f1f1f;
    font-size: 0.92rem;
    letter-spacing: 0.05em;
    line-height: 1.1;
    white-space: nowrap;
    box-shadow:
      inset 0 1px 0 rgba(255, 246, 225, 0.52),
      0 0 0 1px rgba(255, 134, 101, 0.14),
      0 6px 12px rgba(122, 41, 18, 0.16);
  }

  .jump-to-stashes:hover:not(:disabled),
  .jump-to-stashes:focus-visible:not(:disabled) {
    transform: translateY(-1px) scale(1.02);
    box-shadow:
      inset 0 1px 0 rgba(255, 246, 225, 0.52),
      0 0 0 1px rgba(255, 134, 101, 0.18),
      0 8px 14px rgba(122, 41, 18, 0.18);
  }

  .pick-reveal:has(.jump-to-stashes) {
    min-height: 100%;
    place-content: center;
    justify-items: center;
  }

  .bottom-stashes-highlighted {
    position: relative;
    border-color: rgba(229, 83, 58, 0.82);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.5),
      inset 0 -2px 4px rgba(46, 40, 35, 0.26),
      inset 0 0 0 1px rgba(255, 255, 255, 0.18),
      0 0 0 4px rgba(229, 83, 58, 0.34),
      0 0 36px rgba(229, 83, 58, 0.28),
      var(--shadow-panel);
  }

  .bottom-stashes-highlighted::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
    background:
      linear-gradient(180deg, rgba(255, 161, 115, 0.16), rgba(255, 112, 70, 0.08)),
      radial-gradient(circle at 50% 30%, rgba(255, 170, 120, 0.18), transparent 58%);
    box-shadow:
      inset 0 0 0 2px rgba(255, 148, 101, 0.34),
      inset 0 0 34px rgba(255, 118, 72, 0.14);
  }

  .meta-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    background:
      linear-gradient(180deg, rgba(222, 255, 250, 0.06), transparent 20%),
      linear-gradient(180deg, #192425 0%, #0f1718 100%);
    border: 1px solid rgba(102, 145, 140, 0.14);
  }

  .meta-cell {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .meta-label {
    font-family: var(--font-display);
    font-size: 0.62rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(207, 47, 47, 0.72);
  }

  .meta-value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #d9e8df;
    font-size: 0.88rem;
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
      linear-gradient(180deg, rgba(255, 239, 204, 0.08), transparent 12%),
      linear-gradient(180deg, rgba(64, 36, 20, 0.48), transparent 28%),
      linear-gradient(180deg, #2a150b 0%, #1a0d06 100%);
    border: 1px solid rgba(255, 223, 169, 0.08);
    box-shadow:
      inset 0 1px 0 rgba(255, 241, 214, 0.05),
      inset 0 -1px 0 rgba(8, 4, 2, 0.3);
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

  .stash-card-top {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 10px;
  }

  .stash-card-heading {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .stash-index {
    width: 28px;
    height: 28px;
    align-self: start;
    border-radius: 999px;
    display: grid;
    place-items: center;
    font-family: var(--font-display);
    font-size: 0.82rem;
    letter-spacing: 0.04em;
    color: rgba(111, 52, 23, 0.88);
    background:
      linear-gradient(180deg, rgba(255, 246, 226, 0.82), rgba(228, 203, 151, 0.92));
    border: 1px solid rgba(140, 88, 41, 0.18);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.36),
      0 2px 6px rgba(61, 28, 11, 0.08);
  }

  .stash-card-top p {
    margin: 4px 0 0;
    color: rgba(70, 43, 22, 0.76);
    font-size: 0.9rem;
  }

  .load-button {
    align-self: start;
    min-width: 96px;
    padding: 10px 14px;
    border-radius: 12px;
    border: 2px solid rgba(207, 47, 47, 0.72);
    background:
      linear-gradient(180deg, #f3e6c9 0%, #e1c895 100%);
    color: #7f1f1f;
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    white-space: nowrap;
    box-shadow:
      inset 0 1px 0 rgba(255, 246, 225, 0.52),
      0 0 0 1px rgba(255, 134, 101, 0.14),
      0 6px 12px rgba(122, 41, 18, 0.16);
  }

  .load-button:hover:not(:disabled),
  .load-button:focus-visible:not(:disabled) {
    transform: translateY(-1px) scale(1.02);
    box-shadow:
      inset 0 1px 0 rgba(255, 246, 225, 0.52),
      0 0 0 1px rgba(255, 134, 101, 0.18),
      0 8px 14px rgba(122, 41, 18, 0.18);
  }

  .load-button:disabled {
    opacity: 0.54;
    cursor: default;
  }

  .upload-button {
    align-self: stretch;
  }

  .clear-stash-button {
    min-width: 92px;
    padding-inline: 15px;
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

  .history-art :global(.record-loader) {
    width: 100%;
    height: 100%;
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
    position: relative;
    display: grid;
    place-items: center;
    min-height: 106px;
    padding: 20px 24px 22px;
    border-radius: 20px;
    border: 1px solid rgba(78, 47, 28, 0.72);
    cursor: pointer;
    background:
      radial-gradient(circle at 50% 22%, #ff8f63 0%, #e5533a 26%, #cf2f2f 56%, #9b1a1f 100%);
    color: #ffe6b7;
    font-family: var(--font-display);
    font-size: 2.42rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    box-shadow:
      inset 0 1px 0 rgba(255, 234, 195, 0.18),
      0 0 0 1px rgba(214, 189, 145, 0.14),
      0 12px 20px rgba(86, 18, 8, 0.26);
  }

  .random-button-content {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 34px;
    line-height: 1;
  }

  .random-button:disabled {
    cursor: default;
    opacity: 0.78;
  }

  .random-button-idle,
  .random-button-idle:disabled {
    opacity: 0.38;
    filter: saturate(0.72) brightness(0.92);
  }

  .random-button:hover:not(:disabled),
  .random-button:focus-visible:not(:disabled) {
    transform: translateY(-1px);
    box-shadow:
      inset 0 1px 0 rgba(255, 234, 195, 0.18),
      0 0 0 1px rgba(214, 189, 145, 0.16),
      0 16px 24px rgba(86, 18, 8, 0.3);
  }

  .bottom-strip {
    display: grid;
    grid-template-columns: 420px minmax(320px, 1fr) minmax(300px, 1fr);
    gap: 16px;
    align-items: stretch;
    background:
      radial-gradient(120% 100% at 50% -12%, rgba(255, 255, 255, 0.52), transparent 34%),
      linear-gradient(180deg, #dbd6cf 0%, #c7c2bb 18%, #a39f99 48%, #c0bbb4 78%, #e0dbd4 100%);
    border-color: rgba(56, 50, 44, 0.72);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.5),
      inset 0 -2px 4px rgba(46, 40, 35, 0.26),
      inset 0 0 0 1px rgba(255, 255, 255, 0.18),
      var(--shadow-panel);
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
    justify-items: center;
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

  .loaded-stash-actions {
    display: inline-flex;
    align-items: flex-start;
  }

  .loaded-indicator {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 11px;
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(86, 236, 225, 0.22), rgba(18, 94, 88, 0.18));
    border: 1px solid rgb(0 255 235);
    color: #00ffeb;
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
    background: #59f0e7;
    box-shadow: 0 0 10px rgba(89, 240, 231, 0.5);
  }

  .source-panel,
  .filter-panel {
    display: grid;
    gap: 12px;
    align-content: start;
  }

  .source-collapsed-note {
    margin-top: 4px;
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

  .selector-unit:hover,
  .selector-unit:focus-visible {
    border-color: rgba(108, 233, 224, 0.28);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.08),
      inset 0 -1px 0 rgba(0, 0, 0, 0.24),
      0 0 0 1px rgba(71, 236, 224, 0.16),
      0 0 16px rgba(71, 236, 224, 0.08);
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
      linear-gradient(180deg, rgba(180, 255, 250, 0.18), rgba(21, 89, 84, 0.28));
    border: 1px solid rgba(133, 243, 235, 0.2);
    color: #d9fffb;
    font-size: 0.84rem;
    box-shadow: 0 0 12px rgba(71, 236, 224, 0.08);
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

  .field-error span {
    color: #f3b0a2;
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

  .input-error {
    border-color: rgba(207, 47, 47, 0.72);
    box-shadow:
      inset 0 1px 0 rgba(255, 219, 211, 0.08),
      0 0 0 1px rgba(207, 47, 47, 0.22);
  }

  .field-error-text {
    margin: 0;
    color: #f8b4a6;
    font-size: 0.84rem;
    line-height: 1.2;
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
      linear-gradient(180deg, rgba(107, 241, 231, 0.2), rgba(19, 78, 74, 0.28)),
      linear-gradient(180deg, #233835 0%, #151d1c 100%);
    border-color: rgba(132, 242, 233, 0.28);
  }

  .rotary-option-active .rotary-option-knob {
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.34),
      inset 0 -4px 7px rgba(52, 32, 17, 0.4),
      0 0 0 3px rgba(36, 23, 15, 0.72),
      0 0 0 1px rgba(130, 242, 234, 0.34),
      0 8px 16px rgba(57, 182, 174, 0.2);
  }

  .rotary-option-active .rotary-option-label {
    color: #defffb;
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

    .meta-strip {
      grid-template-columns: 1fr;
      gap: 8px;
    }

  }

  @media (max-width: 860px) {
    .shell {
      padding: 14px 12px calc(150px + env(safe-area-inset-bottom, 0px));
    }

    .album-card {
      grid-template-rows: auto auto;
      gap: 14px;
    }

    .album-display {
      min-height: clamp(290px, 48vh, 400px);
    }

    .album-stage {
      inset: 10px;
      padding: 8px;
    }

    .queue-column {
      gap: 10px;
      padding-bottom: 8px;
    }

    .queue-panel {
      gap: 8px;
    }

    .random-button {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: env(safe-area-inset-bottom, 0px);
      z-index: 40;
      height: 70px;
      min-height: 70px;
      padding: 14px 18px 16px;
      font-size: 1.72rem;
      border-radius: 18px;
      box-shadow:
        inset 0 1px 0 rgba(255, 213, 161, 0.2),
        0 18px 28px rgba(54, 12, 7, 0.28);
    }

    .random-button-content {
      min-height: 34px;
    }

    .bottom-strip {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .art-slot {
      width: min(67vw, 285px);
    }

    .queue-section,
    .bottom-panel {
      padding: 14px;
    }

    .queue-section-header,
    .source-actions {
      flex-direction: column;
      align-items: flex-start;
    }

    .stash-card-top {
      flex-direction: row;
      align-items: flex-start;
    }

    .stash-card-top .load-button {
      flex: 0 0 auto;
      margin-left: auto;
    }
  }

  @media (max-width: 480px) {
    .shell {
      padding: 12px 10px calc(136px + env(safe-area-inset-bottom, 0px));
    }

    .album-display {
      min-height: clamp(238px, 37vh, 300px);
    }

    .album-stage {
      inset: 8px;
      padding: 6px;
    }

    .art-slot {
      width: min(63vw, 238px);
      border-width: 3px;
    }

    .art-slot .cover-art {
      width: min(90%, 214px);
      height: min(90%, 214px);
    }

    .random-button {
      left: 10px;
      right: 10px;
      bottom: env(safe-area-inset-bottom, 0px);
      height: 64px;
      min-height: 64px;
      font-size: 1.5rem;
      letter-spacing: 0.08em;
    }

    .random-button-content {
      min-height: 34px;
    }

    .stash-card-top {
      gap: 10px;
    }

    .stash-card-top .load-button {
      min-width: 88px;
      padding: 9px 12px;
      font-size: 0.72rem;
      letter-spacing: 0.03em;
    }

    .lcd-copy {
      min-height: 0;
      padding: 12px;
      gap: 8px;
    }

    .lcd-main {
      min-height: 112px;
      padding: 12px 13px 10px;
    }
  }
</style>
