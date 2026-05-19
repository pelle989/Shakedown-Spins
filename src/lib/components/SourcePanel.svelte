<script lang="ts">
  import VinylLoader from '$lib/components/VinylLoader.svelte';
  import type { DiscogsConnectionSummary, PrivateSourceSummary, UploadPreview } from '$lib/types';

  type Props = {
    signedIn: boolean;
    sourceTab: 'csv' | 'discogs';
    replacingCsvSourceId: string | null;
    highlightSourceReplaceBanner: boolean;
    stashName: string;
    stashNameError: string | null;
    preview: UploadPreview | null;
    uploadError: string | null;
    csvSuccessMessage: string | null;
    pendingUpload: boolean;
    uploadDestination: 'private' | 'public';
    discogsConnection: DiscogsConnectionSummary | null;
    discogsOAuthEnabled: boolean;
    discogsSourceSummary: PrivateSourceSummary | null;
    discogsStatusMessage: string | null;
    discogsSuccessMessage: string | null;
    importingDiscogs: boolean;
    formatSourceDateTime: (value?: string | null) => string;
    onSetSourceTab: (tab: 'csv' | 'discogs') => void;
    onOpenLoginModal: () => void;
    onSubmitUpload: (event: SubmitEvent) => void | Promise<void>;
    onCancelReplacingCsvSource: () => void;
    onStashNameInput: (event: Event) => void;
    onHandleFileChange: (event: Event) => void | Promise<void>;
    onSetUploadDestination: (destination: 'private' | 'public') => void;
    onImportFromDiscogs: () => void | Promise<void>;
    onOpenResetDiscogsWarning: () => void;
    onOpenDiscogsTokenModal: () => void;
  };

  let {
    signedIn,
    sourceTab,
    replacingCsvSourceId,
    highlightSourceReplaceBanner,
    stashName,
    stashNameError,
    preview,
    uploadError,
    csvSuccessMessage,
    pendingUpload,
    uploadDestination,
    discogsConnection,
    discogsOAuthEnabled,
    discogsSourceSummary,
    discogsStatusMessage,
    discogsSuccessMessage,
    importingDiscogs,
    formatSourceDateTime,
    onSetSourceTab,
    onOpenLoginModal,
    onSubmitUpload,
    onCancelReplacingCsvSource,
    onStashNameInput,
    onHandleFileChange,
    onSetUploadDestination,
    onImportFromDiscogs,
    onOpenResetDiscogsWarning,
    onOpenDiscogsTokenModal
  }: Props = $props();
</script>

<section class="bottom-panel source-panel">
  <div class="queue-section-header">
    <h3>Source</h3>
  </div>

  <div class="source-panel-body">
    <div class="source-tab-strip" role="tablist" aria-label="Source types">
      <button
        class:source-tab-active={sourceTab === 'csv'}
        class="source-tab"
        type="button"
        role="tab"
        aria-selected={sourceTab === 'csv'}
        onclick={() => onSetSourceTab('csv')}
      >
        CSV
      </button>
      <button
        class:source-tab-active={sourceTab === 'discogs'}
        class:source-tab-disabled={!signedIn}
        class="source-tab"
        type="button"
        role="tab"
        aria-selected={sourceTab === 'discogs'}
        aria-disabled={!signedIn}
        onclick={() => {
          if (signedIn) onSetSourceTab('discogs');
          else onOpenLoginModal();
        }}
      >
        <span>Discogs</span>
        {#if !signedIn}
          <span class="stash-tab-badge">Sign in</span>
        {/if}
      </button>
    </div>

    {#if sourceTab === 'csv'}
      <form onsubmit={onSubmitUpload} class="upload-form compact-upload">
        {#if replacingCsvSourceId}
          <div class:source-replace-banner-active={highlightSourceReplaceBanner} class="source-replace-banner">
            <div>
              <strong>Replacing existing CSV stash</strong>
              <p>The stash identity, sharing, and friend links stay the same. The album list will be replaced.</p>
            </div>
            <button class="text-button" type="button" onclick={onCancelReplacingCsvSource}>
              Cancel
            </button>
          </div>
        {/if}
        <label class:field-error={!!stashNameError}>
          <span>Stash Name <span class="required-indicator" aria-hidden="true">*</span></span>
          <input
            value={stashName}
            maxlength="100"
            class:input-error={!!stashNameError}
            placeholder="Collection Name"
            oninput={onStashNameInput}
          />
          {#if stashNameError}
            <p class="field-error-text">{stashNameError}</p>
          {/if}
        </label>

        <label>
          <span>CSV File</span>
          <input id="stash-file" type="file" accept=".csv,text/csv" onchange={onHandleFileChange} />
        </label>

        {#if signedIn}
          <div class="upload-destination-toggle" role="radiogroup" aria-label="Upload destination">
            <button
              class:upload-destination-active={uploadDestination === 'private'}
              class="upload-destination-button"
              type="button"
              role="radio"
              aria-checked={uploadDestination === 'private'}
              onclick={() => onSetUploadDestination('private')}
            >
              Private
            </button>
            <button
              class:upload-destination-active={uploadDestination === 'public'}
              class="upload-destination-button"
              type="button"
              role="radio"
              aria-checked={uploadDestination === 'public'}
              onclick={() => onSetUploadDestination('public')}
            >
              Public
            </button>
          </div>
        {/if}

        <div class="source-status">
          {#if preview}
            <p class="status-note">
              Found {preview.validAlbums} valid albums, {preview.skippedRows} rows skipped.
            </p>
          {/if}

          {#if uploadError}
            <p class="status-error">{uploadError}</p>
          {/if}

          {#if csvSuccessMessage}
            <p class="status-success">{csvSuccessMessage}</p>
          {/if}
        </div>

        <div class="source-actions">
          <button class="load-button upload-button" type="submit" disabled={pendingUpload || !preview || preview.validAlbums === 0}>
            {#if pendingUpload}
              Uploading...
            {:else if replacingCsvSourceId}
              Replace Stash
            {:else if signedIn && uploadDestination === 'private'}
              Upload Stash
            {:else if signedIn && uploadDestination === 'public'}
              Add to Street Feed
            {:else}
              Upload Stash
            {/if}
          </button>
          {#if pendingUpload}
            <div class="pending-inline">
              <VinylLoader size={30} active={true} />
            </div>
          {/if}
        </div>
      </form>
    {:else}
      <div class="discogs-module source-discogs-module">
        <div class="discogs-copy">
          <span class="auth-kicker">Discogs</span>
          {#if discogsConnection}
            <strong>Connected as {discogsConnection.username}</strong>
            <p>
              Connected via
              {discogsConnection.authMode === 'oauth' ? 'Discogs OAuth' : 'Personal Token'}
            </p>
            <p>Last imported: {formatSourceDateTime(discogsSourceSummary?.lastSyncedAt)}</p>
          {:else}
            <strong>Discogs not connected</strong>
            <p>Paste a personal Discogs token to connect your private collection.</p>
          {/if}
          {#if discogsStatusMessage}
            <p class="auth-error-note">{discogsStatusMessage}</p>
          {/if}
          {#if uploadError}
            <p class="status-error">{uploadError}</p>
          {/if}
          {#if discogsSuccessMessage}
            <p class="status-success">{discogsSuccessMessage}</p>
          {/if}
        </div>
        <div class="discogs-actions source-discogs-actions">
          {#if discogsConnection}
            <button class="load-button" type="button" disabled={importingDiscogs} onclick={onImportFromDiscogs}>
              {importingDiscogs
                ? 'Refreshing...'
                : discogsSourceSummary
                  ? 'Manual Refresh'
                  : 'Import Discogs'}
            </button>
            <button
              class="load-button clear-stash-button"
              type="button"
              onclick={onOpenResetDiscogsWarning}
            >
              Reset Discogs Key
            </button>
          {:else}
            <button class="load-button discogs-connect-button" type="button" onclick={onOpenDiscogsTokenModal}>
              Use Personal Token
            </button>
            {#if discogsOAuthEnabled}
              <a class="load-button discogs-connect-button" href="/api/discogs/oauth/start">
                Connect with OAuth
              </a>
            {/if}
          {/if}
        </div>
      </div>
    {/if}
  </div>
</section>

<style>
  .source-panel {
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

  .source-panel > .queue-section-header {
    margin-bottom: 14px;
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
    line-height: 1;
    text-transform: uppercase;
  }

  .source-panel-body {
    display: grid;
    gap: 14px;
    min-height: 0;
    overflow: auto;
    align-content: start;
    padding-right: 4px;
  }

  .source-tab-strip {
    display: inline-flex;
    gap: 8px;
    padding: 6px;
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(255, 237, 205, 0.08), rgba(29, 13, 8, 0.28)),
      linear-gradient(180deg, #2a150b 0%, #1a0d06 100%);
    border: 1px solid rgba(255, 223, 169, 0.08);
    box-shadow:
      inset 0 1px 0 rgba(255, 241, 214, 0.04),
      inset 0 -1px 0 rgba(8, 4, 2, 0.28);
  }

  .source-tab {
    min-width: 112px;
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid transparent;
    background: transparent;
    color: rgba(232, 214, 181, 0.74);
    font-family: var(--font-ui);
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
    box-shadow: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: transform 140ms ease, opacity 140ms ease;
  }

  .source-tab:hover:not(:disabled),
  .source-tab:focus-visible:not(:disabled) {
    color: #f7ead0;
    border-color: rgba(255, 214, 150, 0.12);
    background: rgba(255, 244, 220, 0.04);
  }

  .source-tab-active {
    color: #fff1d2;
    border-color: rgb(252 137 95 / 69%);
    background:
      linear-gradient(180deg, rgba(255, 240, 210, 0.08), rgba(102, 44, 23, 0.18)),
      linear-gradient(180deg, rgba(255, 167, 126, 0.12), rgba(140, 50, 26, 0.18));
    box-shadow:
      inset 0 1px 0 rgba(255, 245, 225, 0.08),
      0 0 0 1px rgba(214, 93, 58, 0.08);
  }

  .source-tab-disabled {
    color: rgba(210, 191, 158, 0.36);
    cursor: pointer;
    opacity: 0.8;
  }

  .source-tab-disabled:hover,
  .source-tab-disabled:focus-visible {
    color: rgba(241, 214, 163, 0.92);
    border-color: rgba(255, 214, 150, 0.12);
    background: rgba(255, 244, 220, 0.04);
  }

  .stash-tab-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(255, 232, 187, 0.08);
    border: 1px solid rgba(255, 225, 176, 0.1);
    color: rgba(241, 214, 163, 0.78);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .upload-form {
    display: grid;
    gap: 10px;
  }

  .compact-upload {
    gap: 29px;
    margin-top: 4px;
  }

  .source-replace-banner {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.22)),
      linear-gradient(180deg, #342015 0%, #22140d 100%);
    border: 1px solid rgba(255, 225, 176, 0.1);
  }

  .source-replace-banner strong {
    display: block;
    font-family: var(--font-ui);
    font-size: 0.96rem;
    letter-spacing: 0.02em;
  }

  .source-replace-banner p {
    margin: 6px 0 0;
    color: var(--color-text-muted);
    font-size: 0.84rem;
    line-height: 1.35;
  }

  .source-replace-banner-active {
    transform-origin: center top;
    animation: source-replace-banner-signal 1.4s ease;
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.1),
      0 0 0 2px rgba(252, 137, 95, 0.16),
      0 0 22px rgba(252, 137, 95, 0.16);
  }

  @keyframes source-replace-banner-signal {
    0% {
      transform: translateY(8px) scale(0.985);
      opacity: 0.72;
      box-shadow:
        inset 0 1px 0 rgba(255, 238, 200, 0.04),
        0 0 0 0 rgba(252, 137, 95, 0.08),
        0 0 0 rgba(252, 137, 95, 0.08);
    }
    55% {
      transform: translateY(0) scale(1);
      opacity: 1;
      box-shadow:
        inset 0 1px 0 rgba(255, 238, 200, 0.12),
        0 0 0 3px rgba(252, 137, 95, 0.18),
        0 0 26px rgba(252, 137, 95, 0.2);
    }
    100% {
      transform: translateY(0) scale(1);
      opacity: 1;
      box-shadow:
        inset 0 1px 0 rgba(255, 238, 200, 0.1),
        0 0 0 2px rgba(252, 137, 95, 0.16),
        0 0 22px rgba(252, 137, 95, 0.16);
    }
  }

  label {
    display: grid;
    gap: 6px;
  }

  label span {
    color: #eedcb7;
    font-size: 0.92rem;
  }

  .required-indicator {
    color: #ffbc9d;
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

  .upload-destination-toggle {
    display: inline-flex;
    gap: 8px;
    padding: 6px;
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(255, 237, 205, 0.08), rgba(29, 13, 8, 0.2)),
      linear-gradient(180deg, #2a150b 0%, #1a0d06 100%);
    border: 1px solid rgba(255, 223, 169, 0.08);
  }

  .upload-destination-button {
    min-width: 104px;
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid transparent;
    background: transparent;
    color: rgba(232, 214, 181, 0.74);
    font-family: var(--font-ui);
    font-size: 0.76rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .upload-destination-active {
    color: #fff1d2;
    border-color: rgba(214, 93, 58, 0.22);
    background:
      linear-gradient(180deg, rgba(255, 240, 210, 0.08), rgba(102, 44, 23, 0.18)),
      linear-gradient(180deg, rgba(255, 167, 126, 0.12), rgba(140, 50, 26, 0.18));
    box-shadow:
      inset 0 1px 0 rgba(255, 245, 225, 0.08),
      0 0 0 1px rgba(214, 93, 58, 0.08);
  }

  .source-status {
    display: grid;
    gap: 8px;
  }

  .source-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  .load-button {
    align-self: start;
    min-width: 96px;
    padding: 10px 14px;
    border: 2px solid rgb(253 137 95);
    border-radius: 12px;
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
    cursor: pointer;
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

  .pending-inline {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #f3e2bc;
  }

  .discogs-module {
    display: grid;
    gap: 16px;
    align-items: start;
    padding: 14px 16px;
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.26)),
      linear-gradient(180deg, #3a2013 0%, #21120c 100%);
    border: 1px solid rgba(255, 225, 176, 0.12);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.08),
      inset 0 -1px 0 rgba(0, 0, 0, 0.24);
  }

  .discogs-copy {
    display: grid;
    gap: 6px;
    min-width: 0;
  }

  .discogs-copy strong {
    font-family: var(--font-ui);
    font-size: 1rem;
    letter-spacing: 0.02em;
  }

  .discogs-copy p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.92rem;
    line-height: 1.4;
  }

  .source-discogs-module {
    align-items: start;
  }

  .discogs-actions {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
  }

  .source-discogs-actions {
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .discogs-connect-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }

  .auth-kicker {
    color: #f0d7a2;
    font-family: var(--font-display);
    font-size: 0.82rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .auth-error-note {
    color: rgba(255, 181, 159, 0.92) !important;
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

  @media (max-width: 860px) {
    .queue-section-header,
    .source-actions {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
