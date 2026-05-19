<script lang="ts">
  import { fly } from 'svelte/transition';
  import type { ActiveCollectionState, FilterState } from '$lib/types';

  type Props = {
    activeState: ActiveCollectionState;
    filters: FilterState;
    filterOptions: { genre: string[]; decade: string[] };
    expandedFilterDial: 'genre' | 'decade' | null;
    currentFilterDial: 'genre' | 'decade';
    currentFilterLabel: string;
    currentFilterAllLabel: string;
    expandedFilterOptions: string[];
    expandedFilterPageOptions: string[];
    expandedFilterPageCount: number;
    filterDialPage: { genre: number; decade: number };
    filterPageDirection: -1 | 1;
    filterSearch: { genre: string; decade: string };
    selectedGenreLabel: string;
    selectedDecadeLabel: string;
    activeFilterTags: Array<{ dial: 'genre' | 'decade'; value: string }>;
    onToggleFilterDial: (dial: 'genre' | 'decade') => void;
    onRemoveFilterValue: (dial: 'genre' | 'decade', value: string) => void;
    onClearFilters: () => void;
    onHandleFilterTouchStart: (event: TouchEvent) => void;
    onHandleFilterTouchEnd: (event: TouchEvent) => void;
    onClearDialFilters: (dial: 'genre' | 'decade') => void;
    onCollapseDial: () => void;
    onUpdateFilterSearch: (dial: 'genre' | 'decade', value: string) => void;
    onToggleFilter: (dial: 'genre' | 'decade', value: string) => void;
    onChangeExpandedFilterPage: (direction: -1 | 1) => void;
  };

  let {
    activeState,
    filters,
    filterOptions,
    expandedFilterDial,
    currentFilterDial,
    currentFilterLabel,
    currentFilterAllLabel,
    expandedFilterOptions,
    expandedFilterPageOptions,
    expandedFilterPageCount,
    filterDialPage,
    filterPageDirection,
    filterSearch,
    selectedGenreLabel,
    selectedDecadeLabel,
    activeFilterTags,
    onToggleFilterDial,
    onRemoveFilterValue,
    onClearFilters,
    onHandleFilterTouchStart,
    onHandleFilterTouchEnd,
    onClearDialFilters,
    onCollapseDial,
    onUpdateFilterSearch,
    onToggleFilter,
    onChangeExpandedFilterPage
  }: Props = $props();
</script>

<section class="bottom-panel filter-panel">
  <div class="queue-section-header">
    <h3>Filters</h3>
  </div>
  <div class="selector-bank">
    {#if activeState.status !== 'loaded'}
      <div class="selector-grid selector-grid-idle selector-grid-faded">
        <div class="selector-unit selector-unit-idle">
          <span class="selector-label">Genre</span>
          <span class="selector-knob selector-knob-genre" aria-hidden="true"></span>
          <span class="selector-value">All Genres</span>
        </div>
        <div class="selector-unit selector-unit-idle">
          <span class="selector-label">Decade</span>
          <span class="selector-knob selector-knob-decade" aria-hidden="true"></span>
          <span class="selector-value">All Decades</span>
        </div>
      </div>
    {:else if !expandedFilterDial}
      <div class="selector-grid selector-grid-idle">
        <button
          class:selector-unit-active={filters.genre.length > 0}
          class:selector-unit-unavailable={filterOptions.genre.length === 0}
          class="selector-unit"
          type="button"
          disabled={filterOptions.genre.length === 0}
          onclick={() => onToggleFilterDial('genre')}
        >
          <span class="selector-label">Genre</span>
          <span class="selector-knob selector-knob-genre" aria-hidden="true"></span>
          <span class="selector-value">{selectedGenreLabel}</span>
        </button>
        <button
          class:selector-unit-active={filters.decade.length > 0}
          class:selector-unit-unavailable={filterOptions.decade.length === 0}
          class="selector-unit"
          type="button"
          disabled={filterOptions.decade.length === 0}
          onclick={() => onToggleFilterDial('decade')}
        >
          <span class="selector-label">Decade</span>
          <span class="selector-knob selector-knob-decade" aria-hidden="true"></span>
          <span class="selector-value">{selectedDecadeLabel}</span>
        </button>
      </div>

      {#if activeFilterTags.length > 0}
        <div class="active-filter-tags">
          {#each activeFilterTags as tag}
            <button
              class="active-filter-chip"
              type="button"
              onclick={() => onRemoveFilterValue(tag.dial, tag.value)}
            >
              <span>{tag.value}</span>
              <span aria-hidden="true">×</span>
            </button>
          {/each}
        </div>
      {/if}

      {#if activeFilterTags.length > 0}
        <div class="filter-actions">
          <button class="text-button" type="button" onclick={onClearFilters}>Clear</button>
        </div>
      {/if}
    {:else}
      <div
        class="compact-filter-group rotary-expanded-group"
        ontouchstart={onHandleFilterTouchStart}
        ontouchend={onHandleFilterTouchEnd}
      >
        <div class="rotary-expanded-head">
          <h4>{currentFilterLabel}</h4>
          <div class="rotary-head-actions">
            {#if filters[currentFilterDial].length > 0}
              <button
                class="text-button rotary-nav"
                type="button"
                onclick={() => onClearDialFilters(currentFilterDial)}
              >
                Clear
              </button>
            {/if}
            <button class="text-button rotary-nav" type="button" onclick={onCollapseDial}>
              Back
            </button>
          </div>
        </div>

        <div class="filter-search-row">
          <input
            class="filter-search-input"
            type="search"
            placeholder={currentFilterAllLabel}
            value={filterSearch[currentFilterDial]}
            oninput={(event) =>
              onUpdateFilterSearch(
                currentFilterDial,
                (event.currentTarget as HTMLInputElement).value
              )}
          />
        </div>

        {#if expandedFilterOptions.length === 0}
          <p class="status-note filter-empty-state">No {currentFilterLabel.toLowerCase()} matches that search.</p>
        {:else}
          <div class="rotary-option-viewport">
            {#key `${currentFilterDial}:${filterDialPage[currentFilterDial]}`}
              <div
                class="rotary-option-grid"
                in:fly={{ x: filterPageDirection > 0 ? 26 : -26, y: 0, duration: 180 }}
              >
                {#each expandedFilterPageOptions as option}
                  <button
                    class:rotary-option-active={filters[currentFilterDial].includes(option)}
                    class="rotary-option"
                    type="button"
                    onclick={() => onToggleFilter(currentFilterDial, option)}
                  >
                    <span class="rotary-option-knob" aria-hidden="true"></span>
                    <span class="rotary-option-label">{option}</span>
                  </button>
                {/each}
              </div>
            {/key}
          </div>
        {/if}

        {#if expandedFilterPageCount > 1}
          <div class="rotary-pagination">
            <button
              class="text-button rotary-nav"
              type="button"
              onclick={() => onChangeExpandedFilterPage(-1)}
              disabled={filterDialPage[currentFilterDial] === 0}
            >
              ←
            </button>
            <span class="rotary-page-indicator">
              {filterDialPage[currentFilterDial] + 1}/{expandedFilterPageCount}
            </span>
            <button
              class="text-button rotary-nav"
              type="button"
              onclick={() => onChangeExpandedFilterPage(1)}
              disabled={filterDialPage[currentFilterDial] >= expandedFilterPageCount - 1}
            >
              →
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</section>

<style>
  .bottom-panel {
    display: grid;
    align-content: start;
    height: 503px;
    min-height: 0;
    overflow: hidden;
    padding: 14px;
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(35, 16, 9, 0.18), transparent 14%),
      linear-gradient(180deg, #381f12 0%, #24150d 100%);
    border: 1px solid rgba(255, 228, 177, 0.08);
  }

  .filter-panel {
    display: grid;
    gap: 12px;
    align-content: start;
  }

  .filter-panel > .queue-section-header {
    min-height: 40.5px;
    height: 40.5px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .queue-section-header h3 {
    margin: 0;
    color: #f5deb0;
    font-family: var(--font-display);
    font-size: 0.92rem;
    letter-spacing: 0.16em;
    line-height: 1;
    text-transform: uppercase;
    text-align: left;
  }

  .selector-bank {
    display: grid;
    align-content: start;
    gap: 20px;
    padding: 16px;
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.24)),
      rgba(27, 13, 8, 0.3);
    border: 1px solid rgba(255, 225, 176, 0.12);
  }

  .selector-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .selector-grid-idle {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    justify-content: stretch;
    gap: 12px;
    margin-top: 10%;
    opacity: 1;
  }

  .selector-grid-faded {
    opacity: 0.58;
  }

  .selector-unit {
    display: grid;
    justify-items: center;
    gap: 12px;
    padding: 16px 14px 18px;
    min-height: 190px;
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
    transition: transform 140ms ease, opacity 140ms ease;
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

  .selector-unit-active {
    border-color: rgba(252, 137, 95, 0.3);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.08),
      inset 0 -1px 0 rgba(0, 0, 0, 0.24),
      0 0 0 1px rgba(214, 93, 58, 0.14),
      0 0 18px rgba(252, 137, 95, 0.08);
  }

  .selector-unit-unavailable {
    opacity: 0.56;
    cursor: default;
  }

  .selector-unit:disabled:hover,
  .selector-unit:disabled:focus-visible {
    border-color: rgba(255, 225, 176, 0.12);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.08),
      inset 0 -1px 0 rgba(0, 0, 0, 0.24);
  }

  .selector-unit-idle {
    cursor: default;
    gap: 10px;
    padding: 14px 12px 16px;
    min-height: 190px;
  }

  .selector-label {
    color: #f1d79d;
    font-family: var(--font-display);
    font-size: 0.88rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .selector-value {
    min-height: 2.8em;
    display: grid;
    place-items: center;
    text-align: center;
    color: #f4e2bf;
    font-size: 1rem;
    font-weight: 500;
    line-height: 1.15;
  }

  .selector-knob {
    position: relative;
    width: 94px;
    flex-shrink: 0;
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
    top: 13px;
    width: 4px;
    height: 27px;
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
    mask: radial-gradient(circle, transparent 0 46px, #000 47px 53px, transparent 54px);
    opacity: 0.68;
    pointer-events: none;
  }

  .selector-knob-genre {
    transform: rotate(28deg);
  }

  .selector-knob-decade {
    transform: rotate(336deg);
  }

  .active-filter-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .active-filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(180, 255, 250, 0.18), rgba(21, 89, 84, 0.28));
    border: 1px solid rgba(133, 243, 235, 0.2);
    color: #d9fffb;
    font-size: 0.84rem;
    box-shadow: 0 0 12px rgba(71, 236, 224, 0.08);
    transition: transform 140ms ease, opacity 140ms ease;
  }

  .filter-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  .text-button {
    padding: 8px 12px;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
    background:
      linear-gradient(180deg, #f1dfb7 0%, #dfc28b 100%);
    color: #3a210f;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
    font-family: var(--font-display);
    transition: transform 140ms ease, opacity 140ms ease;
  }

  .text-button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .compact-filter-group {
    margin-top: 5%;
  }

  .rotary-expanded-group {
    display: grid;
    gap: 14px;
  }

  .rotary-expanded-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .rotary-expanded-head h4 {
    margin: 0;
    color: #f5deb0;
    font-family: var(--font-display);
    font-size: 1rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .rotary-head-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .rotary-nav {
    min-width: 56px;
  }

  .filter-search-row {
    display: grid;
  }

  .filter-search-input {
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

  .filter-empty-state {
    margin: 0;
  }

  .rotary-option-viewport {
    overflow: hidden;
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
    min-height: 108px;
    padding: 10px 9px 12px;
    border: 1px solid rgba(255, 225, 176, 0.1);
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.06), rgba(31, 14, 8, 0.22)),
      linear-gradient(180deg, #321b11 0%, #1f120c 100%);
    color: #f4e2bf;
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.06),
      inset 0 -1px 0 rgba(0, 0, 0, 0.22);
    transform: none;
    transition: transform 140ms ease, opacity 140ms ease;
  }

  .rotary-option:hover,
  .rotary-option:focus-visible {
    background:
      linear-gradient(180deg, rgba(107, 241, 231, 0.14), rgba(19, 78, 74, 0.18)),
      linear-gradient(180deg, #233835 0%, #151d1c 100%);
    border-color: rgba(132, 242, 233, 0.24);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.06),
      inset 0 -1px 0 rgba(0, 0, 0, 0.22),
      0 0 0 1px rgba(71, 236, 224, 0.12),
      0 0 16px rgba(71, 236, 224, 0.08);
  }

  .rotary-option-active {
    background:
      linear-gradient(180deg, rgba(180, 255, 250, 0.18), rgba(21, 89, 84, 0.28));
    border-color: rgba(133, 243, 235, 0.2);
    color: #d9fffb;
    box-shadow: 0 0 12px rgba(71, 236, 224, 0.08);
  }

  .rotary-option-knob {
    position: relative;
    width: 54px;
    aspect-ratio: 1;
    border-radius: 999px;
    background:
      radial-gradient(circle at 34% 30%, rgba(255, 255, 255, 0.78), transparent 14%),
      repeating-radial-gradient(circle, rgba(84, 61, 40, 0.15) 0 2px, transparent 2px 6px),
      radial-gradient(circle, #f0e1c8 0%, #c7b091 46%, #735b45 72%, #241a13 100%);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.36),
      inset 0 -4px 7px rgba(52, 32, 17, 0.42),
      0 6px 12px rgba(0, 0, 0, 0.24),
      0 0 0 3px rgba(36, 23, 15, 0.72);
  }

  .rotary-option-knob::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 8px;
    width: 3px;
    height: 15px;
    border-radius: 999px;
    transform: translateX(-50%);
    background: linear-gradient(180deg, #2d1c10 0%, #8f5e25 100%);
  }

  .rotary-option-label {
    display: grid;
    place-items: center;
    min-height: 2.2em;
    text-align: center;
    font-size: 0.78rem;
    line-height: 1.16;
  }

  .rotary-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
  }

  .rotary-page-indicator {
    color: rgba(234, 216, 182, 0.78);
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .status-note {
    margin: 0;
    padding: 9px 12px 9px 14px;
    border-radius: 8px;
    font-size: 0.88rem;
    letter-spacing: 0.02em;
    border-left: 3px solid rgba(243, 226, 188, 0.56);
    background:
      linear-gradient(90deg, rgba(250, 227, 178, 0.12), rgba(250, 227, 178, 0.05));
    color: #f3e2bc;
  }

  @media (max-width: 980px) {
    .selector-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
