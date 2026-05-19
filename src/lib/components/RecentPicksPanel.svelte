<script lang="ts">
  import VinylLoader from '$lib/components/VinylLoader.svelte';
  import type { Album } from '$lib/types';

  type Props = {
    databaseAvailable: boolean;
    recentHistory: Album[];
  };

  let { databaseAvailable, recentHistory }: Props = $props();
</script>

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
      <div class="history-list history-list-skeleton" aria-hidden="true">
        {#each Array.from({ length: 5 }) as _, index}
          <div class="history-item history-item-skeleton">
            <div class="history-index skeleton-index">{index + 1}</div>
            <div class="history-art history-art-skeleton"></div>
            <div class="history-copy history-copy-skeleton">
              <span class="skeleton-line skeleton-line-title"></span>
              <span class="skeleton-line skeleton-line-artist"></span>
            </div>
          </div>
        {/each}
      </div>
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

<style>
  .panel {
    border-radius: 24px;
  }

  .queue-panel {
    display: grid;
    gap: 18px;
    min-height: 0;
    background:
      radial-gradient(120% 100% at 50% 0%, rgba(255, 255, 255, 0.38), transparent 22%),
      linear-gradient(180deg, rgba(64, 36, 20, 0.84), rgba(26, 14, 8, 0.96)),
      #20110a;
    border: 1px solid rgba(255, 225, 176, 0.1);
    box-shadow:
      inset 0 1px 0 rgba(255, 239, 212, 0.06),
      inset 0 -1px 0 rgba(5, 2, 1, 0.26);
    padding: 16px;
  }

  .queue-section {
    display: grid;
    gap: 14px;
    min-height: 0;
  }

  .history.queue-section {
    min-height: 0;
    align-content: start;
  }

  .queue-section-header {
    min-height: 40.5px;
    display: flex;
    align-items: center;
  }

  .queue-section-header h3 {
    margin: 0;
    color: #f5deb0;
    font-family: var(--font-display);
    font-size: 0.92rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
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
    color: var(--color-paper);
    background:
      linear-gradient(180deg, rgba(255, 237, 205, 0.1), rgba(47, 22, 12, 0.24));
    border: 1px solid rgba(255, 228, 177, 0.12);
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

  .history-list-skeleton {
    gap: 14px;
  }

  .history-item-skeleton {
    opacity: 0.86;
    min-height: 106px;
    box-sizing: border-box;
  }

  .skeleton-index {
    color: rgba(232, 214, 181, 0.34);
  }

  .history-art-skeleton {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.2)),
      linear-gradient(180deg, #2f1a10 0%, #1d110a 100%);
    border: 1px solid rgba(255, 225, 176, 0.08);
    position: relative;
    overflow: hidden;
  }

  .history-art-skeleton::before {
    content: "";
    position: absolute;
    inset: 10px;
    border-radius: 999px;
    background:
      radial-gradient(circle at center, rgba(255, 236, 198, 0.06) 0 10%, transparent 11%),
      radial-gradient(circle at center, transparent 0 57%, rgba(255, 225, 176, 0.09) 58% 62%, transparent 63%),
      linear-gradient(180deg, rgba(255, 236, 198, 0.06), rgba(31, 14, 8, 0.12));
    border: 1px solid rgba(255, 225, 176, 0.06);
  }

  .history-copy-skeleton {
    display: grid;
    gap: 8px;
    width: 100%;
  }

  .skeleton-line {
    display: block;
    height: 11px;
    border-radius: 999px;
    background:
      linear-gradient(90deg, rgba(255, 236, 198, 0.06), rgba(255, 236, 198, 0.14), rgba(255, 236, 198, 0.06));
    border: 1px solid rgba(255, 225, 176, 0.04);
  }

  .skeleton-line-title {
    width: 78%;
  }

  .skeleton-line-artist {
    width: 56%;
  }

  .status-error {
    margin: 0;
    padding: 9px 12px 9px 14px;
    border-radius: 8px;
    font-size: 0.88rem;
    letter-spacing: 0.02em;
    border-left: 3px solid rgba(255, 160, 138, 0.7);
    background:
      linear-gradient(90deg, rgba(184, 74, 49, 0.2), rgba(184, 74, 49, 0.08));
    color: #f8d1c5;
  }

  @media (max-width: 980px) {
    .queue-panel {
      padding: 14px;
    }
  }
</style>
