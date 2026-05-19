<script lang="ts">
  import type {
    ActiveCollectionState,
    FriendStashSummary,
    LoadedSharedSource,
    PrivateSourceSummary,
    SharedOverlapCollection
  } from '$lib/types';

  type Props = {
    activeState: ActiveCollectionState;
    activeSharedOverlapSummary: SharedOverlapCollection | null;
    activeSharedSourceSummary: LoadedSharedSource | null;
    highlightedSourceId: string | null;
    loadingStashId: string | null;
    deletingFriendSourceId: string | null;
    friendMatchingCountLoadingKey: string | null;
    friendShelfVisible: boolean;
    visibleFriendStashes: FriendStashSummary[];
    mySources: PrivateSourceSummary[];
    signedIn: boolean;
    getFriendLoadMode: (sourceId: string) => 'full' | 'matching';
    getFriendShelfSourceId: (sourceId: string) => string;
    getFriendMatchingCount: (sourceId: string, mineSourceId: string) => number | null;
    onUnloadStash: () => void | Promise<void>;
    onLoadFriendSource: (source: FriendStashSummary) => void | Promise<void>;
    onRequestDeleteFriendStash: (source: FriendStashSummary) => void;
    onToggleFriendMode: (sourceId: string) => void | Promise<void>;
    onChangeFriendShelfSource: (sourceId: string, mineSourceId: string) => void;
  };

  let {
    activeState,
    activeSharedOverlapSummary,
    activeSharedSourceSummary,
    highlightedSourceId,
    loadingStashId,
    deletingFriendSourceId,
    friendMatchingCountLoadingKey,
    friendShelfVisible,
    visibleFriendStashes,
    mySources,
    signedIn,
    getFriendLoadMode,
    getFriendShelfSourceId,
    getFriendMatchingCount,
    onUnloadStash,
    onLoadFriendSource,
    onRequestDeleteFriendStash,
    onToggleFriendMode,
    onChangeFriendShelfSource
  }: Props = $props();
</script>

<div class="crate-feed loaded-crate-feed">
  {#if activeSharedOverlapSummary}
    <article
      class:stash-card-highlighted={highlightedSourceId === activeSharedOverlapSummary.sharedSourceId}
      class="stash-card record-card loaded-stash-card"
    >
      <div class="stash-card-top">
        <div class="stash-card-heading">
          <div>
            <div class="loaded-card-title-row">
              <h3>{activeSharedOverlapSummary.sharedSourceName}</h3>
              <span class="loaded-indicator">Friend</span>
            </div>
            <p>@{activeSharedOverlapSummary.sharedOwner.handle}</p>
            <p>{activeSharedOverlapSummary.albumCount} matching albums loaded into the room</p>
          </div>
        </div>
        <div class="loaded-stash-actions">
          <button class="load-button clear-stash-button" type="button" onclick={onUnloadStash}>Clear</button>
        </div>
      </div>
    </article>
  {/if}

  {#if activeSharedSourceSummary && !activeSharedOverlapSummary}
    <article
      class:stash-card-highlighted={highlightedSourceId === activeSharedSourceSummary.id}
      class="stash-card record-card loaded-stash-card"
    >
      <div class="stash-card-top">
        <div class="stash-card-heading">
          <div>
            <div class="loaded-card-title-row">
              <h3>{activeSharedSourceSummary.name}</h3>
              <span class="loaded-indicator">Friend</span>
            </div>
            <p>@{activeSharedSourceSummary.owner.handle}</p>
            <p>{activeSharedSourceSummary.albumCount} albums loaded from a friend's shared collection</p>
          </div>
        </div>
        <div class="loaded-stash-actions">
          <button class="load-button clear-stash-button" type="button" onclick={onUnloadStash}>Clear</button>
        </div>
      </div>
    </article>
  {/if}

  {#if friendShelfVisible && visibleFriendStashes.length === 0}
    <div class="empty-state">
      <h3>Friends Stash</h3>
      <p>Shared collections from friends will appear here.</p>
    </div>
  {/if}

  {#if friendShelfVisible && visibleFriendStashes.length > 0}
    {#each visibleFriendStashes as friendSource}
      <article
        class:stash-card-highlighted={highlightedSourceId === friendSource.id}
        class="stash-card record-card friend-shelf-card"
      >
        <div class="stash-card-top">
          <div class="stash-card-heading">
            <span class="stash-index">@</span>
            <div>
              <div class="stash-source-title-row">
                <h3>{friendSource.name}</h3>
                <span class="stash-kind-badge stash-share-badge">friend</span>
              </div>
              <p>
                @{friendSource.owner.handle} ·
                {#if getFriendLoadMode(friendSource.id) === 'matching'}
                  {#if friendMatchingCountLoadingKey === `${friendSource.id}:${getFriendShelfSourceId(friendSource.id)}`}
                    Calculating matches...
                  {:else}
                    {getFriendMatchingCount(friendSource.id, getFriendShelfSourceId(friendSource.id)) ?? 0} matching albums
                  {/if}
                {:else}
                  {friendSource.albumCount} albums
                {/if}
              </p>
            </div>
          </div>
          <div class="stash-actions-group friend-stash-actions">
            <button
              class="load-button"
              type="button"
              disabled={
                loadingStashId === friendSource.id ||
                (getFriendLoadMode(friendSource.id) === 'matching' && !getFriendShelfSourceId(friendSource.id)) ||
                (activeState.status === 'loaded' &&
                  ((activeState.collection.source.kind === 'shared' &&
                    activeState.collection.source.id === friendSource.id &&
                    getFriendLoadMode(friendSource.id) === 'full') ||
                    (activeState.collection.source.kind === 'shared-overlap' &&
                      activeState.collection.source.sharedSourceId === friendSource.id &&
                      getFriendLoadMode(friendSource.id) === 'matching')))
              }
              onclick={() => {
                void onLoadFriendSource(friendSource);
              }}
            >
              {#if loadingStashId === friendSource.id}
                Loading...
              {:else if activeState.status === 'loaded' &&
                ((activeState.collection.source.kind === 'shared' &&
                  activeState.collection.source.id === friendSource.id &&
                  getFriendLoadMode(friendSource.id) === 'full') ||
                  (activeState.collection.source.kind === 'shared-overlap' &&
                    activeState.collection.source.sharedSourceId === friendSource.id &&
                    getFriendLoadMode(friendSource.id) === 'matching'))}
                Loaded
              {:else}
                Load
              {/if}
            </button>
            <button
              class="text-button stash-edit-button"
              type="button"
              disabled={deletingFriendSourceId === friendSource.id}
              onclick={() => {
                onRequestDeleteFriendStash(friendSource);
              }}
            >
              {deletingFriendSourceId === friendSource.id ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
        {#if signedIn && mySources.length > 0}
          <div class="friend-stash-compare friend-stash-shelf-compare">
            <div class="friend-stash-compare-head">
              <span class="friend-stash-compare-title">Matching Albums</span>
              <button
                class:friend-stash-shelf-toggle-active={getFriendLoadMode(friendSource.id) === 'matching'}
                class="friend-stash-shelf-toggle"
                type="button"
                role="switch"
                aria-checked={getFriendLoadMode(friendSource.id) === 'matching'}
                title={getFriendLoadMode(friendSource.id) === 'matching' ? 'Matching Albums' : 'Full Collection'}
                aria-label={getFriendLoadMode(friendSource.id) === 'matching' ? 'Matching albums only' : 'Full collection'}
                onclick={() => {
                  void onToggleFriendMode(friendSource.id);
                }}
              >
                <span class="friend-stash-shelf-toggle-track" aria-hidden="true">
                  <span class="friend-stash-shelf-toggle-thumb"></span>
                </span>
              </button>
            </div>
            {#if mySources.length > 1}
              <label for={`friend-shelf-source-${friendSource.id}`}>Compare against one of your stashes</label>
              <select
                id={`friend-shelf-source-${friendSource.id}`}
                value={getFriendShelfSourceId(friendSource.id)}
                onchange={(event) => {
                  onChangeFriendShelfSource(friendSource.id, (event.currentTarget as HTMLSelectElement).value);
                }}
              >
                {#each mySources as source}
                  <option value={source.id}>{source.name} · {source.albumCount} albums</option>
                {/each}
              </select>
            {:else}
              <p class="status-note friend-stash-note">
                Compare against {mySources[0]?.name}.
              </p>
            {/if}
          </div>
        {:else if signedIn && mySources.length === 0}
          <p class="status-note friend-stash-note">
            Add a private stash to My Stash to view the shared crossover albums.
          </p>
        {:else}
          <p class="status-note friend-stash-note">
            Sign in and compare this collection against one of your own stashes.
          </p>
        {/if}
      </article>
    {/each}
  {/if}
</div>

<style>
  .crate-feed {
    position: relative;
    display: grid;
    align-content: start;
    grid-auto-rows: max-content;
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

  .loaded-crate-feed {
    max-height: none;
    justify-items: center;
  }

  .empty-state {
    width: 100%;
    padding: 28px 20px;
    text-align: center;
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(255, 237, 205, 0.08), rgba(29, 13, 8, 0.18)),
      linear-gradient(180deg, #2a150b 0%, #1a0d06 100%);
    border: 1px solid rgba(255, 223, 169, 0.08);
  }

  .empty-state h3,
  .stash-card h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.18rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .empty-state p {
    margin: 8px 0 0;
    color: rgba(241, 214, 163, 0.74);
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

  .friend-shelf-card {
    min-height: 178px;
    gap: 10px;
    overflow: visible;
  }

  .stash-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 10px;
  }

  .friend-shelf-card .stash-card-top {
    margin-bottom: 0;
  }

  .stash-card-heading {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    min-width: 0;
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

  .stash-source-title-row {
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

  .stash-card p {
    margin: 4px 0 0;
    color: rgba(70, 43, 22, 0.76);
    font-size: 0.9rem;
  }

  .stash-actions-group {
    display: grid;
    gap: 10px;
  }

  .load-button {
    align-self: start;
    min-width: 96px;
    padding: 10px 14px;
    border-radius: 12px;
    border: 2px solid rgb(253 137 95);
    background: linear-gradient(180deg, #f3e6c9 0%, #e1c895 100%);
    color: #7f1f1f;
    font-family: "Satoshi", "Avenir Next", "Helvetica Neue", sans-serif;
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
    box-shadow:
      inset 0 1px 0 rgba(255, 246, 225, 0.52),
      0 0 0 1px rgba(255, 134, 101, 0.14),
      0 6px 12px rgba(122, 41, 18, 0.16);
  }

  .load-button:hover:not(:disabled),
  .load-button:focus-visible:not(:disabled),
  .text-button:hover:not(:disabled),
  .text-button:focus-visible:not(:disabled) {
    transform: translateY(-1px) scale(1.02);
    box-shadow:
      inset 0 1px 0 rgba(255, 246, 225, 0.52),
      0 0 0 1px rgba(255, 134, 101, 0.18),
      0 8px 14px rgba(122, 41, 18, 0.18);
  }

  .clear-stash-button {
    min-width: 92px;
    padding-inline: 15px;
  }

  .text-button {
    padding: 8px 12px;
    border-radius: 999px;
    border: 0;
    background: linear-gradient(180deg, #f1dfb7 0%, #dfc28b 100%);
    color: #3a210f;
    font-family: "Satoshi", "Avenir Next", "Helvetica Neue", sans-serif;
    font-size: 0.8rem;
    line-height: 1.2;
    letter-spacing: 0.04em;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
    transition: transform 140ms ease, box-shadow 140ms ease, opacity 140ms ease;
  }

  .stash-edit-button {
    align-self: start;
    font-size: 0.8rem;
    color: #3a210f;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .loaded-stash-actions {
    display: inline-flex;
    align-items: flex-start;
  }

  .loaded-card-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .loaded-indicator {
    display: inline-flex;
    align-items: center;
    padding: 5px 10px;
    border-radius: 999px;
    color: #ffffff;
    font-family: var(--font-display);
    font-size: 0.66rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: linear-gradient(180deg, rgb(255 68 0 / 72%), rgba(207, 47, 47, 0.72));
    border: 3px solid rgb(252 94 94);
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

  .friend-stash-compare {
    display: grid;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 16px;
    background: linear-gradient(180deg, rgb(255 245 226), rgb(255 225 176));
    border: 1px solid rgba(143, 98, 53, 0.22);
  }

  .friend-stash-compare-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .friend-stash-compare-title,
  .friend-stash-compare label {
    color: rgba(120, 36, 25, 0.82);
    font-family: var(--font-display);
    font-size: 0.78rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .friend-stash-shelf-compare {
    display: grid;
    margin-top: 0;
    width: 100%;
    box-sizing: border-box;
    align-self: stretch;
    min-height: max-content;
    overflow: visible;
  }

  .friend-stash-compare select {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid rgba(143, 98, 53, 0.28);
    background:
      linear-gradient(180deg, rgba(255, 249, 236, 0.72), rgba(236, 217, 181, 0.82));
    color: #4c2414;
    font: inherit;
  }

  .friend-stash-note {
    margin: 0;
    color: rgba(120, 36, 25, 0.82);
  }

  .friend-stash-shelf-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    width: 44px;
    height: 24px;
    padding: 2px;
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(255, 112, 96, 0.92), rgba(177, 40, 35, 0.94));
    border: 1px solid rgba(126, 28, 20, 0.24);
  }

  .friend-stash-shelf-toggle-track {
    display: inline-flex;
    align-items: center;
    width: 100%;
    height: 100%;
    padding: 1px;
    border-radius: inherit;
    background:
      linear-gradient(180deg, rgba(207, 47, 47, 0.92), rgba(140, 24, 24, 0.94));
    transition: background 180ms ease;
  }

  .friend-stash-shelf-toggle-active .friend-stash-shelf-toggle-track {
    background:
      linear-gradient(180deg, rgba(108, 193, 104, 0.95), rgba(58, 132, 62, 0.98));
  }

  .friend-stash-shelf-toggle-thumb {
    width: 18px;
    height: 18px;
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(255, 248, 230, 0.95), rgba(224, 205, 164, 0.98));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.5),
      0 1px 3px rgba(51, 20, 8, 0.22);
    transform: translateX(0);
    transition: transform 180ms ease;
  }

  .friend-stash-shelf-toggle-active .friend-stash-shelf-toggle-thumb {
    transform: translateX(20px);
  }

  @media (max-width: 860px) {
    .stash-card-top {
      flex-direction: column;
      align-items: stretch;
    }

    .friend-stash-actions,
    .loaded-stash-actions {
      width: 100%;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: stretch;
    }

    .friend-stash-actions :global(button),
    .loaded-stash-actions :global(button) {
      width: 100%;
    }
  }

  @media (max-width: 480px) {
    .crate-feed {
      padding: 16px 10px 10px;
      gap: 10px;
    }

    .stash-card {
      min-height: 0;
      padding: 16px 14px 12px;
    }

    .friend-shelf-card {
      min-height: 0;
      gap: 8px;
    }

    .stash-card-top {
      gap: 10px;
      margin-bottom: 8px;
    }

    .stash-card-heading {
      grid-template-columns: auto minmax(0, 1fr);
      gap: 10px;
    }

    .empty-state h3,
    .stash-card h3 {
      font-size: 0.96rem;
    }

    .stash-index {
      width: 30px;
      height: 30px;
      font-size: 0.8rem;
    }

    .stash-card p {
      font-size: 0.84rem;
      line-height: 1.25;
    }

    .friend-stash-actions,
    .loaded-stash-actions {
      gap: 8px;
      grid-template-columns: 1fr;
    }

    .load-button,
    .text-button,
    .clear-stash-button {
      min-width: 0;
      width: 100%;
      padding: 9px 12px;
      font-size: 0.72rem;
      letter-spacing: 0.03em;
    }

    .friend-stash-compare {
      gap: 8px;
      padding: 12px;
    }

    .friend-stash-compare-head {
      gap: 10px;
    }

    .friend-stash-compare-title,
    .friend-stash-compare label {
      font-size: 0.72rem;
      letter-spacing: 0.08em;
    }

    .friend-stash-compare select {
      padding: 10px 12px;
      font-size: 0.84rem;
    }
  }
</style>
