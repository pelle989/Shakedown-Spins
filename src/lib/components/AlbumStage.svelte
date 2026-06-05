<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import VinylLoader from '$lib/components/VinylLoader.svelte';
  import type { ActiveCollectionState, Album, AlbumContext, ContextBlurb } from '$lib/types';

  type Props = {
    activeState: ActiveCollectionState;
    albumStageView: 'art' | 'text';
    activeArtworkUrl: string | null;
    activeArtworkUrls: string[];
    artLoading: boolean;
    rollingSelection: boolean;
    currentPick: Album | null;
    currentArtworkIndex: number;
    currentAlbumDetail: AlbumContext | null;
    albumContextLoading: boolean;
    displayedTitle: string;
    displayedArtist: string;
    restoringMessage: string | null;
    onToggleAlbumStageView: () => void;
    onPreviousArtwork: () => void;
    onNextArtwork: () => void;
    onScrollToAvailableStashes: () => void;
    onHandleArtworkTouchStart: (event: TouchEvent) => void;
    onHandleArtworkTouchEnd: (event: TouchEvent) => void;
  };

  let {
    activeState,
    albumStageView,
    activeArtworkUrl,
    activeArtworkUrls,
    artLoading,
    rollingSelection,
    currentPick,
    currentArtworkIndex,
    currentAlbumDetail,
    albumContextLoading,
    displayedTitle,
    displayedArtist,
    restoringMessage,
    onToggleAlbumStageView,
    onPreviousArtwork,
    onNextArtwork,
    onScrollToAvailableStashes,
    onHandleArtworkTouchStart,
    onHandleArtworkTouchEnd
  }: Props = $props();

  let viewportWidth = $state(0);

  function syncViewportWidth() {
    if (typeof window !== 'undefined') {
      viewportWidth = window.innerWidth;
    }
  }

  function shouldShowContinuation(blurb: ContextBlurb | null) {
    if (!blurb?.sourceUrl) return false;
    if (blurb.truncated) return true;
    if (viewportWidth <= 480) return blurb.text.length > 140;
    if (viewportWidth <= 667) return blurb.text.length > 180;
    if (viewportWidth <= 895) return blurb.text.length > 220;
    return false;
  }

  onMount(() => {
    syncViewportWidth();
    window.addEventListener('resize', syncViewportWidth);
    return () => window.removeEventListener('resize', syncViewportWidth);
  });
</script>

<article class="album-card">
  <div class="album-display">
    <div class:is-rolling={rollingSelection} class="album-stage">
      <div
        class:art-slot-text={albumStageView === 'text'}
        class:has-art={Boolean(activeArtworkUrl) && !artLoading && albumStageView === 'art'}
        class="art-slot"
        ontouchstart={onHandleArtworkTouchStart}
        ontouchend={onHandleArtworkTouchEnd}
      >
        {#if albumStageView === 'text' && activeState.status !== 'idle'}
          <div class="album-slot-text-view">
            {#if albumContextLoading}
              <p class="album-slot-status">Loading pop-up facts…</p>
            {:else if currentAlbumDetail}
              <div class="album-slot-facts">
                {#if currentAlbumDetail.albumSummary}
                  <div class="album-slot-fact-block">
                    <span class="album-slot-fact-kicker">Album • {currentAlbumDetail.albumSummary.source}</span>
                    <p
                      class:album-slot-fact-text-clamped={shouldShowContinuation(currentAlbumDetail.albumSummary)}
                      class="album-slot-fact-text"
                    >
                      {currentAlbumDetail.albumSummary.text}
                    </p>
                    {#if shouldShowContinuation(currentAlbumDetail.albumSummary)}
                      <a
                        class="album-slot-fact-link"
                        href={currentAlbumDetail.albumSummary.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Continue…
                      </a>
                    {/if}
                  </div>
                {/if}
                {#if currentAlbumDetail.artistSummary}
                  <div class="album-slot-fact-block">
                    <span class="album-slot-fact-kicker">Artist • {currentAlbumDetail.artistSummary.source}</span>
                    <p
                      class:album-slot-fact-text-clamped={shouldShowContinuation(currentAlbumDetail.artistSummary)}
                      class="album-slot-fact-text"
                    >
                      {currentAlbumDetail.artistSummary.text}
                    </p>
                    {#if shouldShowContinuation(currentAlbumDetail.artistSummary)}
                      <a
                        class="album-slot-fact-link"
                        href={currentAlbumDetail.artistSummary.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Continue…
                      </a>
                    {/if}
                  </div>
                {/if}
              </div>
            {:else}
              <p class="album-slot-status">No pop-up facts available for this album yet.</p>
            {/if}
          </div>
        {:else if artLoading}
          <VinylLoader size={340} active={true} />
        {:else if activeArtworkUrl}
          <img class="art-backdrop" src={activeArtworkUrl} alt="" aria-hidden="true" />
          <img
            class="cover-art"
            src={activeArtworkUrl}
            alt={`Cover art for ${currentPick?.title ?? 'the selected album'}`}
          />
        {:else}
          <VinylLoader size={340} />
        {/if}
      </div>
      {#if albumStageView === 'art' && activeArtworkUrls.length > 1}
        <div class="art-gallery-controls">
          <button class="art-gallery-button" type="button" aria-label="Previous album image" onclick={onPreviousArtwork}>
            ‹
          </button>
          <span class="art-gallery-count">{currentArtworkIndex + 1} / {activeArtworkUrls.length}</span>
          <button class="art-gallery-button" type="button" aria-label="Next album image" onclick={onNextArtwork}>
            ›
          </button>
        </div>
      {/if}
      {#if activeState.status !== 'idle'}
        <button
          class:album-stage-year-text-active={albumStageView === 'text'}
          class="album-stage-year"
          type="button"
          aria-pressed={albumStageView === 'text'}
          onclick={onToggleAlbumStageView}
        >
          {currentPick?.year ?? '—'}
        </button>
      {/if}
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
          <button class="jump-to-stashes" type="button" onclick={onScrollToAvailableStashes}>
            <span class="jump-to-stashes-copy">
              <span class="jump-to-stashes-label">Load A Stash</span>
            </span>
            <span class="jump-to-stashes-chevron" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path
                  d="M6.75 9.25 12 14.5l5.25-5.25"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
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

    {#if restoringMessage}
      <p class="status-note">{restoringMessage}</p>
    {/if}
  </div>
</article>

<style>
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
    inset: 0;
    display: grid;
    place-items: center;
    padding: 12px;
    border-radius: 14px;
    background:
      radial-gradient(circle at 50% 42%, rgba(71, 236, 224, 0.16), transparent 36%),
      linear-gradient(180deg, rgba(200, 255, 251, 0.08), transparent 12%),
      linear-gradient(180deg, #394147 0%, #2b3238 18%, #171c20 100%);
    border: 0 solid rgba(104, 201, 196, 0.14);
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
    position: static;
    width: min(100%, 510px);
    aspect-ratio: 1;
    border-radius: 16px;
    display: grid;
    place-items: center;
    overflow: unset;
    background: transparent;
    border: 0;
    box-shadow: none;
  }

  .art-slot.has-art {
    background: transparent;
  }

  .art-slot.art-slot-text {
    display: block;
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
    width: min(100%, 510px);
    height: auto;
    max-width: 100%;
    max-height: 100%;
    margin: 0 auto;
  }

  .album-slot-text-view {
    width: min(92%, 470px);
    min-height: min(88%, 450px);
    margin: 0 auto;
    display: grid;
    align-content: start;
    gap: 14px;
    padding: 24px 22px;
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(18, 12, 9, 0.94), rgba(42, 24, 18, 0.96));
    border: 1px solid rgba(255, 225, 176, 0.14);
    box-shadow:
      inset 0 1px 0 rgba(255, 244, 220, 0.08),
      0 18px 34px rgba(0, 0, 0, 0.28);
    overflow: auto;
    position: relative;
    z-index: 2;
  }

  .album-slot-facts {
    display: grid;
    gap: 14px;
  }

  .album-slot-fact-block {
    display: grid;
    gap: 6px;
    min-width: 0;
  }

  .album-slot-fact-kicker {
    color: rgba(252, 137, 95, 0.86);
    font-family: var(--font-display);
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .album-slot-fact-text,
  .album-slot-status {
    margin: 0;
    color: rgba(245, 233, 205, 0.92);
    font-size: 1rem;
    line-height: 1.6;
    text-align: left;
  }

  .album-slot-status {
    color: rgba(221, 234, 229, 0.76);
  }

  .album-slot-fact-link {
    justify-self: start;
    color: rgb(253 137 95);
    text-decoration: underline;
    text-underline-offset: 0.18em;
    white-space: nowrap;
  }

  .art-gallery-controls {
    position: absolute;
    left: 50%;
    bottom: 20px;
    z-index: 4;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 7px;
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(22, 14, 10, 0.88), rgba(36, 22, 17, 0.92));
    border: 1px solid rgba(255, 225, 176, 0.14);
    box-shadow:
      inset 0 1px 0 rgba(255, 244, 220, 0.12),
      0 10px 18px rgba(0, 0, 0, 0.24);
  }

  .art-gallery-button {
    width: 25px;
    height: 25px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background:
      linear-gradient(180deg, #f3e6c9 0%, #dfc186 100%);
    border: 1px solid rgba(92, 52, 25, 0.26);
    color: #5d2712;
    font-family: var(--font-display);
    font-size: 0.85rem;
    line-height: 1;
    box-shadow:
      inset 0 1px 0 rgba(255, 248, 228, 0.44),
      0 6px 12px rgba(22, 9, 4, 0.22);
  }

  .art-gallery-button:hover:not(:disabled),
  .art-gallery-button:focus-visible:not(:disabled) {
    transform: translateY(-1px);
  }

  .art-gallery-count {
    min-width: 36px;
    text-align: center;
    color: #f4e2bf;
    font-family: var(--font-display);
    font-size: 0.52rem;
    letter-spacing: 0.08em;
  }

  .lcd-copy {
    display: grid;
    gap: 10px;
    min-height: 130px;
    padding: 4px;
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
    background: transparent;
  }

  .pick-reveal {
    display: grid;
    gap: 17px;
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
    color: rgba(252, 137, 95, 0.69);
  }

  .lcd-copy h3 {
    font-size: clamp(2.5rem, 2.3vw, 1.95rem);
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
    font-size: clamp(1.54rem, 1.6vw, 1.18rem);
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
    min-width: 222px;
    padding: 14px 20px 12px;
    border-radius: 18px 18px 14px 14px;
    display: inline-grid;
    justify-items: center;
    justify-content: center;
    gap: 6px;
    background:
      linear-gradient(180deg, rgba(239, 223, 188, 0.98) 0%, rgba(216, 186, 132, 0.98) 100%);
    border: 2px solid rgba(132, 70, 30, 0.76);
    color: #5a2915;
    box-shadow:
      inset 0 1px 0 rgba(255, 248, 226, 0.76),
      inset 0 -2px 0 rgba(108, 53, 18, 0.18),
      0 0 0 1px rgba(255, 170, 112, 0.1),
      0 10px 18px rgba(79, 31, 13, 0.15);
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      border-color 160ms ease;
    overflow: hidden;
    position: relative;
  }

  .jump-to-stashes::before {
    content: '';
    position: absolute;
    inset: 0 auto auto 50%;
    transform: translateX(-50%);
    width: 72px;
    height: 9px;
    border-radius: 0 0 10px 10px;
    background: rgba(101, 50, 24, 0.16);
    box-shadow: inset 0 -1px 0 rgba(72, 34, 15, 0.12);
  }

  .jump-to-stashes-copy {
    display: grid;
    gap: 2px;
    text-align: center;
  }

  .jump-to-stashes-label {
    font-size: 0.98rem;
    line-height: 1.05;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: var(--font-display);
    color: #5c2914;
  }

  .jump-to-stashes-chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    color: #6a3118;
  }

  .jump-to-stashes-chevron svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .jump-to-stashes:hover:not(:disabled),
  .jump-to-stashes:focus-visible:not(:disabled) {
    transform: translateY(-1px) scale(1.02);
    box-shadow:
      inset 0 1px 0 rgba(255, 248, 226, 0.76),
      inset 0 -2px 0 rgba(108, 53, 18, 0.18),
      0 0 0 1px rgba(255, 144, 96, 0.14),
      0 14px 24px rgba(79, 31, 13, 0.18);
    border-color: rgba(167, 83, 37, 0.76);
  }

  .album-stage-year {
    position: absolute;
    right: 22px;
    bottom: 18px;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 68px;
    min-height: 38px;
    padding: 8px 12px;
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(17, 12, 10, 0.82), rgba(34, 23, 18, 0.88));
    border: 1px solid rgba(255, 225, 176, 0.12);
    color: #f4e2bf;
    font-family: var(--font-display);
    font-size: 0.98rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.08),
      0 8px 18px rgba(10, 4, 2, 0.16);
  }

  .album-stage-year.album-stage-year-text-active {
    border: 2px solid rgb(253 137 95);
  }

  .pick-reveal:has(.jump-to-stashes) {
    min-height: 100%;
    place-content: center;
    justify-items: center;
  }

  @media (max-width: 895px) {
    .album-display {
      min-height: 0;
    }

    .album-stage {
      inset: 2px;
      padding: 2px;
    }

    .art-slot {
      width: min(48vw, 256px);
    }

    .art-slot .cover-art {
      width: min(88%, 228px);
      height: min(88%, 228px);
    }

    .album-slot-text-view {
      width: min(92%, 340px);
      min-height: min(86%, 300px);
      padding: 18px 16px 56px;
      gap: 12px;
    }

    .album-slot-fact-text,
    .album-slot-status {
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .album-slot-fact-text-clamped {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 5;
      overflow: hidden;
    }

    .lcd-copy {
      min-height: 130px;
      padding: 4px;
      gap: 8px;
    }

    .lcd-main {
      min-height: 108px;
      padding: 12px 14px 10px;
    }

    .pick-reveal {
      gap: 17px;
    }

    .lcd-copy h3 {
      font-size: clamp(2rem, 4.9vw, 2.34rem);
    }

    .artist {
      font-size: clamp(1.1rem, 3.4vw, 1.38rem);
    }
  }

  @media (min-width: 760px) and (max-width: 895px) {
    .art-slot {
      width: min(92vw, 560px);
    }

    .art-slot .cover-art {
      width: min(100%, 392px);
      height: min(100%, 392px);
    }
  }

  @media (max-width: 667px) {
    .album-card {
      grid-template-rows: 250px auto;
      gap: 10px;
    }

    .album-display {
      min-height: 250px;
      height: 250px;
    }

    .album-stage {
      inset: 1px;
      padding: 1px;
    }

    .art-slot {
      width: min(54vw, 216px);
    }

    .art-slot .cover-art {
      width: min(100%, 216px);
      height: min(100%, 216px);
      transform: translateY(-30px);
    }

    .album-slot-text-view {
      width: min(93%, 300px);
      min-height: min(84%, 250px);
      padding: 16px 14px 52px;
      gap: 10px;
    }

    .album-slot-fact-text,
    .album-slot-status {
      font-size: 0.88rem;
      line-height: 1.42;
    }

    .album-slot-fact-text-clamped {
      -webkit-line-clamp: 4;
    }

    .album-slot-fact-link {
      font-size: 0.84rem;
    }

    .lcd-copy {
      min-height: 130px;
      padding: 4px;
    }

    .lcd-main {
      min-height: 96px;
      padding: 10px 12px 8px;
    }

    .pick-reveal {
      gap: 17px;
    }

    .lcd-copy h3 {
      font-size: clamp(1.7rem, 5.1vw, 2rem);
    }

    .artist {
      font-size: clamp(1rem, 3.3vw, 1.2rem);
    }
  }

  @media (max-width: 480px) {
    .album-card {
      grid-template-rows: 250px auto;
    }

    .album-display {
      min-height: 250px;
      height: 250px;
    }

    .album-stage {
      inset: 0;
      padding: 0;
    }

    .art-slot {
      width: min(58vw, 224px);
    }

    .album-slot-text-view {
      width: min(94%, 360px);
      min-height: min(90%, 320px);
      padding: 18px 16px 64px;
      gap: 12px;
    }

    .album-slot-fact-text,
    .album-slot-status {
      font-size: 0.82rem;
      line-height: 1.36;
    }

    .album-slot-fact-link {
      font-size: 0.8rem;
    }

    .art-slot .cover-art {
      width: min(100%, 224px);
      height: min(100%, 224px);
      transform: translateY(-34px);
    }

    .album-slot-fact-text-clamped {
      -webkit-line-clamp: 3;
    }

    .album-stage-year {
      right: 12px;
      bottom: 12px;
      min-width: 52px;
      min-height: 30px;
      padding: 5px 9px;
      font-size: 0.8rem;
      letter-spacing: 0.05em;
    }

    .lcd-main {
      padding-inline: 10px;
    }
  }

  @media (max-width: 450px) {
    .art-slot .cover-art {
      transform: translateY(-18px);
    }

    .art-gallery-controls {
      bottom: 6px;
    }
  }
</style>
