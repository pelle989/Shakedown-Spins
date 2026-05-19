<script lang="ts">
  import type { ActiveCollectionState, PrivateSourceSummary } from '$lib/types';

  type Props = {
    activeState: ActiveCollectionState;
    activePrivateSourceSummary: PrivateSourceSummary | null;
    mySources: PrivateSourceSummary[];
    highlightedSourceId: string | null;
    loadingStashId: string | null;
    sourceManageError: string | null;
    sourceManageSuccess: string | null;
    formatSourceTimestamp: (value: string) => string;
    formatSourceDateTime: (value?: string | null) => string;
    onStartEditingSource: (source: PrivateSourceSummary) => void;
    onLoadPrivateSource: (sourceId: string) => void;
    onUnloadStash: () => void | Promise<void>;
  };

  let {
    activeState,
    activePrivateSourceSummary,
    mySources,
    highlightedSourceId,
    loadingStashId,
    sourceManageError,
    sourceManageSuccess,
    formatSourceTimestamp,
    formatSourceDateTime,
    onStartEditingSource,
    onLoadPrivateSource,
    onUnloadStash
  }: Props = $props();
</script>

<div class="crate-feed my-stash-feed">
  {#if sourceManageError}
    <p class="status-error">{sourceManageError}</p>
  {/if}
  {#if sourceManageSuccess}
    <p class="status-success">{sourceManageSuccess}</p>
  {/if}
  {#if activeState.status === 'loaded' && activePrivateSourceSummary}
    <article
      class:stash-card-highlighted={highlightedSourceId === activePrivateSourceSummary.id}
      class="stash-card record-card loaded-stash-card"
    >
      <div class="stash-card-top">
        <div class="stash-card-heading">
          <div>
            <div class="loaded-card-title-row">
              <h3>{activePrivateSourceSummary.name}</h3>
              <span class="loaded-indicator">Private</span>
            </div>
            <p>{activePrivateSourceSummary.albumCount} albums saved in My Stash</p>
          </div>
        </div>
        <div class="loaded-stash-actions">
          <button
            class="text-button stash-edit-button"
            type="button"
            aria-label="Stash settings"
            title="Stash settings"
            onclick={() => onStartEditingSource(activePrivateSourceSummary)}
          >
            <span class="stash-settings-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M5 7.5h14M5 12h14M5 16.5h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                <circle cx="9" cy="7.5" r="1.8" fill="currentColor" />
                <circle cx="15.3" cy="12" r="1.8" fill="currentColor" />
                <circle cx="11.2" cy="16.5" r="1.8" fill="currentColor" />
              </svg>
            </span>
          </button>
          <button class="load-button clear-stash-button" type="button" onclick={onUnloadStash}>Clear</button>
        </div>
      </div>
    </article>
  {:else if mySources.length === 0}
    <div class="empty-state my-stash-state">
      <h3>My Stash</h3>
      <p>Your private collections will appear here.</p>
    </div>
  {:else}
    {#each mySources as source, index}
      <article
        class:stash-card-highlighted={highlightedSourceId === source.id}
        class="stash-card record-card"
      >
        <div class="stash-card-top">
          <div class="stash-card-heading">
            <span class="stash-index">{index + 1}</span>
            <div>
              <div class="stash-source-title-row">
                <h3>{source.name}</h3>
                <span class="stash-kind-badge">{source.kind}</span>
                {#if source.visibility === 'shared'}
                  <span class="stash-kind-badge stash-share-badge">shared</span>
                {/if}
              </div>
              <p>
                {source.albumCount} albums · Updated {formatSourceTimestamp(source.updatedAt)}
                {#if source.kind === 'discogs'}
                  · Imported {formatSourceDateTime(source.lastSyncedAt)}
                {/if}
              </p>
            </div>
          </div>
          <div class="stash-actions-group">
            <button
              class="load-button"
              type="button"
              disabled={loadingStashId === source.id}
              onclick={() => onLoadPrivateSource(source.id)}
            >
              {loadingStashId === source.id ? 'Loading...' : 'Load'}
            </button>
            <button
              class="text-button stash-edit-button"
              type="button"
              aria-label={`Stash settings for ${source.name}`}
              title="Stash settings"
              onclick={() => onStartEditingSource(source)}
            >
              <span class="stash-settings-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M5 7.5h14M5 12h14M5 16.5h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  <circle cx="9" cy="7.5" r="1.8" fill="currentColor" />
                  <circle cx="15.3" cy="12" r="1.8" fill="currentColor" />
                  <circle cx="11.2" cy="16.5" r="1.8" fill="currentColor" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </article>
    {/each}
  {/if}
</div>

<style>
  .my-stash-feed {
    min-height: 0;
    align-content: start;
  }

  .crate-feed {
    display: grid;
    gap: 12px;
    min-height: 0;
    max-height: 100%;
    overflow: auto;
    align-content: start;
  }

  .stash-card {
    position: relative;
    width: 100%;
    min-height: 116px;
    display: grid;
    align-content: start;
    box-sizing: border-box;
    padding: 18px 16px 14px;
    border-radius: 16px;
    color: #2d1e13;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.36), transparent 14%),
      linear-gradient(180deg, #f4dfb3 0%, #ecd19b 100%);
    border: 1px solid rgba(92, 58, 27, 0.18);
    overflow: hidden;
  }

  .stash-card::before {
    content: '';
    position: absolute;
    inset: 0 auto auto 50%;
    transform: translateX(-50%);
    width: 72px;
    height: 9px;
    border-radius: 0 0 10px 10px;
    background: rgba(101, 50, 24, 0.16);
    box-shadow: inset 0 -1px 0 rgba(72, 34, 15, 0.12);
    pointer-events: none;
  }

  .stash-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
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

  .stash-card-heading h3 {
    margin: 0;
    font-size: 1rem;
    line-height: 1.12;
  }

  .stash-index {
    width: 34px;
    height: 34px;
    align-self: start;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 0.92rem;
    line-height: 1;
    letter-spacing: 0.06em;
    color: #f7e9cb;
    background:
      radial-gradient(circle at 35% 35%, rgba(135, 54, 28, 0.98) 0%, rgba(108, 39, 19, 0.98) 68%, rgba(86, 28, 13, 1) 100%);
    border: 1px solid rgba(84, 32, 17, 0.42);
    box-shadow:
      inset 0 1px 0 rgba(255, 208, 171, 0.2),
      0 2px 6px rgba(61, 28, 11, 0.12);
  }

  .stash-card-top p {
    margin: 4px 0 0;
    color: rgba(70, 43, 22, 0.76);
    font-size: 0.9rem;
  }

  .stash-actions-group {
    display: grid;
    gap: 10px;
  }

  .loaded-stash-actions {
    display: inline-flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .load-button {
    align-self: start;
    min-width: 96px;
    padding: 10px 14px;
    border-radius: 12px;
    border: 2px solid rgb(253 137 95);
    background:
      linear-gradient(180deg, #f3e6c9 0%, #e1c895 100%);
    color: #7f1f1f;
    font-family: var(--font-display);
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
    box-shadow:
      inset 0 1px 0 rgba(255, 246, 225, 0.52),
      0 0 0 1px rgba(255, 134, 101, 0.14),
      0 6px 12px rgba(122, 41, 18, 0.16);
    transition: transform 140ms ease, opacity 140ms ease;
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

  .clear-stash-button {
    min-width: 92px;
    padding-inline: 15px;
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

  .stash-edit-button {
    align-self: start;
    min-width: 96px;
    padding: 10px 14px;
    color: #3a210f;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .stash-settings-icon {
    display: inline-flex;
    width: 20px;
    height: 20px;
  }

  .stash-settings-icon svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .stash-source-title-row,
  .loaded-card-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .stash-kind-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(91, 50, 24, 0.1);
    border: 1px solid rgba(109, 61, 28, 0.16);
    color: rgba(207, 47, 47, 0.72);
    font-family: var(--font-display);
    font-size: 0.64rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .stash-share-badge {
    background: rgba(116, 166, 95, 0.18);
    border-color: rgba(130, 205, 102, 0.28);
    color: rgba(50, 93, 26, 0.92);
  }

  .loaded-indicator {
    display: inline-flex;
    align-items: center;
    padding: 4px 9px;
    border-radius: 999px;
    background: rgba(91, 50, 24, 0.12);
    border: 1px solid rgba(109, 61, 28, 0.18);
    color: #5b2d14;
    font-family: var(--font-display);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .loaded-stash-card {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.4), transparent 14%),
      linear-gradient(180deg, #f6e6be 0%, #efcf94 100%);
  }

  .stash-card-highlighted {
    animation: stash-card-refresh 1.4s ease;
  }

  @keyframes stash-card-refresh {
    0% {
      opacity: 0.4;
      transform: translateY(18px);
      box-shadow:
        0 0 0 0 rgba(252, 137, 95, 0),
        0 12px 24px rgba(67, 28, 13, 0.12);
    }
    60% {
      opacity: 1;
      transform: translateY(0);
      box-shadow:
        0 0 0 4px rgba(252, 137, 95, 0.08),
        0 16px 28px rgba(67, 28, 13, 0.16);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
      box-shadow:
        0 0 0 0 rgba(252, 137, 95, 0),
        0 12px 24px rgba(67, 28, 13, 0.12);
    }
  }

  .status-success,
  .status-error {
    margin: 0;
    padding: 9px 12px 9px 14px;
    border-radius: 8px;
    font-size: 0.88rem;
    letter-spacing: 0.02em;
    border-left: 3px solid transparent;
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

  .empty-state h3 {
    margin: 0 0 6px;
  }

  .empty-state p {
    margin: 0;
  }

  .my-stash-state {
    padding-block: 28px;
    text-align: center;
  }

  @media (max-width: 860px) {
    .stash-card-top {
      flex-direction: column;
      align-items: stretch;
    }

    .stash-actions-group,
    .loaded-stash-actions {
      width: 100%;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: stretch;
    }

    .stash-actions-group :global(button),
    .loaded-stash-actions :global(button) {
      width: 100%;
    }

    .stash-card-top .load-button,
    .stash-card-top .stash-edit-button,
    .loaded-stash-actions .clear-stash-button,
    .loaded-stash-actions .stash-edit-button {
      margin-left: 0;
      justify-self: stretch;
    }
  }

  @media (max-width: 480px) {
    .stash-card {
      min-height: 0;
      padding: 16px 14px 12px;
    }

    .stash-card-top {
      gap: 10px;
    }

    .stash-card-heading {
      grid-template-columns: auto minmax(0, 1fr);
      gap: 10px;
    }

    .stash-card-heading h3 {
      font-size: 0.92rem;
    }

    .stash-index {
      width: 30px;
      height: 30px;
      font-size: 0.82rem;
    }

    .stash-card-top p {
      font-size: 0.84rem;
      line-height: 1.25;
    }

    .stash-actions-group,
    .loaded-stash-actions {
      gap: 8px;
      grid-template-columns: 1fr;
    }

    .stash-card-top .load-button,
    .stash-card-top .stash-edit-button,
    .loaded-stash-actions .clear-stash-button,
    .loaded-stash-actions .stash-edit-button {
      min-width: 0;
      padding: 9px 12px;
      font-size: 0.72rem;
      letter-spacing: 0.03em;
    }

    .stash-card-top .stash-edit-button,
    .loaded-stash-actions .stash-edit-button {
      padding: 9px 12px;
    }

    .my-stash-feed {
      gap: 10px;
    }
  }
</style>
