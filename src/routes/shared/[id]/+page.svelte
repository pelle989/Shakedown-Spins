<script lang="ts">
  import type { PrivateSourceSummary, LoadedSharedSource } from '$lib/types';

  let {
    data
  }: {
    data: {
      sharedSource: LoadedSharedSource;
      mySources: PrivateSourceSummary[];
      signedIn: boolean;
    };
  } = $props();

  let selectedMineSourceId = $state(data.mySources[0]?.id ?? '');

  const sharedOpenHref = $derived(`/?sharedSource=${data.sharedSource.id}`);
  const overlapHref = $derived(
    selectedMineSourceId
      ? `/?sharedSource=${data.sharedSource.id}&mineSource=${selectedMineSourceId}`
      : sharedOpenHref
  );
</script>

<svelte:head>
  <title>{data.sharedSource.name} • Shared Collection • Shakedown Spins</title>
</svelte:head>

<div class="shared-page">
  <div class="shared-card">
    <span class="shared-kicker">Shared Collection</span>
    <div class="shared-owner-block">
      <span class="shared-owner-label">Shared By</span>
      <div class="shared-owner-copy">
        <strong>{data.sharedSource.owner.publicProfileName}</strong>
        <span>{data.sharedSource.owner.displayName} · @{data.sharedSource.owner.handle}</span>
      </div>
    </div>
    <h1>{data.sharedSource.name}</h1>
    <p class="shared-subhead">
      {data.sharedSource.albumCount} albums · {data.sharedSource.kind.toUpperCase()} · Updated {new Date(
        data.sharedSource.updatedAt
      ).toLocaleDateString()}
    </p>

    <div class="shared-actions">
      <a class="shared-button shared-button-primary" href={sharedOpenHref}>Open in Shakedown Spins</a>
      {#if data.signedIn && data.mySources.length > 0}
        <a class="shared-button" href={overlapHref}>Play Matching Albums</a>
      {/if}
    </div>

    {#if data.signedIn && data.mySources.length > 0}
      <div class="compare-panel">
        <label for="compare-source">Compare with one of your sources</label>
        <select id="compare-source" bind:value={selectedMineSourceId}>
          {#each data.mySources as source}
            <option value={source.id}>{source.name} · {source.albumCount} albums</option>
          {/each}
        </select>
        <p>
          Load the matching-albums set into the main room and randomize only the albums you and
          {data.sharedSource.owner.publicProfileName} both share.
        </p>
      </div>
    {:else if data.signedIn}
      <p class="shared-note">
        Add a private source to My Stash first, then come back to compare matching albums with
        {data.sharedSource.owner.publicProfileName}.
      </p>
    {:else}
      <p class="shared-note">
        Sign in to compare this shared collection against one of your own private stashes.
      </p>
    {/if}

    <div class="shared-album-list">
      {#each data.sharedSource.albums.slice(0, 12) as album}
        <article class="shared-album-row">
          <strong>{album.title}</strong>
          <span>{album.artist}{album.year ? ` · ${album.year}` : ''}</span>
        </article>
      {/each}
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    min-height: 100vh;
    background:
      linear-gradient(180deg, rgba(255, 232, 187, 0.06), transparent 18%),
      linear-gradient(90deg, rgba(71, 31, 14, 0.16), rgba(120, 60, 27, 0.08) 16%, rgba(66, 29, 15, 0.14) 33%, rgba(116, 56, 26, 0.08) 52%, rgba(68, 31, 16, 0.14) 72%, rgba(112, 53, 24, 0.08) 100%),
      linear-gradient(180deg, #7b311b 0%, #6a2917 24%, #5b2415 48%, #4a1d12 72%, #38160e 100%);
    color: #f7ead0;
    font-family: Georgia, serif;
  }

  .shared-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 28px 18px;
  }

  .shared-card {
    width: min(100%, 760px);
    display: grid;
    gap: 18px;
    padding: 28px 26px;
    border-radius: 26px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.26)),
      linear-gradient(180deg, #3a2013 0%, #21120c 100%);
    border: 1px solid rgba(255, 225, 176, 0.14);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.08),
      0 24px 54px rgba(0, 0, 0, 0.28);
  }

  .shared-kicker {
    font-family: var(--font-display, Oswald, sans-serif);
    font-size: 0.86rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(252, 137, 95, 0.9);
  }

  .shared-owner-block {
    display: grid;
    gap: 6px;
    padding: 14px 16px 15px;
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255, 228, 177, 0.08), rgba(24, 10, 6, 0.2));
    border: 1px solid rgba(255, 228, 177, 0.08);
  }

  .shared-owner-label {
    font-family: var(--font-display, Oswald, sans-serif);
    font-size: 0.8rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(252, 137, 95, 0.9);
  }

  .shared-owner-copy {
    display: grid;
    gap: 4px;
  }

  .shared-owner-copy strong {
    font-family: var(--font-ui, Arial, sans-serif);
    font-size: 1.14rem;
    color: #f7ead0;
  }

  .shared-owner-copy span {
    color: #dbc8a4;
    font-size: 0.95rem;
  }

  h1 {
    margin: 0;
    font-family: var(--font-ui, Arial, sans-serif);
    font-size: clamp(2rem, 4vw, 2.9rem);
    line-height: 1.02;
  }

  .shared-subhead,
  .shared-note,
  .compare-panel p {
    margin: 0;
    color: #dbc8a4;
    font-size: 0.98rem;
    line-height: 1.5;
  }

  .shared-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .shared-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 54px;
    padding: 0 20px;
    border-radius: 999px;
    background:
      linear-gradient(180deg, #f1dfb7 0%, #dfc28b 100%);
    color: #3a210f;
    font-family: var(--font-display, Oswald, sans-serif);
    font-size: 0.9rem;
    letter-spacing: 0.08em;
    text-decoration: none;
    text-transform: uppercase;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
  }

  .shared-button-primary {
    background:
      radial-gradient(circle at 50% 18%, rgba(255, 204, 157, 0.34), transparent 48%),
      linear-gradient(180deg, rgba(255, 118, 64, 0.96), rgba(196, 34, 22, 0.94));
    color: #ffe6b7;
    border: 1px solid rgba(78, 47, 28, 0.72);
    box-shadow:
      inset 0 2px 0 rgba(255, 233, 214, 0.2),
      inset 0 -2px 0 rgba(90, 14, 8, 0.28),
      0 20px 28px rgba(44, 8, 4, 0.2);
  }

  .compare-panel {
    display: grid;
    gap: 10px;
    padding: 18px;
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255, 228, 177, 0.06), rgba(24, 10, 6, 0.2));
    border: 1px solid rgba(255, 228, 177, 0.08);
  }

  .compare-panel label {
    font-family: var(--font-display, Oswald, sans-serif);
    font-size: 0.88rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #f1d79d;
  }

  .compare-panel select {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid rgba(255, 228, 177, 0.14);
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(248, 228, 190, 0.12), rgba(52, 23, 11, 0.32)),
      rgba(28, 13, 8, 0.72);
    color: #f7ead0;
    padding: 12px 14px;
    font: inherit;
  }

  .shared-album-list {
    display: grid;
    gap: 10px;
  }

  .shared-album-row {
    display: grid;
    gap: 4px;
    padding: 12px 14px;
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.06), rgba(31, 14, 8, 0.22)),
      linear-gradient(180deg, #321b11 0%, #1f120c 100%);
    border: 1px solid rgba(255, 225, 176, 0.1);
  }

  .shared-album-row strong {
    font-family: var(--font-ui, Arial, sans-serif);
    font-size: 1rem;
  }

  .shared-album-row span {
    color: #d8c39c;
    font-size: 0.92rem;
  }
</style>
