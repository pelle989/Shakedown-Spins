<script lang="ts">
  import MessagesModal from '$lib/components/MessagesModal.svelte';
  import type { MemberDirectoryEntry, MemberMessageSummary, PrivateSourceSummary, SharedOwnerProfile } from '$lib/types';

  let {
    data
  }: {
    data: {
      messages: MemberMessageSummary[];
      owner: SharedOwnerProfile;
      initialInboxPage: number;
      initialMode: 'inbox' | 'compose';
      sharedSources: PrivateSourceSummary[];
    };
  } = $props();

  let inboxMode = $state<'inbox' | 'compose'>(data.initialMode);
  let memberMessages = $state(data.messages);
  let unreadMessageCount = $state(
    data.messages.filter((message) => message.direction === 'inbox' && !message.readAt).length
  );
  let expandedMessageIds = $state<string[]>([]);
  let inboxSuccess = $state<string | null>(null);
  let inboxError = $state<string | null>(null);
  let selectedMember = $state<MemberDirectoryEntry | null>(null);
  let memberSearchResults = $state<MemberDirectoryEntry[]>([
    {
      id: 'fixture-member-1',
      publicProfileName: 'Demo Member',
      displayName: 'Demo Member',
      handle: 'demo-member'
    }
  ]);
  let messageSearch = $state('');
  let selectedSharedSourceId = $state('');
  let messageDraft = $state('');

  function formatSourceDateTime(value?: string | null) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value));
  }

  function inboxMessageExpanded(messageId: string) {
    return expandedMessageIds.includes(messageId);
  }

  function toggleMessage(messageId: string) {
    if (expandedMessageIds.includes(messageId)) {
      expandedMessageIds = expandedMessageIds.filter((id) => id !== messageId);
      return;
    }

    expandedMessageIds = [...expandedMessageIds, messageId];
    memberMessages = memberMessages.map((message) =>
      message.id === messageId ? { ...message, readAt: message.readAt ?? new Date().toISOString() } : message
    );
    unreadMessageCount = memberMessages.filter(
      (message) => message.id !== messageId && message.direction === 'inbox' && !message.readAt
    ).length;
  }

  function acceptMessage(message: MemberMessageSummary) {
    inboxSuccess = `Accepted ${message.sharedSource?.name ?? 'shared stash'}.`;
    inboxError = null;
  }

  function submitCompose() {
    if (!selectedSharedSourceId) {
      inboxError = 'Select a shared stash first.';
      return;
    }

    inboxSuccess = 'Shared stash sent.';
    inboxError = null;
  }
</script>

<div class="fixture-page">
  <h1>Messages Fixture</h1>
  <p>This route exists only to exercise the message inbox UI in Playwright.</p>
  {#if inboxSuccess}
    <p class="fixture-status" data-testid="fixture-success">{inboxSuccess}</p>
  {/if}

  <MessagesModal
    open={true}
    {inboxMode}
    {unreadMessageCount}
    inboxLoading={false}
    {inboxError}
    {inboxSuccess}
    {memberMessages}
    {selectedMember}
    memberSearchLoading={false}
    {memberSearchResults}
    {messageSearch}
    {selectedSharedSourceId}
    sharedSources={data.sharedSources}
    {messageDraft}
    sendingMemberMessage={false}
    initialInboxPage={data.initialInboxPage}
    {formatSourceDateTime}
    {inboxMessageExpanded}
    onClose={() => undefined}
    onSetMode={(mode) => {
      inboxMode = mode;
      inboxError = null;
      inboxSuccess = null;
    }}
    onToggleMessage={toggleMessage}
    onAcceptSharedMessage={acceptMessage}
    onUpdateMessageSearch={(value) => (messageSearch = value)}
    onSelectMember={(member) => (selectedMember = member)}
    onSharedSourceChange={(value) => (selectedSharedSourceId = value)}
    onDraftChange={(value) => (messageDraft = value)}
    onSubmit={submitCompose}
  />
</div>

<style>
  .fixture-page {
    min-height: 100vh;
    padding: 24px;
    background: #1d120d;
    color: #f4e2bf;
  }

  .fixture-page h1,
  .fixture-page p {
    margin: 0 0 12px;
  }

  .fixture-status {
    color: #dceec9;
  }
</style>
