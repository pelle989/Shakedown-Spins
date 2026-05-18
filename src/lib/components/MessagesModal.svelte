<script lang="ts">
  import type { MemberDirectoryEntry, MemberMessageSummary, PrivateSourceSummary } from '$lib/types';

  type Props = {
    open: boolean;
    inboxMode: 'inbox' | 'compose';
    unreadMessageCount: number;
    inboxLoading: boolean;
    inboxError: string | null;
    inboxSuccess: string | null;
    memberMessages: MemberMessageSummary[];
    selectedMember: MemberDirectoryEntry | null;
    memberSearchLoading: boolean;
    memberSearchResults: MemberDirectoryEntry[];
    messageSearch: string;
    selectedSharedSourceId: string;
    sharedSources: PrivateSourceSummary[];
    messageDraft: string;
    sendingMemberMessage: boolean;
    formatSourceDateTime: (value?: string | null) => string;
    inboxMessageExpanded: (messageId: string) => boolean;
    onClose: () => void;
    onSetMode: (mode: 'inbox' | 'compose') => void;
    onToggleMessage: (messageId: string) => void;
    onAcceptSharedMessage: (message: MemberMessageSummary) => void | Promise<void>;
    onUpdateMessageSearch: (value: string) => void;
    onSelectMember: (member: MemberDirectoryEntry) => void;
    onSharedSourceChange: (value: string) => void;
    onDraftChange: (value: string) => void;
    onSubmit: () => void | Promise<void>;
  };

  let {
    open,
    inboxMode,
    unreadMessageCount,
    inboxLoading,
    inboxError,
    inboxSuccess,
    memberMessages,
    selectedMember,
    memberSearchLoading,
    memberSearchResults,
    messageSearch,
    selectedSharedSourceId,
    sharedSources,
    messageDraft,
    sendingMemberMessage,
    formatSourceDateTime,
    inboxMessageExpanded,
    onClose,
    onSetMode,
    onToggleMessage,
    onAcceptSharedMessage,
    onUpdateMessageSearch,
    onSelectMember,
    onSharedSourceChange,
    onDraftChange,
    onSubmit
  }: Props = $props();

  let inboxPage = $state(0);
  const inboxPageSize = 4;
  const inboxPageCount = $derived(Math.max(1, Math.ceil(memberMessages.length / inboxPageSize)));
  const visibleMessages = $derived(
    memberMessages.slice(inboxPage * inboxPageSize, (inboxPage + 1) * inboxPageSize)
  );

  $effect(() => {
    if (inboxMode !== 'inbox') return;
    if (inboxPage > inboxPageCount - 1) {
      inboxPage = Math.max(0, inboxPageCount - 1);
    }
  });
</script>

{#if open}
  <div class="modal-backdrop" onclick={onClose}>
    <div
      class="messages-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inbox-modal-title"
      onclick={(event) => event.stopPropagation()}
    >
      <div class="modal-head">
        <h3 id="inbox-modal-title">Messages</h3>
        <button class="text-button" type="button" onclick={onClose}>
          Close
        </button>
      </div>
      <div class="mode-strip" role="tablist" aria-label="Inbox views">
        <button
          class:mode-tab-active={inboxMode === 'inbox'}
          class="mode-tab"
          type="button"
          role="tab"
          aria-selected={inboxMode === 'inbox'}
          onclick={() => onSetMode('inbox')}
        >
          Inbox
          {#if unreadMessageCount > 0}
            <span class="tab-badge">{unreadMessageCount}</span>
          {/if}
        </button>
        <button
          class:mode-tab-active={inboxMode === 'compose'}
          class="mode-tab"
          type="button"
          role="tab"
          aria-selected={inboxMode === 'compose'}
          onclick={() => onSetMode('compose')}
        >
          Compose
        </button>
      </div>

      {#if inboxError && inboxMode === 'inbox'}
        <p class="status-error">{inboxError}</p>
      {/if}

      {#if inboxMode === 'inbox'}
        <div class="inbox-list-shell">
          {#if inboxLoading}
            <p class="status-note">Loading messages…</p>
          {:else if memberMessages.length === 0}
            <div class="empty-state empty-state-compact">
              <h3>No messages yet</h3>
              <p>Shared stashes sent between members will arrive here.</p>
            </div>
          {:else}
            <div class="inbox-list">
              {#each visibleMessages as message}
                <article
                  class:message-card-unread={message.direction === 'inbox' && !message.readAt}
                  class="message-card"
                >
                  <div class="message-card-top">
                    <div class="message-card-copy">
                      <div class="message-card-heading">
                        <span class="stash-kind-badge">from</span>
                        <strong>{message.sender.publicProfileName}</strong>
                        {#if message.sharedSource}
                          <div class="message-share-pill">
                            <span class="stash-kind-badge stash-share-badge">shared</span>
                            <strong>{message.sharedSource.name}</strong>
                          </div>
                        {/if}
                      </div>
                      <p>@{message.sender.handle} · {formatSourceDateTime(message.createdAt)}</p>
                    </div>
                    <div class="message-card-controls">
                      <button class="text-button" type="button" onclick={() => onToggleMessage(message.id)}>
                        {inboxMessageExpanded(message.id) ? 'Close' : 'Open'}
                      </button>
                    </div>
                  </div>
                  {#if inboxMessageExpanded(message.id)}
                    {#if message.body}
                      <p class="message-card-body">{message.body}</p>
                    {/if}
                    {#if message.sharedSource}
                      <div class="message-card-actions">
                        <button class="load-button message-open-button" type="button" onclick={() => void onAcceptSharedMessage(message)}>
                          Accept Stash
                        </button>
                      </div>
                    {/if}
                  {/if}
                  {#if !inboxMessageExpanded(message.id) && !message.body && !message.sharedSource}
                    <div class="message-card-actions">
                      <span class="status-note">No additional message.</span>
                    </div>
                  {/if}
                </article>
              {/each}
            </div>
            {#if inboxPageCount > 1}
              <div class="inbox-pagination">
                <button
                  class="text-button inbox-pagination-button"
                  type="button"
                  disabled={inboxPage === 0}
                  onclick={() => (inboxPage = Math.max(0, inboxPage - 1))}
                >
                  Prev
                </button>
                <span class="status-note inbox-pagination-status">{inboxPage + 1} / {inboxPageCount}</span>
                <button
                  class="text-button inbox-pagination-button"
                  type="button"
                  disabled={inboxPage >= inboxPageCount - 1}
                  onclick={() => (inboxPage = Math.min(inboxPageCount - 1, inboxPage + 1))}
                >
                  Next
                </button>
              </div>
            {/if}
          {/if}
        </div>
      {:else}
        <form
          class="compose-form"
          onsubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
        >
          <div class="field-group">
            <label class="field-label" for="message-member-search">Find Member</label>
            <input
              id="message-member-search"
              class="field-input"
              type="text"
              value={messageSearch}
              placeholder="@handle or profile name"
              oninput={(event) => onUpdateMessageSearch((event.currentTarget as HTMLInputElement).value)}
            />
          </div>
          {#if selectedMember}
            <div class="selected-member-card">
              <strong>{selectedMember.publicProfileName}</strong>
              <span>@{selectedMember.handle}</span>
            </div>
          {/if}
          {#if memberSearchLoading}
            <p class="status-note">Searching members…</p>
          {:else if memberSearchResults.length > 0}
            <div class="member-search-results">
              {#each memberSearchResults as member}
                <button class="member-search-result" type="button" onclick={() => onSelectMember(member)}>
                  <strong>{member.publicProfileName}</strong>
                  <span>{member.displayName} · @{member.handle}</span>
                </button>
              {/each}
            </div>
          {/if}
          <div class="field-group">
            <label class="field-label" for="message-shared-source">Shared Stash</label>
            <select
              id="message-shared-source"
              class="field-input"
              value={selectedSharedSourceId}
              disabled={sharedSources.length === 0}
              onchange={(event) => onSharedSourceChange((event.currentTarget as HTMLSelectElement).value)}
            >
              {#if sharedSources.length === 0}
                <option value="">No Stashes Shared</option>
              {:else}
                <option value="">Select a shared stash</option>
                {#each sharedSources as source}
                  <option value={source.id}>{source.name}</option>
                {/each}
              {/if}
            </select>
          </div>
          <div class="field-group">
            <label class="field-label" for="message-draft">Message</label>
            <textarea
              id="message-draft"
              class="field-input message-input"
              maxlength="400"
              placeholder="Add a short note for the listener."
              value={messageDraft}
              oninput={(event) => onDraftChange((event.currentTarget as HTMLTextAreaElement).value)}
            ></textarea>
          </div>
          <button
            type="submit"
            class="load-button send-button"
            disabled={sendingMemberMessage || sharedSources.length === 0 || !selectedSharedSourceId}
          >
            {sendingMemberMessage ? 'Sending...' : 'Share Stash'}
          </button>
        </form>
        {#if inboxError}
          <p class="status-error">{inboxError}</p>
        {/if}
        {#if inboxSuccess}
          <p class="status-success">{inboxSuccess}</p>
        {/if}
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 32;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(10, 5, 3, 0.72);
    backdrop-filter: blur(5px);
  }

  .messages-modal {
    width: min(100%, 640px);
    display: grid;
    gap: 14px;
    padding: 20px;
    border-radius: 24px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.26)),
      linear-gradient(180deg, #3a2013 0%, #21120c 100%);
    border: 1px solid rgba(255, 225, 176, 0.14);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.08),
      0 24px 54px rgba(0, 0, 0, 0.34);
    color: #f4e2bf;
  }

  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .modal-head h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.26rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .mode-strip {
    display: flex;
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

  .mode-tab {
    flex: 1 1 0;
    min-height: 46px;
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid rgba(255, 225, 176, 0.06);
    background:
      linear-gradient(180deg, rgba(255, 244, 220, 0.04), rgba(31, 14, 8, 0.08)),
      rgba(16, 8, 5, 0.18);
    color: rgba(232, 214, 181, 0.74);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow:
      inset 0 1px 0 rgba(255, 244, 220, 0.04),
      0 0 0 1px rgba(14, 6, 4, 0.14);
    transition:
      background 180ms ease,
      border-color 180ms ease,
      color 180ms ease,
      transform 180ms ease,
      box-shadow 180ms ease;
  }

  .mode-tab:hover,
  .mode-tab:focus-visible {
    color: #fff1d2;
    border-color: rgba(255, 214, 150, 0.14);
    background:
      linear-gradient(180deg, rgba(255, 244, 220, 0.08), rgba(52, 24, 14, 0.2)),
      rgba(24, 12, 7, 0.26);
    transform: translateY(-1px);
  }

  .mode-tab-active {
    color: #fff1d2;
    border-color: rgba(252, 137, 95, 0.34);
    background:
      linear-gradient(180deg, rgba(255, 240, 210, 0.08), rgba(102, 44, 23, 0.18)),
      linear-gradient(180deg, rgba(255, 167, 126, 0.12), rgba(140, 50, 26, 0.18));
    box-shadow:
      inset 0 1px 0 rgba(255, 245, 225, 0.08),
      0 0 0 1px rgba(214, 93, 58, 0.08),
      0 8px 16px rgba(0, 0, 0, 0.18);
  }

  .tab-badge,
  .stash-kind-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 999px;
    border: 1px solid rgba(255, 225, 176, 0.1);
    background: rgba(255, 232, 187, 0.08);
    font-family: var(--font-display);
    font-size: 0.64rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .tab-badge {
    margin-left: 6px;
    color: rgba(241, 214, 163, 0.78);
  }

  .stash-kind-badge {
    color: rgb(238 176 176);
  }

  .stash-share-badge {
    color: rgb(255 206 0 / 92%);
  }

  .inbox-list-shell {
    min-height: 220px;
  }

  .inbox-list {
    display: grid;
    gap: 10px;
    padding-right: 6px;
    overflow: auto;
  }

  .message-card {
    display: grid;
    gap: 8px;
    padding: 12px 14px;
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.06), rgba(31, 14, 8, 0.2)),
      linear-gradient(180deg, #321b11 0%, #1f120c 100%);
    border: 1px solid rgba(255, 225, 176, 0.1);
  }

  .message-card-unread {
    background:
      linear-gradient(180deg, rgba(255, 240, 210, 0.08), rgba(102, 44, 23, 0.18)),
      linear-gradient(180deg, rgb(255 81 0 / 75%), rgb(140 50 26));
    border-color: rgba(252, 137, 95, 0.36);
  }

  .message-card-top {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: start;
  }

  .message-card-copy {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .message-card-heading {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .message-card-heading strong,
  .selected-member-card strong,
  .member-search-result strong {
    font-family: var(--font-ui);
  }

  .message-card-top p,
  .selected-member-card span,
  .member-search-result span {
    margin: 0;
    color: rgba(232, 214, 181, 0.74);
  }

  .message-card-controls,
  .message-card-actions {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  .inbox-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 12px;
  }

  .inbox-pagination-button {
    min-width: 88px;
  }

  .inbox-pagination-status {
    min-width: 74px;
    text-align: center;
  }

  .message-share-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(14, 8, 5, 0.32);
    border: 1px solid rgba(255, 225, 176, 0.08);
  }

  .message-share-pill strong {
    max-width: 210px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.78rem;
  }

  .message-card-body {
    margin: 0;
    line-height: 1.42;
  }

  .text-button,
  .load-button,
  .member-search-result {
    cursor: pointer;
  }

  .text-button {
    padding: 8px 12px;
    border-radius: 999px;
    border: 0;
    background: linear-gradient(180deg, #f1dfb7 0%, #dfc28b 100%);
    color: #3a210f;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
  }

  .load-button {
    min-width: 96px;
    padding: 10px 14px;
    border-radius: 12px;
    border: 2px solid rgb(253 137 95);
    background: linear-gradient(180deg, #f3e6c9 0%, #e1c895 100%);
    color: #7f1f1f;
    font-size: 0.8rem;
    letter-spacing: 0.04em;
  }

  .message-open-button {
    min-width: 156px;
  }

  .compose-form {
    display: grid;
    gap: 14px;
  }

  .field-group {
    display: grid;
    gap: 8px;
  }

  .field-label {
    font-family: var(--font-display);
    font-size: 0.84rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .field-input {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid rgba(255, 225, 176, 0.16);
    background:
      linear-gradient(180deg, rgba(255, 249, 236, 0.82), rgba(236, 217, 181, 0.92));
    color: #3a210f;
    font: inherit;
  }

  .message-input {
    min-height: 120px;
    resize: vertical;
  }

  .send-button {
    min-height: 78px;
    font-size: 1.46rem;
    letter-spacing: 0.08em;
  }

  .selected-member-card {
    display: grid;
    gap: 4px;
    padding: 12px 14px;
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.22)),
      linear-gradient(180deg, #342015 0%, #22140d 100%);
    border: 1px solid rgba(255, 225, 176, 0.1);
  }

  .member-search-results {
    display: grid;
    gap: 8px;
    max-height: 180px;
    overflow: auto;
  }

  .member-search-result {
    display: grid;
    gap: 3px;
    padding: 12px 14px;
    text-align: left;
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(255, 240, 210, 0.08), rgba(102, 44, 23, 0.18)),
      linear-gradient(180deg, rgb(255 81 0 / 75%), rgb(140 50 26));
    border: 1px solid rgba(252, 137, 95, 0.36);
    color: #f4e2bf;
  }

  .status-note,
  .status-success,
  .status-error {
    margin: 0;
    padding: 9px 12px 9px 14px;
    border-radius: 8px;
    font-size: 0.88rem;
    border-left: 3px solid transparent;
  }

  .status-note {
    background: linear-gradient(90deg, rgba(250, 227, 178, 0.12), rgba(250, 227, 178, 0.05));
    color: #f3e2bc;
    border-left-color: rgba(243, 226, 188, 0.56);
  }

  .status-success {
    background: linear-gradient(90deg, rgba(116, 166, 95, 0.18), rgba(116, 166, 95, 0.07));
    color: #dceec9;
    border-left-color: rgba(180, 226, 159, 0.7);
  }

  .status-error {
    background: linear-gradient(90deg, rgba(184, 74, 49, 0.2), rgba(184, 74, 49, 0.08));
    color: #f8d1c5;
    border-left-color: rgba(255, 160, 138, 0.7);
  }

  .empty-state {
    padding: 18px;
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.06), rgba(31, 14, 8, 0.3));
    border: 1px dashed rgba(255, 225, 176, 0.18);
    color: rgba(232, 214, 181, 0.74);
  }

  .empty-state-compact {
    min-height: 220px;
  }

  .empty-state h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.12rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .empty-state p {
    margin: 8px 0 0;
  }
</style>
