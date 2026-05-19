<script lang="ts">
  import type { Session } from '@auth/core/types';
  import { page } from '$app/state';
  import AlbumStage from '$lib/components/AlbumStage.svelte';
  import FiltersPanel from '$lib/components/FiltersPanel.svelte';
  import FriendsStashSection from '$lib/components/FriendsStashSection.svelte';
  import MessagesModal from '$lib/components/MessagesModal.svelte';
  import MyStashSection from '$lib/components/MyStashSection.svelte';
  import RecentPicksPanel from '$lib/components/RecentPicksPanel.svelte';
  import SourcePanel from '$lib/components/SourcePanel.svelte';
  import VinylLoader from '$lib/components/VinylLoader.svelte';
  import { parseCsv } from '$lib/csv';
  import { buildFilterOptions, emptyFilters, filterAlbums } from '$lib/filters';
  import { nextPick, createRandomizerState, type RandomizerState } from '$lib/randomizer';
  import { clearActiveStashId, loadActiveStashId, saveActiveStashId } from '$lib/session';
  import type {
    ActiveCollectionState,
    Album,
    AlbumContext,
    DiscogsAlbumDetails,
    DiscogsConnectionSummary,
    FeedData,
    FriendStashSummary,
    FilterState,
    LoadedStash,
    LoadedPrivateSource,
    MemberDirectoryEntry,
    MemberMessageSummary,
    PrivateSourceSummary,
    SharedOverlapCollection,
    LoadedSharedSource,
    StashSummary,
    UploadPreview,
    UserProfileSettings,
    UserUiPreferences
  } from '$lib/types';
  import { goto, invalidate, invalidateAll } from '$app/navigation';
  import { onDestroy, onMount, tick } from 'svelte';

  let { data }: { data: FeedData & { session?: Session | null; authEnabled?: boolean } } = $props();

  let stashes = $state<StashSummary[]>([]);
  let mySources = $state<PrivateSourceSummary[]>([]);
  let discogsConnection = $state<DiscogsConnectionSummary | null>(null);
  let currentUserProfile = $state<UserProfileSettings | null>(null);
  let currentUserPreferences = $state<UserUiPreferences | null>(null);
  let friendStashes = $state<FriendStashSummary[]>([]);
  let memberMessages = $state<MemberMessageSummary[]>([]);
  let unreadMessageCount = $state(0);
  let expandedInboxMessageIds = $state<string[]>([]);
  let databaseAvailable = $state(Boolean(data.databaseAvailable));
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
  let importingDiscogs = $state(false);
  let resetDiscogsWarningOpen = $state(false);
  let discogsTokenModalOpen = $state(false);
  let discogsHelpOpen = $state(false);
  let discogsTokenValue = $state('');
  let savingDiscogsToken = $state(false);
  let currentPick = $state<Album | null>(null);
  let currentArtworkGalleryUrls = $state<string[]>([]);
  let discogsDetailsLoading = $state(false);
  let albumContextLoading = $state(false);
  let currentArtworkIndex = $state(0);
  let displayedTitle = $state('');
  let displayedArtist = $state('');
  let artLoading = $state(false);
  let rollingSelection = $state(false);
  let titleShuffleInterval: number | null = null;
  let titleShuffleTimeout: number | null = null;
  let coverCache = new Map<string, string | null>();
  let discogsDetailsCache = new Map<string, DiscogsAlbumDetails | null>();
  let artworkGalleryCache = new Map<string, string[]>();
  let albumContextCache = new Map<string, AlbumContext | null>();
  let randomizerState = $state<RandomizerState>(createRandomizerState());
  let filters = $state<FilterState>(emptyFilters());
  let expandedFilterDial = $state<'genre' | 'decade' | null>(null);
  let filterDialPage = $state({ genre: 0, decade: 0 });
  let filterPageDirection = $state<-1 | 1>(1);
  let filterSearch = $state({ genre: '', decade: '' });
  let filterTouchStartX = $state<number | null>(null);
  let stashName = $state('');
  let stashView = $state<'available' | 'mine' | 'friends'>(
    data.initialSharedSource || data.initialSharedOverlap
      ? 'friends'
      : data.session?.user
        ? 'mine'
        : 'available'
  );
  let sourceTab = $state<'csv' | 'discogs'>('csv');
  let uploadDestination = $state<'private' | 'public'>(data.session?.user ? 'private' : 'public');
  let loginModalOpen = $state(false);
  let welcomeModalOpen = $state(false);
  let expiredLinkModalOpen = $state(false);
  let aboutModalOpen = $state(false);
  let sharedLinkArrivalCue = $state<{ kicker: string; message: string } | null>(null);
  let availableStashesSection: HTMLElement | null = null;
  let highlightAvailableStashes = $state(false);
  let availableStashesHighlightTimeout: number | null = null;
  let highlightSourceReplaceBanner = $state(false);
  let sourceReplaceBannerHighlightTimeout: number | null = null;
  let profileModalOpen = $state(false);
  let profilePublicName = $state('');
  let profileDisplayName = $state('');
  let profileHandle = $state('');
  let profileSaving = $state(false);
  let profileError = $state<string | null>(null);
  let profileSuccess = $state<string | null>(null);
  let friendOverlapSourceId = $state('');
  let friendShelfSourceById = $state<Record<string, string>>({});
  let friendLoadModeById = $state<Record<string, 'full' | 'matching'>>({});
  let friendMatchingCountByKey = $state<Record<string, number>>({});
  let friendMatchingCountLoadingKey = $state<string | null>(null);
  let artworkTouchStartX = $state<number | null>(null);
  let sendingShareId = $state<string | null>(null);
  let deletingFriendSourceId = $state<string | null>(null);
  let editingSourceId = $state<string | null>(null);
  let editingSourceName = $state('');
  let deleteSourceConfirm = $state<{ id: string; name: string } | null>(null);
  let deleteFriendConfirm = $state<{ id: string; name: string } | null>(null);
  let replacingCsvSourceId = $state<string | null>(null);
  let sourceManageError = $state<string | null>(null);
  let sourceManageSuccess = $state<string | null>(null);
  let inboxModalOpen = $state(false);
  let inboxMode = $state<'inbox' | 'compose'>('inbox');
  let inboxLoading = $state(false);
  let inboxError = $state<string | null>(null);
  let inboxSuccess = $state<string | null>(null);
  let messageSearch = $state('');
  let memberSearchResults = $state<MemberDirectoryEntry[]>([]);
  let memberSearchLoading = $state(false);
  let selectedMember = $state<MemberDirectoryEntry | null>(null);
  let selectedSharedSourceId = $state('');
  let messageDraft = $state('');
  let sendingMemberMessage = $state(false);
  let memberSearchTimeout: number | null = null;
  let lastFriendOverlapSourceId = $state('');
  let savingSourceId = $state<string | null>(null);
  let deletingSourceId = $state<string | null>(null);
  let albumStageView = $state<'art' | 'text'>('art');
  let copyingShareId = $state<string | null>(null);
  let highlightedSourceId = $state<string | null>(null);
  let highlightedSourceTimeout: number | null = null;
  let sharedLinkArrivalKey = $state<string | null>(null);
  let sharedLinkArrivalTimeout: number | null = null;
  let sharedLinkArrivalInterval: number | null = null;
  let sharedLinkArrivalSeconds = $state(10);
  let pendingDirectSharedLinkArrival = $state(Boolean(page.url.searchParams.get('sharedSource')));
  const albumContextCacheVersion = 'theaudiodb-first-v1';
  const stashTimestampFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  });
  const sourceDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
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
  const activeArtworkUrls = $derived.by(() => {
    const urls = [
      ...currentArtworkGalleryUrls,
      ...(currentPick?.coverImageUrl ? [currentPick.coverImageUrl] : [])
    ].filter(Boolean) as string[];

    return Array.from(new Set(urls));
  });
  const activeArtworkUrl = $derived(
    activeArtworkUrls[Math.min(currentArtworkIndex, Math.max(activeArtworkUrls.length - 1, 0))] ?? null
  );
  const currentAlbumDetail = $derived.by(() => {
    if (!currentPick) return null;
    const key = `${albumContextCacheVersion}::${currentPick.artist}::${currentPick.title}`.toLowerCase();
    return albumContextCache.get(key) ?? null;
  });
  function summarizeFilterSelection(values: string[], allLabel: string, shortLabel: string) {
    if (values.length === 0) return allLabel;
    if (values.length === 1) return values[0];
    if (values.length === 2) return `${values[0]} / ${values[1]}`;
    return `${values.length} ${shortLabel}`;
  }
  const activeFilterTags = $derived([
    ...filters.genre.map((value) => ({ dial: 'genre' as const, value })),
    ...filters.decade.map((value) => ({ dial: 'decade' as const, value }))
  ]);
  const selectedGenreLabel = $derived(
    summarizeFilterSelection(filters.genre, 'All Genres', 'Genres')
  );
  const selectedDecadeLabel = $derived(
    summarizeFilterSelection(filters.decade, 'All Decades', 'Decades')
  );
  const currentFilterDial = $derived(expandedFilterDial ?? 'genre');
  const currentFilterLabel = $derived(currentFilterDial === 'genre' ? 'Genre' : 'Decade');
  const currentFilterAllLabel = $derived(
    currentFilterDial === 'genre' ? 'All Genres' : 'All Decades'
  );
  const expandedFilterOptions = $derived(
    currentFilterDial
      ? filterOptions[currentFilterDial].filter((option) =>
          option.toLowerCase().includes(filterSearch[currentFilterDial].trim().toLowerCase())
        )
      : []
  );
  const expandedFilterPageCount = $derived(
    Math.max(1, Math.ceil(expandedFilterOptions.length / 4))
  );
  const expandedFilterPageOptions = $derived(
    expandedFilterOptions.slice(
      (currentFilterDial ? filterDialPage[currentFilterDial] : 0) * 4,
      ((currentFilterDial ? filterDialPage[currentFilterDial] : 0) + 1) * 4
    )
  );
  const authErrorMessage = $derived.by(() => {
    const code = page.url.searchParams.get('error');

    if (!code) return null;
    if (code === 'Verification') {
      return 'That sign-in link has expired or was already used. Request a new one below.';
    }
    if (code.startsWith('Discogs')) {
      return null;
    }

    return 'We could not complete sign-in. Try requesting a fresh magic link.';
  });
  const authErrorCode = $derived(page.url.searchParams.get('error'));
  const discogsStatusMessage = $derived.by(() => {
    const connected = page.url.searchParams.get('discogs');
    const error = page.url.searchParams.get('error');

    if (connected === 'connected') {
      return 'Discogs is connected. Import your collection into My Stash whenever you are ready.';
    }

    if (connected === 'oauth-connected') {
      return 'Discogs OAuth is connected. Import your collection into My Stash whenever you are ready.';
    }

    if (error === 'DiscogsAuth') {
      return 'Sign in before connecting Discogs.';
    }

    if (error === 'DiscogsOAuth') {
      return 'Discogs OAuth could not be completed. Try again or use a personal token instead.';
    }

    if (error === 'DiscogsOAuthDenied') {
      return 'Discogs OAuth was cancelled before access was granted.';
    }

    return null;
  });
  const csvSuccessMessage = $derived(
    uploadSuccess &&
      !uploadSuccess.startsWith('Imported ') &&
      !uploadSuccess.startsWith('Discogs ')
      ? uploadSuccess
      : null
  );
  const discogsSuccessMessage = $derived(
    uploadSuccess && uploadSuccess.startsWith('Discogs ') ? uploadSuccess : null
  );
  const activeStashSummary = $derived(
    activeState.status === 'loaded' && activeState.collection.source.kind === 'top10'
      ? stashes.find((stash) => stash.id === activeState.collection.source.id) ?? {
          id: activeState.collection.source.id,
          name: activeState.collection.source.label,
          albumCount: activeState.collection.albums.length,
          createdAt: new Date().toISOString(),
          stashPreview: []
        }
      : null
  );
  const activePrivateSourceSummary = $derived(
    activeState.status === 'loaded' && activeState.collection.source.kind === 'private'
        ? mySources.find((source) => source.id === activeState.collection.source.id) ?? {
          id: activeState.collection.source.id,
          name: activeState.collection.source.label,
          albumCount: activeState.collection.albums.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastSyncedAt: new Date().toISOString(),
          kind: 'csv',
          visibility: 'private',
          syncStatus: 'ready'
        }
      : null
  );
  const activeSharedSourceSummary = $derived(
    activeState.status === 'loaded' && activeState.collection.source.kind === 'shared'
      ? data.initialSharedSource
      : null
  );
  const activeSharedOverlapSummary = $derived(
    activeState.status === 'loaded' && activeState.collection.source.kind === 'shared-overlap'
      ? data.initialSharedOverlap
      : null
  );
  const activeFriendSharedSourceId = $derived(
    activeSharedOverlapSummary?.sharedSourceId ?? activeSharedSourceSummary?.id ?? null
  );
  const hasFriendsStash = $derived(
    Boolean(data.session?.user) ||
      friendStashes.length > 0 ||
      Boolean(data.initialSharedSource || data.initialSharedOverlap || activeSharedSourceSummary || activeSharedOverlapSummary)
  );
  const visibleFriendStashes = $derived(friendStashes);
  const friendShelfVisible = $derived(
    !(
      activeState.status === 'loaded' &&
      (activeState.collection.source.kind === 'shared' ||
        activeState.collection.source.kind === 'shared-overlap')
    )
  );
  const discogsSourceSummary = $derived(
    mySources.find((source) => source.kind === 'discogs') ?? null
  );
  const sharedSources = $derived(mySources.filter((source) => source.visibility === 'shared'));
  const editingSourceSummary = $derived.by(() => {
    if (!editingSourceId) return null;
    return (
      mySources.find((source) => source.id === editingSourceId) ??
      (activePrivateSourceSummary?.id === editingSourceId ? activePrivateSourceSummary : null)
    );
  });
  $effect(() => {
    stashes = data.stashes;
    mySources = data.mySources;
    friendStashes = data.friendStashes;
    memberMessages = data.memberMessages;
    unreadMessageCount = data.unreadMessageCount;
    discogsConnection = data.discogsConnection;
    currentUserProfile = data.currentUserProfile ?? null;
    currentUserPreferences = data.uiPreferences ?? null;
    databaseAvailable = data.databaseAvailable;
  });

  $effect(() => {
    if (!data.session?.user) {
      friendLoadModeById = {};
      friendShelfSourceById = {};
      return;
    }

    friendLoadModeById = currentUserPreferences?.friendLoadModes ?? {};
    friendShelfSourceById = currentUserPreferences?.friendShelfSources ?? {};
  });

  $effect(() => {
    const preferredSourceId =
      activeSharedOverlapSummary?.mineSourceId ?? data.mySources[0]?.id ?? '';

    if (!friendOverlapSourceId || !data.mySources.some((source) => source.id === friendOverlapSourceId)) {
      friendOverlapSourceId = preferredSourceId;
    }
  });

  $effect(() => {
    const availableSourceIds = new Set(data.mySources.map((source) => source.id));
    const defaultSourceId = data.mySources[0]?.id ?? '';

    const nextShelfSources = Object.fromEntries(
      friendStashes.map((source) => {
        const currentSourceId = friendShelfSourceById[source.id];
        const resolvedSourceId =
          currentSourceId && availableSourceIds.has(currentSourceId) ? currentSourceId : defaultSourceId;

        return [source.id, resolvedSourceId];
      })
    ) as Record<string, string>;

    const nextKeys = Object.keys(nextShelfSources);
    const currentKeys = Object.keys(friendShelfSourceById);
    const changed =
      nextKeys.length !== currentKeys.length ||
      nextKeys.some((key) => friendShelfSourceById[key] !== nextShelfSources[key]);

    if (!changed) return;

    friendShelfSourceById = nextShelfSources;

    if (data.session?.user) {
      void persistUiPreferences({ friendShelfSources: nextShelfSources });
    }
  });

  $effect(() => {
    if (!friendOverlapSourceId || friendOverlapSourceId === lastFriendOverlapSourceId) return;

    lastFriendOverlapSourceId = friendOverlapSourceId;

    const resetModes = Object.fromEntries(
      Object.keys(friendLoadModeById).map((sourceId) => [sourceId, 'full'])
    ) as Record<string, 'full' | 'matching'>;

    friendLoadModeById = resetModes;

    if (data.session?.user) {
      void persistUiPreferences({ friendLoadModes: resetModes });
    }
  });

  $effect(() => {
    const sharedSourceId = page.url.searchParams.get('sharedSource');

    if (!sharedSourceId) {
      sharedLinkArrivalKey = null;
      return;
    }

    if (data.initialSharedOverlap) {
      const arrivalKey = `matching:${data.initialSharedOverlap.sharedSourceId}:${data.initialSharedOverlap.mineSourceId}`;

      if (
        activeState.status !== 'loaded' ||
        activeState.collection.source.kind !== 'shared-overlap' ||
        activeState.collection.source.sharedSourceId !== data.initialSharedOverlap.sharedSourceId ||
        activeState.collection.source.mineSourceId !== data.initialSharedOverlap.mineSourceId
      ) {
        stashView = 'friends';
        activeState = {
          status: 'loaded',
          collection: {
            source: {
              kind: 'shared-overlap',
              id: data.initialSharedOverlap.id,
              label: data.initialSharedOverlap.name,
              sharedSourceId: data.initialSharedOverlap.sharedSourceId,
              mineSourceId: data.initialSharedOverlap.mineSourceId
            },
            albums: data.initialSharedOverlap.albums
          }
        };
        resetPlaybackState();
      }

      if (pendingDirectSharedLinkArrival && sharedLinkArrivalKey !== arrivalKey) {
        showSharedLinkArrivalCue({
          key: arrivalKey,
          kicker: 'Shared Link',
          message: 'Matching albums ready'
        });
      }

      pendingDirectSharedLinkArrival = false;
      loadingRestore = false;
      return;
    }

    if (data.initialSharedSource) {
      const arrivalKey = `shared:${data.initialSharedSource.id}`;

      if (
        activeState.status !== 'loaded' ||
        activeState.collection.source.kind !== 'shared' ||
        activeState.collection.source.id !== data.initialSharedSource.id
      ) {
        stashView = 'friends';
        activeState = {
          status: 'loaded',
          collection: {
            source: {
              kind: 'shared',
              id: data.initialSharedSource.id,
              label: data.initialSharedSource.name
            },
            albums: data.initialSharedSource.albums
          }
        };
        resetPlaybackState();
      }

      if (pendingDirectSharedLinkArrival && sharedLinkArrivalKey !== arrivalKey) {
        showSharedLinkArrivalCue({
          key: arrivalKey,
          kicker: 'Shared Link',
          message: `${data.initialSharedSource.name} ready`
        });
      }

      pendingDirectSharedLinkArrival = false;
      loadingRestore = false;
    }
  });

  $effect(() => {
    if (!data.session?.user && stashView === 'mine') {
      stashView = 'available';
    }
    if (!data.session?.user) {
      uploadDestination = 'public';
      sourceTab = 'csv';
    }
  });

  $effect(() => {
    const nextGenre = filters.genre.filter((value) => filterOptions.genre.includes(value));
    const nextDecade = filters.decade.filter((value) => filterOptions.decade.includes(value));

    if (
      nextGenre.length !== filters.genre.length ||
      nextDecade.length !== filters.decade.length
    ) {
      filters = {
        ...filters,
        genre: nextGenre,
        decade: nextDecade
      };
    }
  });

  $effect(() => {
    if (filterDialPage[currentFilterDial] > expandedFilterPageCount - 1) {
      filterDialPage = {
        ...filterDialPage,
        [currentFilterDial]: Math.max(0, expandedFilterPageCount - 1)
      };
    }
  });

  $effect(() => {
    if (selectedSharedSourceId && !sharedSources.some((source) => source.id === selectedSharedSourceId)) {
      selectedSharedSourceId = '';
    }
  });

  $effect(() => {
    if (!authErrorCode) return;

    if (authErrorCode === 'Verification') {
      expiredLinkModalOpen = true;
      loginModalOpen = false;
      return;
    }

    if (!authErrorCode.startsWith('Discogs')) {
      loginModalOpen = true;
    }
  });

  $effect(() => {
    const justSignedIn = page.url.searchParams.get('signedIn');

    if (typeof window === 'undefined' || justSignedIn !== '1' || !data.session?.user) {
      return;
    }

    welcomeModalOpen = true;
    stashView = 'mine';
    sourceTab = 'csv';

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('signedIn');
    window.history.replaceState({}, '', nextUrl);
  });

  $effect(() => {
    currentPick?.id;
    albumStageView = 'art';
  });

  $effect(() => {
    const album = currentPick;
    if (!album) {
      albumContextLoading = false;
      return;
    }

    const key = `${albumContextCacheVersion}::${album.artist}::${album.title}`.toLowerCase();
    const cached = albumContextCache.get(key);
    if (cached !== undefined) {
      albumContextLoading = false;
      return;
    }

    let cancelled = false;
    albumContextLoading = true;

    void fetch(
      `/api/album-context?artist=${encodeURIComponent(album.artist)}&album=${encodeURIComponent(album.title)}`
    )
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | { context?: AlbumContext | null }
          | null;

        if (!response.ok) {
          return null;
        }

        return payload?.context ?? null;
      })
      .then((context) => {
        if (cancelled) return;
        albumContextCache.set(key, context);
      })
      .catch(() => {
        if (cancelled) return;
        albumContextCache.set(key, null);
      })
      .finally(() => {
        if (!cancelled) {
          albumContextLoading = false;
        }
      });

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    currentArtworkIndex = 0;
    currentArtworkGalleryUrls = [];

    const album = currentPick;
    if (!album?.discogsId) {
      discogsDetailsLoading = false;
      return;
    }

    const cacheKey = album.discogsId;
    const cached = discogsDetailsCache.get(cacheKey);
    if (cached !== undefined) {
      currentArtworkGalleryUrls = cached?.imageUrls ?? [];
      discogsDetailsLoading = false;
      return;
    }

    let cancelled = false;
    discogsDetailsLoading = true;

    void fetch(
      `/api/discogs/release?discogsId=${encodeURIComponent(album.discogsId)}`
    )
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | { details?: DiscogsAlbumDetails }
          | null;

        if (!response.ok || !payload?.details) {
          return null;
        }

        return payload.details;
      })
      .then((details) => {
        if (cancelled) return;
        discogsDetailsCache.set(cacheKey, details);
        currentArtworkGalleryUrls = details?.imageUrls ?? [];
        if (details?.imageUrls?.[0] && currentPick?.id === album.id && !currentPick.coverImageUrl) {
          currentPick = { ...currentPick, coverImageUrl: details.imageUrls[0] };
          randomizerState = {
            ...randomizerState,
            recentHistory: randomizerState.recentHistory.map((item) =>
              item.id === album.id ? { ...item, coverImageUrl: details.imageUrls[0] } : item
            )
          };
        }
      })
      .catch(() => {
        if (cancelled) return;
        discogsDetailsCache.set(cacheKey, null);
      })
      .finally(() => {
        if (!cancelled) {
          discogsDetailsLoading = false;
        }
      });

    return () => {
      cancelled = true;
    };
  });

  function resetPlaybackState() {
    randomizerState = createRandomizerState();
    currentPick = null;
    currentArtworkGalleryUrls = [];
    currentArtworkIndex = 0;
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
      stashView = 'available';
      resetPlaybackState();
    } catch {
      restoringMessage = 'Could not restore the previous stash. Browse the current feed below.';
    } finally {
      loadingRestore = false;
    }
  }

  onMount(() => {
    defineRollingDice();
    if (data.session?.user && !page.url.searchParams.get('signedIn') && !currentUserPreferences?.welcomeSeen) {
      welcomeModalOpen = true;
    }

    if (!page.url.searchParams.get('sharedSource')) {
      void restoreSession();
    } else {
      loadingRestore = false;
    }
  });

  onDestroy(() => {
    clearShuffleTimers();
    if (highlightedSourceTimeout) {
      window.clearTimeout(highlightedSourceTimeout);
    }
    if (sourceReplaceBannerHighlightTimeout) {
      window.clearTimeout(sourceReplaceBannerHighlightTimeout);
    }
    if (memberSearchTimeout) {
      window.clearTimeout(memberSearchTimeout);
    }
    if (sharedLinkArrivalTimeout) {
      window.clearTimeout(sharedLinkArrivalTimeout);
    }
    if (sharedLinkArrivalInterval) {
      window.clearInterval(sharedLinkArrivalInterval);
    }
  });

  function dismissQueryParam(param: string) {
    if (typeof window === 'undefined') return;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete(param);
    window.history.replaceState({}, '', nextUrl);
  }

  function closeWelcomeModal() {
    welcomeModalOpen = false;
    if (data.session?.user) {
      currentUserPreferences = {
        ...(currentUserPreferences ?? {
          welcomeSeen: false,
          friendLoadModes: {},
          friendShelfSources: {}
        }),
        welcomeSeen: true
      };
      void persistUiPreferences({ welcomeSeen: true });
    }
  }

  async function refreshMemberMessages() {
    if (!data.session?.user) return;

    inboxLoading = true;
    inboxError = null;

    try {
      const response = await fetch('/api/messages');
      const payload = (await response.json().catch(() => null)) as
        | {
            messages?: MemberMessageSummary[];
            unreadCount?: number;
            message?: string;
          }
        | null;

      if (!response.ok || !payload?.messages) {
        inboxError = payload?.message ?? 'Could not load your message inbox.';
        return;
      }

      memberMessages = payload.messages;
      unreadMessageCount = payload.unreadCount ?? 0;
      expandedInboxMessageIds = expandedInboxMessageIds.filter((id) =>
        payload.messages.some((message) => message.id === id)
      );
    } catch {
      inboxError = 'Could not load your message inbox.';
    } finally {
      inboxLoading = false;
    }
  }

  async function persistUiPreferences(payload: Partial<UserUiPreferences>) {
    if (!data.session?.user) return;

    try {
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const result = (await response.json().catch(() => null)) as
        | { preferences?: UserUiPreferences }
        | null;

      if (response.ok && result?.preferences) {
        currentUserPreferences = result.preferences;
      }
    } catch {
      // Keep UI responsive even if preference persistence is temporarily unavailable.
    }
  }

  function resetComposeState(options?: { preserveSharedSource?: boolean }) {
    selectedMember = null;
    messageSearch = '';
    memberSearchResults = [];
    messageDraft = '';
    if (!options?.preserveSharedSource) {
      selectedSharedSourceId = '';
    }
  }

  function openInbox(mode: 'inbox' | 'compose' = 'inbox', shareSourceId?: string) {
    inboxMode = mode;
    inboxModalOpen = true;
    inboxError = null;
    inboxSuccess = null;

    if (typeof shareSourceId === 'string' && shareSourceId) {
      selectedSharedSourceId = shareSourceId;
    }

    if (mode === 'compose') {
      resetComposeState({ preserveSharedSource: Boolean(shareSourceId) });
    }

    void refreshMemberMessages();
  }

  function closeInboxModal() {
    inboxModalOpen = false;
    inboxError = null;
    inboxSuccess = null;
    memberSearchLoading = false;
    if (memberSearchTimeout) {
      window.clearTimeout(memberSearchTimeout);
      memberSearchTimeout = null;
    }
  }

  function inboxMessageExpanded(messageId: string) {
    return expandedInboxMessageIds.includes(messageId);
  }

  function toggleInboxMessage(messageId: string) {
    if (inboxMessageExpanded(messageId)) {
      expandedInboxMessageIds = expandedInboxMessageIds.filter((id) => id !== messageId);
      return;
    }

    expandedInboxMessageIds = [...expandedInboxMessageIds, messageId];
    void markInboxMessageRead(messageId);
  }

  async function searchForMembers(query: string) {
    if (!data.session?.user) return;
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      memberSearchResults = [];
      memberSearchLoading = false;
      return;
    }

    memberSearchLoading = true;

    try {
      const response = await fetch(`/api/members?q=${encodeURIComponent(trimmed)}`);
      const payload = (await response.json().catch(() => null)) as
        | { members?: MemberDirectoryEntry[] }
        | null;

      if (!response.ok || !payload?.members) {
        memberSearchResults = [];
        return;
      }

      memberSearchResults = payload.members;
    } catch {
      memberSearchResults = [];
    } finally {
      memberSearchLoading = false;
    }
  }

  function updateMessageSearch(value: string) {
    messageSearch = value;
    selectedMember = null;
    inboxError = null;
    inboxSuccess = null;

    if (memberSearchTimeout) {
      window.clearTimeout(memberSearchTimeout);
    }

    if (value.trim().length < 2) {
      memberSearchResults = [];
      memberSearchLoading = false;
      memberSearchTimeout = null;
      return;
    }

    memberSearchTimeout = window.setTimeout(() => {
      void searchForMembers(value);
    }, 180);
  }

  function selectMember(member: MemberDirectoryEntry) {
    selectedMember = member;
    messageSearch = `@${member.handle}`;
    memberSearchResults = [];
    memberSearchLoading = false;
  }

  async function sendInternalShareMessage() {
    if (!data.session?.user) return;
    if (!selectedMember) {
      inboxError = 'Select a member to send this stash to.';
      return;
    }
    if (!selectedSharedSourceId) {
      inboxError = 'Share a stash first before sending it to another member.';
      return;
    }

    sendingMemberMessage = true;
    inboxError = null;
    inboxSuccess = null;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientId: selectedMember.id,
          sharedSourceId: selectedSharedSourceId,
          body: messageDraft
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; sentMessage?: MemberMessageSummary }
        | null;

      if (!response.ok || !payload?.sentMessage) {
        inboxError =
          typeof payload?.message === 'string'
            ? payload.message
            : 'Could not send the shared stash.';
        return;
      }

      inboxSuccess = `Shared stash sent to @${selectedMember.handle}.`;
      resetComposeState();
      await refreshMemberMessages();
    } catch {
      inboxError = 'Could not send the shared stash.';
    } finally {
      sendingMemberMessage = false;
    }
  }

  async function markInboxMessageRead(messageId: string) {
    const target = memberMessages.find((message) => message.id === messageId);
    if (!target || target.direction !== 'inbox' || target.readAt) return;

    memberMessages = memberMessages.map((message) =>
      message.id === messageId
        ? {
            ...message,
            readAt: new Date().toISOString()
          }
        : message
    );
    unreadMessageCount = Math.max(0, unreadMessageCount - 1);

    try {
      await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH'
      });
    } catch {
      // Keep the optimistic state.
    }
  }

  async function acceptSharedMessage(message: MemberMessageSummary) {
    if (!message.sharedSource) return;

    inboxError = null;

    try {
      const response = await fetch(`/api/messages/${message.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accept: true })
      });
      const payload = (await response.json().catch(() => null)) as
        | { accepted?: boolean; sourceId?: string; message?: string }
        | null;

      if (!response.ok || !payload?.accepted || !payload.sourceId) {
        inboxError = payload?.message ?? 'Could not accept this shared stash.';
        return;
      }

      await markInboxMessageRead(message.id);
      closeInboxModal();
      stashView = 'friends';
      if (
        activeState.status === 'loaded' &&
        (activeState.collection.source.kind === 'shared' ||
          activeState.collection.source.kind === 'shared-overlap')
      ) {
        await unloadStash();
      }
      await invalidateAll();
      triggerSourceHighlight(payload.sourceId);
    } catch {
      inboxError = 'Could not accept this shared stash.';
    }
  }

  function closeExpiredLinkModal() {
    expiredLinkModalOpen = false;
    dismissQueryParam('error');
  }

  async function loadStash(stashId: string) {
    restoringMessage = null;
    loadingStashId = stashId;
    try {
      if (
        activeState.status === 'loaded' &&
        (activeState.collection.source.kind === 'shared' ||
          activeState.collection.source.kind === 'shared-overlap')
      ) {
        const nextUrl = new URL(page.url);
        nextUrl.searchParams.delete('sharedSource');
        nextUrl.searchParams.delete('mineSource');
        await goto(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`, {
          replaceState: true,
          noScroll: true,
          keepFocus: true,
          invalidateAll: false
        });
      }

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
      stashView = 'available';
      resetPlaybackState();
      scrollToTopOnMobile();
    } finally {
      loadingStashId = null;
    }
  }

  async function unloadStash() {
    if (activeState.status === 'loaded' && activeState.collection.source.kind === 'top10') {
      clearActiveStashId();
    }
    if (
      activeState.status === 'loaded' &&
      (activeState.collection.source.kind === 'shared' ||
        activeState.collection.source.kind === 'shared-overlap')
    ) {
      const nextUrl = new URL(page.url);
      nextUrl.searchParams.delete('sharedSource');
      nextUrl.searchParams.delete('mineSource');
      await goto(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`, {
        replaceState: true,
        noScroll: true,
        keepFocus: true,
        invalidateAll: false
      });
    }
    activeState = { status: 'idle' };
    currentPick = null;
    currentArtworkGalleryUrls = [];
    currentArtworkIndex = 0;
    displayedTitle = '';
    displayedArtist = '';
    restoringMessage = null;
    filters = emptyFilters();
    expandedFilterDial = null;
  }

  function formatStashTimestamp(value: string) {
    return stashTimestampFormatter.format(new Date(value));
  }

  function formatSourceTimestamp(value: string) {
    return stashTimestampFormatter.format(new Date(value));
  }

  function formatSourceDateTime(value?: string | null) {
    if (!value) return '—';
    return sourceDateTimeFormatter.format(new Date(value));
  }

  function openProfileModal() {
    const fallbackEmail = data.session?.user?.email ?? '';
    const emailLocal = fallbackEmail.split('@')[0] ?? 'listener';
    const fallbackDisplayName =
      currentUserProfile?.displayName ?? data.session?.user?.name ?? emailLocal;
    const fallbackHandle = currentUserProfile?.handle ?? emailLocal.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    profilePublicName = currentUserProfile?.publicProfileName ?? fallbackDisplayName;
    profileDisplayName = fallbackDisplayName;
    profileHandle = fallbackHandle;
    profileError = null;
    profileSuccess = null;
    profileModalOpen = true;
  }

  function closeProfileModal() {
    profileModalOpen = false;
    profileSaving = false;
    profileError = null;
    profileSuccess = null;
  }

  function previousArtwork() {
    if (activeArtworkUrls.length <= 1) return;
    currentArtworkIndex =
      currentArtworkIndex === 0 ? activeArtworkUrls.length - 1 : currentArtworkIndex - 1;
  }

  function nextArtwork() {
    if (activeArtworkUrls.length <= 1) return;
    currentArtworkIndex =
      currentArtworkIndex === activeArtworkUrls.length - 1 ? 0 : currentArtworkIndex + 1;
  }

  function toggleAlbumStageView() {
    if (!albumContextLoading && !currentAlbumDetail) return;
    albumStageView = albumStageView === 'art' ? 'text' : 'art';
  }

  function handleArtworkTouchStart(event: TouchEvent) {
    artworkTouchStartX = event.touches[0]?.clientX ?? null;
  }

  function handleArtworkTouchEnd(event: TouchEvent) {
    if (artworkTouchStartX === null || activeArtworkUrls.length <= 1) return;

    const touchEndX = event.changedTouches[0]?.clientX ?? artworkTouchStartX;
    const deltaX = touchEndX - artworkTouchStartX;

    if (Math.abs(deltaX) > 36) {
      if (deltaX < 0) nextArtwork();
      else previousArtwork();
    }

    artworkTouchStartX = null;
  }

  async function importFromDiscogs() {
    uploadError = null;
    uploadSuccess = null;
    sourceManageError = null;
    sourceManageSuccess = null;
    importingDiscogs = true;

    try {
      const response = await fetch('/api/discogs/import', {
        method: 'POST'
      });
      const payload = (await response.json()) as {
        message?: string;
        imported?: { sourceId: string; sourceName: string; albumCount: number };
      };

      if (!response.ok || !payload.imported) {
        uploadError = payload.message ?? 'Discogs import failed.';
        return;
      }

      await invalidate('/');
      mySources = await fetch('/api/sources')
        .then((response) => response.json())
        .then((payload: { sources: PrivateSourceSummary[] }) => payload.sources);
      stashView = 'mine';
      triggerSourceHighlight(payload.imported.sourceId);
    } catch {
      uploadError = 'Discogs import failed.';
    } finally {
      importingDiscogs = false;
    }
  }

  async function resetDiscogsToken() {
    uploadError = null;
    uploadSuccess = null;
    sourceManageError = null;
    sourceManageSuccess = null;

    try {
      const response = await fetch('/api/discogs/token', {
        method: 'DELETE'
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        uploadError = payload?.message ?? 'Could not reset Discogs key.';
        return;
      }

      discogsConnection = null;
      discogsTokenValue = '';
      resetDiscogsWarningOpen = false;
      void invalidate('/');
      uploadSuccess = 'Discogs key reset.';
    } catch {
      uploadError = 'Could not reset Discogs key.';
    }
  }

  async function saveProfileSettings(event: SubmitEvent) {
    event.preventDefault();
    profileError = null;
    profileSuccess = null;
    profileSaving = true;

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          publicProfileName: profilePublicName,
          displayName: profileDisplayName,
          handle: profileHandle
        })
      });
      const payload = (await response.json()) as {
        message?: string;
        profile?: UserProfileSettings;
      };

      if (!response.ok || !payload.profile) {
        profileError = payload.message ?? 'Could not save profile settings.';
        return;
      }

      currentUserProfile = payload.profile;
      profilePublicName = payload.profile.publicProfileName;
      profileDisplayName = payload.profile.displayName;
      profileHandle = payload.profile.handle;
      profileSuccess = 'Sharing profile updated.';
      void invalidate('/');
      window.setTimeout(() => {
        profileModalOpen = false;
        profileSuccess = null;
      }, 900);
    } catch {
      profileError = 'Could not save profile settings.';
    } finally {
      profileSaving = false;
    }
  }

  function triggerSourceHighlight(sourceId: string) {
    highlightedSourceId = sourceId;
    if (highlightedSourceTimeout) {
      window.clearTimeout(highlightedSourceTimeout);
    }
    highlightedSourceTimeout = window.setTimeout(() => {
      highlightedSourceId = null;
      highlightedSourceTimeout = null;
    }, 1800);
  }

  function showSharedLinkArrivalCue({
    key,
    kicker,
    message
  }: {
    key: string;
    kicker: string;
    message: string;
  }) {
    sharedLinkArrivalKey = key;
    sharedLinkArrivalCue = { kicker, message };
    sharedLinkArrivalSeconds = 10;

    if (sharedLinkArrivalTimeout) {
      window.clearTimeout(sharedLinkArrivalTimeout);
    }
    if (sharedLinkArrivalInterval) {
      window.clearInterval(sharedLinkArrivalInterval);
    }

    sharedLinkArrivalInterval = window.setInterval(() => {
      sharedLinkArrivalSeconds = Math.max(0, sharedLinkArrivalSeconds - 1);
    }, 1000);

    sharedLinkArrivalTimeout = window.setTimeout(() => {
      dismissSharedLinkArrivalCue();
    }, 10000);
  }

  function dismissSharedLinkArrivalCue() {
    sharedLinkArrivalCue = null;
    sharedLinkArrivalSeconds = 10;

    if (sharedLinkArrivalTimeout) {
      window.clearTimeout(sharedLinkArrivalTimeout);
      sharedLinkArrivalTimeout = null;
    }

    if (sharedLinkArrivalInterval) {
      window.clearInterval(sharedLinkArrivalInterval);
      sharedLinkArrivalInterval = null;
    }
  }

  async function saveDiscogsPersonalToken(event: SubmitEvent) {
    event.preventDefault();
    uploadError = null;
    uploadSuccess = null;
    sourceManageError = null;
    sourceManageSuccess = null;

    if (!discogsTokenValue.trim()) {
      uploadError = 'Discogs personal token is required.';
      return;
    }

    savingDiscogsToken = true;

    try {
      const formData = new FormData();
      formData.set('token', discogsTokenValue.trim());

      const response = await fetch('/api/discogs/token', {
        method: 'POST',
        body: formData
      });
      const payload = (await response.json()) as { message?: string; username?: string };
      const connectionPayload = payload as {
        message?: string;
        username?: string;
        authMode?: 'personal_token' | 'oauth';
        discogsUserId?: string;
      };

      if (!response.ok || !connectionPayload.username) {
        uploadError = connectionPayload.message ?? 'Discogs connection failed.';
        return;
      }

      discogsConnection = {
        username: connectionPayload.username,
        connectedAt: new Date().toISOString(),
        authMode: connectionPayload.authMode ?? 'personal_token',
        discogsUserId: connectionPayload.discogsUserId
      };
      void invalidate('/');
      discogsTokenValue = '';
      discogsTokenModalOpen = false;
      stashView = 'mine';
      uploadSuccess = `Discogs connected as ${connectionPayload.username}.`;
    } catch {
      uploadError = 'Discogs connection failed.';
    } finally {
      savingDiscogsToken = false;
    }
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

  function handleStashNameInput(event: Event) {
    stashName = (event.currentTarget as HTMLInputElement).value;
    stashNameError = null;
  }

  async function submitUpload(event: SubmitEvent) {
    event.preventDefault();
    uploadError = null;
    uploadSuccess = null;
    stashNameError = null;
    sourceManageError = null;
    sourceManageSuccess = null;

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
      const target =
        data.session?.user && uploadDestination === 'private' && replacingCsvSourceId
          ? `/api/sources/${replacingCsvSourceId}`
          : data.session?.user && uploadDestination === 'private'
            ? '/api/sources'
            : '/api/stashes';
      const method =
        data.session?.user && uploadDestination === 'private' && replacingCsvSourceId ? 'PUT' : 'POST';
      const response = await fetch(target, {
        method,
        body: formData
      });
      const payload = (await response.json()) as {
        message?: string;
        stash?: StashSummary;
        source?: PrivateSourceSummary & { albums?: Album[] };
      };
      if (!response.ok) {
        if (payload.message === 'Stash name is required.') {
          stashNameError = payload.message;
          return;
        }
        uploadError = payload.message ?? 'Upload failed.';
        return;
      }

      await invalidate('/');
      if (data.session?.user && uploadDestination === 'private' && payload.source) {
        mySources = [payload.source, ...mySources.filter((source) => source.id !== payload.source?.id)];
        stashView = 'mine';
        if (replacingCsvSourceId) {
          triggerSourceReplaceBannerHighlight();
        }
        if (
          replacingCsvSourceId &&
          activeState.status === 'loaded' &&
          activeState.collection.source.kind === 'private' &&
          activeState.collection.source.id === replacingCsvSourceId &&
          payload.source.albums
        ) {
          activeState = {
            status: 'loaded',
            collection: {
              source: {
                kind: 'private',
                id: payload.source.id,
                label: payload.source.name
              },
              albums: payload.source.albums
            }
          };
          resetPlaybackState();
        }
        uploadSuccess = replacingCsvSourceId
          ? `Updated ${payload.source.name} with ${payload.source.albumCount} albums.`
          : `Saved to My Stash with ${payload.source.albumCount} albums.`;
      } else if (payload.stash) {
        stashes = [payload.stash, ...stashes.filter((stash) => stash.id !== payload.stash?.id)].slice(0, 10);
        uploadSuccess = `Your stash was created with ${payload.stash.albumCount} albums.`;
      } else {
        uploadError = 'Upload failed.';
        return;
      }
      stashName = '';
      selectedFile = null;
      preview = null;
      replacingCsvSourceId = null;
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

  function triggerSourceReplaceBannerHighlight() {
    highlightSourceReplaceBanner = true;
    if (sourceReplaceBannerHighlightTimeout) {
      window.clearTimeout(sourceReplaceBannerHighlightTimeout);
    }
    sourceReplaceBannerHighlightTimeout = window.setTimeout(() => {
      highlightSourceReplaceBanner = false;
      sourceReplaceBannerHighlightTimeout = null;
    }, 1800);
  }

  function scrollToTopOnMobile() {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 860px)').matches) return;

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function startEditingSource(source: PrivateSourceSummary) {
    editingSourceId = source.id;
    editingSourceName = source.name;
    replacingCsvSourceId = null;
    sourceManageError = null;
    sourceManageSuccess = null;
  }

  function beginReplacingCsvSource(source: PrivateSourceSummary) {
    replacingCsvSourceId = source.id;
    sourceTab = 'csv';
    uploadDestination = 'private';
    stashView = 'mine';
    stashName = source.name;
    selectedFile = null;
    preview = null;
    uploadError = null;
    uploadSuccess = `Upload a new CSV to replace ${source.name}.`;
    triggerSourceReplaceBannerHighlight();
    cancelEditingSource();
  }

  function cancelReplacingCsvSource() {
    replacingCsvSourceId = null;
    stashName = '';
    uploadError = null;
    uploadSuccess = null;
    preview = null;
    selectedFile = null;
    const input = document.getElementById('stash-file') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  function cancelEditingSource() {
    editingSourceId = null;
    editingSourceName = '';
    deleteSourceConfirm = null;
    savingSourceId = null;
    deletingSourceId = null;
  }

  async function saveSourceRename(sourceId: string) {
    sourceManageError = null;
    sourceManageSuccess = null;
    savingSourceId = sourceId;

    try {
      const response = await fetch(`/api/sources/${sourceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: editingSourceName })
      });
      const payload = (await response.json()) as {
        message?: string;
        source?: PrivateSourceSummary;
      };

      if (!response.ok || !payload.source) {
        sourceManageError = payload.message ?? 'Could not rename source.';
        return;
      }

      mySources = mySources.map((source) => (source.id === sourceId ? payload.source! : source));
      if (
        activeState.status === 'loaded' &&
        activeState.collection.source.kind === 'private' &&
        activeState.collection.source.id === sourceId
      ) {
        activeState = {
          status: 'loaded',
          collection: {
            ...activeState.collection,
            source: {
              ...activeState.collection.source,
              label: payload.source.name
            }
          }
        };
      }
      sourceManageSuccess = 'Private stash renamed.';
      cancelEditingSource();
    } catch {
      sourceManageError = 'Could not rename source.';
    } finally {
      savingSourceId = null;
    }
  }

  async function deleteSource(sourceId: string) {
    sourceManageError = null;
    sourceManageSuccess = null;
    deletingSourceId = sourceId;

    try {
      const response = await fetch(`/api/sources/${sourceId}`, {
        method: 'DELETE'
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        sourceManageError = payload?.message ?? 'Could not delete source.';
        return;
      }

      mySources = mySources.filter((source) => source.id !== sourceId);
      if (
        activeState.status === 'loaded' &&
        activeState.collection.source.kind === 'private' &&
        activeState.collection.source.id === sourceId
      ) {
        unloadStash();
      }
      sourceManageSuccess = 'Private stash deleted.';
      cancelEditingSource();
    } catch {
      sourceManageError = 'Could not delete source.';
    } finally {
      deletingSourceId = null;
    }
  }

  function requestDeleteSource(sourceId: string, sourceName: string) {
    sourceManageError = null;
    sourceManageSuccess = null;
    deleteSourceConfirm = { id: sourceId, name: sourceName };
  }

  async function confirmDeleteSource() {
    if (!deleteSourceConfirm) return;
    const pendingDelete = deleteSourceConfirm;
    deleteSourceConfirm = null;
    await deleteSource(pendingDelete.id);
  }

  async function updateSourceVisibility(
    sourceId: string,
    visibility: 'private' | 'shared'
  ) {
    sourceManageError = null;
    sourceManageSuccess = null;
    savingSourceId = sourceId;

    try {
      const response = await fetch(`/api/sources/${sourceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ visibility })
      });
      const payload = (await response.json()) as {
        message?: string;
        source?: PrivateSourceSummary;
      };

      if (!response.ok || !payload.source) {
        sourceManageError = payload.message ?? 'Could not update share settings.';
        return;
      }

      mySources = mySources.map((source) => (source.id === sourceId ? payload.source! : source));
      if (
        activeState.status === 'loaded' &&
        activeState.collection.source.kind === 'private' &&
        activeState.collection.source.id === sourceId
      ) {
        activeState = {
          status: 'loaded',
          collection: {
            ...activeState.collection,
            source: {
              ...activeState.collection.source
            }
          }
        };
      }
    } catch {
      sourceManageError = 'Could not update share settings.';
    } finally {
      savingSourceId = null;
    }
  }

  function buildShareUrl(sourceId: string) {
    const path = `/?sharedSource=${encodeURIComponent(sourceId)}`;
    if (typeof window === 'undefined') return path;
    return `${window.location.origin}${path}`;
  }

  async function copyShareLink(sourceId: string) {
    sourceManageError = null;
    sourceManageSuccess = null;
    copyingShareId = sourceId;

    try {
      await navigator.clipboard.writeText(buildShareUrl(sourceId));
      sourceManageSuccess = 'Share link copied.';
    } catch {
      sourceManageError = 'Could not copy the share link.';
    } finally {
      copyingShareId = null;
    }
  }

  async function viewFriendSharedCollection(sharedSourceId: string) {
    stashView = 'friends';
    await goto(`/?sharedSource=${sharedSourceId}`, {
      invalidateAll: true,
      keepFocus: true,
      noScroll: true
    });
  }

  async function viewFriendOverlap(sharedSourceId: string) {
    if (!friendOverlapSourceId) return;

    stashView = 'friends';
    await goto(`/?sharedSource=${sharedSourceId}&mineSource=${friendOverlapSourceId}`, {
      invalidateAll: true,
      keepFocus: true,
      noScroll: true
    });
  }

  function getFriendLoadMode(sourceId: string) {
    return friendLoadModeById[sourceId] ?? 'full';
  }

  function getFriendShelfSourceId(sourceId: string) {
    return friendShelfSourceById[sourceId] ?? mySources[0]?.id ?? '';
  }

  function setFriendLoadMode(sourceId: string, mode: 'full' | 'matching') {
    const nextModes = {
      ...friendLoadModeById,
      [sourceId]: mode
    };
    friendLoadModeById = nextModes;

    if (data.session?.user) {
      void persistUiPreferences({ friendLoadModes: nextModes });
    }
  }

  function setFriendShelfSource(sourceId: string, mineSourceId: string) {
    const nextSources = {
      ...friendShelfSourceById,
      [sourceId]: mineSourceId
    };
    friendShelfSourceById = nextSources;
    setFriendLoadMode(sourceId, 'full');

    if (data.session?.user) {
      void persistUiPreferences({ friendShelfSources: nextSources });
    }
  }

  function getFriendMatchingCount(sourceId: string, mineSourceId: string) {
    if (!mineSourceId) return null;
    return friendMatchingCountByKey[`${sourceId}:${mineSourceId}`] ?? null;
  }

  function toggleFriendShelfMode(sourceId: string) {
    const nextMode = getFriendLoadMode(sourceId) === 'matching' ? 'full' : 'matching';
    setFriendLoadMode(sourceId, nextMode);
    if (nextMode === 'matching') {
      void ensureFriendMatchingCount(sourceId, getFriendShelfSourceId(sourceId));
    }
  }

  async function ensureFriendMatchingCount(sourceId: string, mineSourceId: string) {
    if (!data.session?.user || !mineSourceId) return;

    const cacheKey = `${sourceId}:${mineSourceId}`;
    if (friendMatchingCountByKey[cacheKey] !== undefined) return;

    friendMatchingCountLoadingKey = cacheKey;

    try {
      const response = await fetch(
        `/api/friends-stash/${sourceId}?mineSourceId=${encodeURIComponent(mineSourceId)}`
      );
      const payload = (await response.json().catch(() => null)) as
        | { count?: number; message?: string }
        | null;

      if (!response.ok || typeof payload?.count !== 'number') {
        return;
      }

      friendMatchingCountByKey = {
        ...friendMatchingCountByKey,
        [cacheKey]: payload.count
      };
    } finally {
      if (friendMatchingCountLoadingKey === cacheKey) {
        friendMatchingCountLoadingKey = null;
      }
    }
  }

  async function loadFriendSource(source: FriendStashSummary) {
    loadingStashId = source.id;
    await tick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      if (getFriendLoadMode(source.id) === 'matching') {
        const mineSourceId = getFriendShelfSourceId(source.id);
        if (!mineSourceId) return;

        stashView = 'friends';
        await goto(`/?sharedSource=${source.id}&mineSource=${mineSourceId}`, {
          invalidateAll: true,
          keepFocus: true,
          noScroll: true
        });
        return;
      }

      await viewFriendSharedCollection(source.id);
    } finally {
      loadingStashId = null;
    }
  }

  async function sendShareLink(sourceId: string) {
    sourceManageError = null;
    sourceManageSuccess = null;
    sendingShareId = sourceId;
    cancelEditingSource();
    openInbox('compose', sourceId);
    inboxSuccess = null;
    sendingShareId = null;
  }

  async function deleteFriendStash(sourceId: string) {
    sourceManageError = null;
    sourceManageSuccess = null;
    deletingFriendSourceId = sourceId;

    try {
      const response = await fetch(`/api/friends-stash/${sourceId}`, {
        method: 'DELETE'
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        sourceManageError = payload?.message ?? 'Could not remove friends stash.';
        return;
      }

      friendStashes = friendStashes.filter((source) => source.id !== sourceId);

      if (
        activeState.status === 'loaded' &&
        ((activeState.collection.source.kind === 'shared' &&
          activeState.collection.source.id === sourceId) ||
          (activeState.collection.source.kind === 'shared-overlap' &&
            activeState.collection.source.sharedSourceId === sourceId))
      ) {
        await unloadStash();
      }

      sourceManageSuccess = 'Friends stash removed.';
      void invalidate('/');
    } catch {
      sourceManageError = 'Could not remove friends stash.';
    } finally {
      deletingFriendSourceId = null;
    }
  }

  function requestDeleteFriendStash(source: FriendStashSummary) {
    sourceManageError = null;
    sourceManageSuccess = null;
    deleteFriendConfirm = {
      id: source.id,
      name: source.name
    };
  }

  async function confirmDeleteFriendStash() {
    if (!deleteFriendConfirm) return;
    const pendingDelete = deleteFriendConfirm;
    deleteFriendConfirm = null;
    await deleteFriendStash(pendingDelete.id);
  }

  async function loadPrivateSource(sourceId: string) {
    restoringMessage = null;
    loadingStashId = sourceId;
    try {
      if (
        activeState.status === 'loaded' &&
        (activeState.collection.source.kind === 'shared' ||
          activeState.collection.source.kind === 'shared-overlap')
      ) {
        const nextUrl = new URL(page.url);
        nextUrl.searchParams.delete('sharedSource');
        nextUrl.searchParams.delete('mineSource');
        await goto(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`, {
          replaceState: true,
          noScroll: true,
          keepFocus: true,
          invalidateAll: false
        });
      }

      const response = await fetch(`/api/sources/${sourceId}`);
      const payload = (await response.json()) as { message?: string; source?: LoadedPrivateSource };
      if (!response.ok || !payload.source) {
        restoringMessage = payload.message ?? 'Could not load your private stash.';
        activeState = { status: 'idle' };
        return;
      }

      activeState = {
        status: 'loaded',
        collection: {
          source: { kind: 'private', id: payload.source.id, label: payload.source.name },
          albums: payload.source.albums
        }
      };
      stashView = 'mine';
      resetPlaybackState();
      scrollToTopOnMobile();
    } finally {
      loadingStashId = null;
    }
  }

  async function loadArt(album: Album) {
    if (album.coverImageUrl) {
      if (currentPick?.id === album.id) {
        currentPick = album;
      }
      return;
    }

    if (album.discogsId) {
      const cachedDetails = discogsDetailsCache.get(album.discogsId);
      if (cachedDetails?.imageUrls?.[0]) {
        const artwork = cachedDetails.imageUrls[0];
        currentArtworkGalleryUrls = cachedDetails.imageUrls;
        if (currentPick?.id === album.id) {
          currentPick = { ...album, coverImageUrl: artwork };
        }
        randomizerState = {
          ...randomizerState,
          recentHistory: randomizerState.recentHistory.map((item) =>
            item.id === album.id ? { ...item, coverImageUrl: artwork } : item
          )
        };
        return;
      }

      try {
        const response = await fetch(`/api/discogs/release?discogsId=${encodeURIComponent(album.discogsId)}`);
        const payload = (await response.json().catch(() => null)) as
          | { details?: DiscogsAlbumDetails }
          | null;

        if (response.ok && payload?.details) {
          discogsDetailsCache.set(album.discogsId, payload.details);
          const artwork = payload.details.imageUrls[0];
          currentArtworkGalleryUrls = payload.details.imageUrls;

          if (artwork) {
            if (currentPick?.id === album.id) {
              currentPick = { ...album, coverImageUrl: artwork };
            }
            randomizerState = {
              ...randomizerState,
              recentHistory: randomizerState.recentHistory.map((item) =>
                item.id === album.id ? { ...item, coverImageUrl: artwork } : item
              )
            };
            return;
          }
        }
      } catch {
        // Fall through to iTunes lookup.
      }
    }

    const key = `${album.artist}::${album.title}`.toLowerCase();
    const cachedGallery = artworkGalleryCache.get(key);
    if (cachedGallery && cachedGallery.length > 0) {
      currentArtworkGalleryUrls = cachedGallery;
      const artwork = cachedGallery[0];
      coverCache.set(key, artwork);
      if (currentPick?.id === album.id) {
        currentPick = { ...album, coverImageUrl: artwork ?? undefined };
      }
      randomizerState = {
        ...randomizerState,
        recentHistory: randomizerState.recentHistory.map((item) =>
          item.id === album.id ? { ...item, coverImageUrl: artwork ?? undefined } : item
        )
      };
      return;
    }

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
      const artworkResponse = await fetch(
        `/api/artwork?artist=${encodeURIComponent(album.artist)}&title=${encodeURIComponent(album.title)}${album.year ? `&year=${encodeURIComponent(String(album.year))}` : ''}`
      );
      const artworkPayload = (await artworkResponse.json().catch(() => null)) as
        | { imageUrls?: string[] }
        | null;
      const archiveImages = artworkResponse.ok ? (artworkPayload?.imageUrls ?? []) : [];

      if (archiveImages.length > 0) {
        artworkGalleryCache.set(key, archiveImages);
        const artwork = archiveImages[0];
        coverCache.set(key, artwork);
        currentArtworkGalleryUrls = archiveImages;
        if (currentPick?.id === album.id) {
          currentPick = { ...album, coverImageUrl: artwork ?? undefined };
        }
        randomizerState = {
          ...randomizerState,
          recentHistory: randomizerState.recentHistory.map((item) =>
            item.id === album.id ? { ...item, coverImageUrl: artwork ?? undefined } : item
          )
        };
        return;
      }

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

  function clearDialFilters(dial: 'genre' | 'decade') {
    filters = { ...filters, [dial]: [] };
    filterSearch = { ...filterSearch, [dial]: '' };
    filterDialPage = { ...filterDialPage, [dial]: 0 };
  }

  function removeFilterValue(dial: 'genre' | 'decade', value: string) {
    filters = {
      ...filters,
      [dial]: filters[dial].filter((entry) => entry !== value)
    };
  }

  function toggleFilterDial(dial: 'genre' | 'decade') {
    if (filterOptions[dial].length === 0) return;
    filterDialPage = { ...filterDialPage, [dial]: 0 };
    filterSearch = { ...filterSearch, [dial]: '' };
    expandedFilterDial = expandedFilterDial === dial ? null : dial;
  }

  function changeExpandedFilterPage(direction: -1 | 1) {
    const currentPage = filterDialPage[currentFilterDial];
    const nextPage = currentPage + direction;
    if (nextPage < 0 || nextPage >= expandedFilterPageCount) return;
    filterPageDirection = direction;
    filterDialPage = { ...filterDialPage, [currentFilterDial]: nextPage };
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

  function updateFilterSearch(dial: 'genre' | 'decade', value: string) {
    filterSearch = { ...filterSearch, [dial]: value };
    filterDialPage = { ...filterDialPage, [dial]: 0 };
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
        {#if sharedLinkArrivalCue}
          <div
            class:shared-link-arrival-fading={sharedLinkArrivalSeconds <= 1}
            class="shared-link-arrival"
            data-testid="shared-link-arrival"
            role="status"
            aria-live="polite"
          >
            <span class="shared-link-arrival-kicker">{sharedLinkArrivalCue.kicker}</span>
            <div class="shared-link-arrival-main">
              <strong>{sharedLinkArrivalCue.message}</strong>
            </div>
            <span class="shared-link-arrival-countdown">{sharedLinkArrivalSeconds}s</span>
            <button class="shared-link-arrival-close" type="button" onclick={dismissSharedLinkArrivalCue}>
              Close
            </button>
          </div>
        {/if}
        <AlbumStage
          {activeState}
          {albumStageView}
          {activeArtworkUrl}
          {activeArtworkUrls}
          {artLoading}
          {rollingSelection}
          {currentPick}
          {currentArtworkIndex}
          {currentAlbumDetail}
          {albumContextLoading}
          {displayedTitle}
          {displayedArtist}
          {restoringMessage}
          onToggleAlbumStageView={toggleAlbumStageView}
          onPreviousArtwork={previousArtwork}
          onNextArtwork={nextArtwork}
          onScrollToAvailableStashes={scrollToAvailableStashes}
          onHandleArtworkTouchStart={handleArtworkTouchStart}
          onHandleArtworkTouchEnd={handleArtworkTouchEnd}
        />
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

        <RecentPicksPanel {databaseAvailable} {recentHistory} />
      </div>
    </section>

    <section class="bottom-strip panel">
      <FiltersPanel
        {activeState}
        {filters}
        filterOptions={{ genre: filterOptions.genre, decade: filterOptions.decade }}
        {expandedFilterDial}
        {currentFilterDial}
        {currentFilterLabel}
        {currentFilterAllLabel}
        {expandedFilterOptions}
        {expandedFilterPageOptions}
        {expandedFilterPageCount}
        {filterDialPage}
        {filterPageDirection}
        {filterSearch}
        {selectedGenreLabel}
        {selectedDecadeLabel}
        {activeFilterTags}
        onToggleFilterDial={toggleFilterDial}
        onRemoveFilterValue={removeFilterValue}
        onClearFilters={clearFilters}
        onHandleFilterTouchStart={handleFilterTouchStart}
        onHandleFilterTouchEnd={handleFilterTouchEnd}
        onClearDialFilters={clearDialFilters}
        onCollapseDial={() => (expandedFilterDial = null)}
        onUpdateFilterSearch={updateFilterSearch}
        onToggleFilter={toggleFilter}
        onChangeExpandedFilterPage={changeExpandedFilterPage}
      />

      <section
        bind:this={availableStashesSection}
        class:bottom-stashes-highlighted={highlightAvailableStashes}
        class="bottom-panel crate-panel queue-section bottom-stashes"
      >
        <div class="queue-section-header">
          <h3>Stashes</h3>
        </div>

        <div class="stash-tabs" role="tablist" aria-label="Stash views">
          <button
            class:stash-tab-active={stashView === 'available'}
            class="stash-tab"
            type="button"
            role="tab"
            aria-selected={stashView === 'available'}
            aria-label="Street Feed"
            title="Street Feed"
            onclick={() => (stashView = 'available')}
          >
            <span class="stash-tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <rect x="4.5" y="4.5" width="15" height="15" rx="3.2" fill="none" stroke="currentColor" stroke-width="1.8" />
                <circle cx="9" cy="9" r="1.15" fill="currentColor" />
                <circle cx="15" cy="9" r="1.15" fill="currentColor" />
                <circle cx="12" cy="12" r="1.15" fill="currentColor" />
                <circle cx="9" cy="15" r="1.15" fill="currentColor" />
                <circle cx="15" cy="15" r="1.15" fill="currentColor" />
              </svg>
            </span>
            <span class="stash-tab-label">Street Feed</span>
          </button>
          <button
            class:stash-tab-active={stashView === 'mine'}
            class:stash-tab-disabled={!data.session?.user}
            class="stash-tab"
            type="button"
            role="tab"
            aria-selected={stashView === 'mine'}
            aria-disabled={!data.session?.user}
            title={!data.session?.user ? 'Sign in to unlock My Stash.' : undefined}
            onclick={() => {
              if (data.session?.user) stashView = 'mine';
              else loginModalOpen = true;
            }}
          >
            <span class="stash-tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M5 11.2 12 5.6l7 5.6v7.2H5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                <path d="M9.5 18.4v-4.2h5v4.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </span>
            <span class="stash-tab-label">My Stash</span>
            {#if !data.session?.user}
              <span class="stash-tab-badge">Sign in</span>
            {/if}
          </button>
          {#if hasFriendsStash}
            <button
              class:stash-tab-active={stashView === 'friends'}
              class="stash-tab"
              type="button"
              role="tab"
              aria-selected={stashView === 'friends'}
              aria-label="Friends Stash"
              title="Friends Stash"
              onclick={() => (stashView = 'friends')}
            >
              <span class="stash-tab-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <circle cx="9" cy="9" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8" />
                  <circle cx="15.4" cy="9.7" r="2.1" fill="none" stroke="currentColor" stroke-width="1.8" />
                  <path d="M5.5 18.2c.6-2.2 2.4-3.6 4.8-3.6 2.4 0 4.2 1.4 4.8 3.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  <path d="M13.8 18.2c.3-1.6 1.6-2.7 3.3-2.7 1.1 0 2.1.4 2.9 1.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </span>
              <span class="stash-tab-label">Friends Stash</span>
            </button>
          {/if}
        </div>

        {#if stashView === 'mine'}
          <MyStashSection
            {activeState}
            {activePrivateSourceSummary}
            {mySources}
            {highlightedSourceId}
            {loadingStashId}
            {sourceManageError}
            {sourceManageSuccess}
            {formatSourceTimestamp}
            {formatSourceDateTime}
            onStartEditingSource={startEditingSource}
            onLoadPrivateSource={loadPrivateSource}
            onUnloadStash={unloadStash}
          />
        {:else if stashView === 'friends'}
          <FriendsStashSection
            {activeState}
            {activeSharedOverlapSummary}
            {activeSharedSourceSummary}
            {highlightedSourceId}
            {loadingStashId}
            {deletingFriendSourceId}
            {friendMatchingCountLoadingKey}
            {friendShelfVisible}
            {visibleFriendStashes}
            {mySources}
            signedIn={Boolean(data.session?.user)}
            {getFriendLoadMode}
            {getFriendShelfSourceId}
            {getFriendMatchingCount}
            onUnloadStash={unloadStash}
            onLoadFriendSource={loadFriendSource}
            onRequestDeleteFriendStash={requestDeleteFriendStash}
            onToggleFriendMode={toggleFriendShelfMode}
            onChangeFriendShelfSource={setFriendShelfSource}
          />
        {:else if activeState.status === 'loaded' && activeStashSummary}
          <div class="crate-feed loaded-crate-feed">
            <article class="stash-card record-card loaded-stash-card">
              <div class="stash-card-top">
                <div class="stash-card-heading">
                  <div>
                    <div class="loaded-card-title-row">
                      <h3>{activeStashSummary.name}</h3>
                      <span class="loaded-indicator">Live</span>
                    </div>
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
              <article class="stash-card record-card public-stash-card">
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
                    {loadingStashId === stash.id ? 'Loading...' : 'Load'}
                  </button>
                </div>
              </article>
            {/each}
          </div>
        {/if}
      </section>

      <SourcePanel
        signedIn={Boolean(data.session?.user)}
        {sourceTab}
        {replacingCsvSourceId}
        {highlightSourceReplaceBanner}
        {stashName}
        {stashNameError}
        {preview}
        {uploadError}
        {csvSuccessMessage}
        {pendingUpload}
        {uploadDestination}
        {discogsConnection}
        discogsOAuthEnabled={Boolean(data.discogsOAuthEnabled)}
        {discogsSourceSummary}
        {discogsStatusMessage}
        {discogsSuccessMessage}
        {importingDiscogs}
        {formatSourceDateTime}
        onSetSourceTab={(tab) => (sourceTab = tab)}
        onOpenLoginModal={() => (loginModalOpen = true)}
        onSubmitUpload={submitUpload}
        onCancelReplacingCsvSource={cancelReplacingCsvSource}
        onStashNameInput={handleStashNameInput}
        onHandleFileChange={handleFileChange}
        onSetUploadDestination={(destination) => (uploadDestination = destination)}
        onImportFromDiscogs={importFromDiscogs}
        onOpenResetDiscogsWarning={() => (resetDiscogsWarningOpen = true)}
        onOpenDiscogsTokenModal={() => (discogsTokenModalOpen = true)}
      />
    </section>

      <div class="bottom-strip-footer">
        <button
          class="text-button source-info-button"
          type="button"
          aria-label="About Shakedown Spins"
          title="About Shakedown Spins"
          onclick={() => (aboutModalOpen = true)}
        >
          <span class="info-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8" />
              <circle cx="12" cy="8" r="1.1" fill="currentColor" />
              <path d="M12 11v5.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </span>
        </button>
        {#if data.session?.user}
        <p class="footer-session-note">Signed in as {data.session.user.email}</p>
        <button
          class="text-button source-inbox-button"
          type="button"
          aria-label={unreadMessageCount > 0 ? `${unreadMessageCount} new messages` : 'Open message inbox'}
          title={unreadMessageCount > 0 ? `${unreadMessageCount} new messages` : 'Message inbox'}
          onclick={() => openInbox('inbox')}
        >
          <span class="message-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M4.5 6.5h15a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16V8a1.5 1.5 0 0 1 1.5-1.5Zm0 1.5v.29L12 12.9l7.5-4.61V8h-15Zm15 8v-5.94l-7.11 4.37a.75.75 0 0 1-.78 0L4.5 10.06V16h15Z"
                fill="currentColor"
              />
            </svg>
            {#if unreadMessageCount > 0}
              <span class="message-icon-alert" aria-hidden="true"></span>
            {/if}
          </span>
        </button>
        <button class="text-button source-profile-button" type="button" onclick={openProfileModal}>
          Edit Profile
        </button>
        <form method="POST" action="/signout" class="source-signout-form">
          <button class="text-button source-signout-button" type="submit">Sign Out</button>
        </form>
        {/if}
      </div>
  </main>
</div>

<MessagesModal
  open={inboxModalOpen}
  {inboxMode}
  {unreadMessageCount}
  {inboxLoading}
  {inboxError}
  {inboxSuccess}
  {memberMessages}
  {selectedMember}
  {memberSearchLoading}
  {memberSearchResults}
  {messageSearch}
  {selectedSharedSourceId}
  {sharedSources}
  {messageDraft}
  {sendingMemberMessage}
  {formatSourceDateTime}
  {inboxMessageExpanded}
  onClose={closeInboxModal}
  onSetMode={(mode) => {
    inboxMode = mode;
    if (mode === 'compose') {
      inboxError = null;
      inboxSuccess = null;
    }
  }}
  onToggleMessage={toggleInboxMessage}
  onAcceptSharedMessage={acceptSharedMessage}
  onUpdateMessageSearch={updateMessageSearch}
  onSelectMember={selectMember}
  onSharedSourceChange={(value) => {
    selectedSharedSourceId = value;
  }}
  onDraftChange={(value) => {
    messageDraft = value;
  }}
  onSubmit={sendInternalShareMessage}
/>

{#if aboutModalOpen}
  <div class="modal-backdrop" onclick={() => (aboutModalOpen = false)}>
    <div
      class="auth-modal about-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      onclick={(event) => event.stopPropagation()}
    >
      <div class="auth-modal-head">
        <h3 id="about-modal-title">About Shakedown Spins</h3>
        <button class="text-button" type="button" onclick={() => (aboutModalOpen = false)}>
          Close
        </button>
      </div>
      <div class="auth-sign-in auth-form about-form">
        <div class="about-brand-mark" aria-hidden="true">
          <img src="/shakedown-spins.png" alt="" />
        </div>
        <p class="profile-note">
          A private vinyl collection and shared listening collections for randomizing, rolling, filtering, and swapping stashes with friends.
        </p>
        <div class="about-copy-block">
          <strong>Sources</strong>
          <p>Album notes and fact snippets may reference third-party sources including Wikipedia, TheAudioDB, and Discogs import data.</p>
        </div>
        <div class="about-copy-block">
          <strong>Contact</strong>
          <p><a href="https://joekirchner.com/#contact" target="_blank" rel="noreferrer">joekirchner.com/#contact</a></p>
        </div>
        <p class="status-note about-legal-note">© 2026 Joe Kirchner. All rights reserved.</p>
      </div>
    </div>
  </div>
{/if}

{#if profileModalOpen}
  <div class="modal-backdrop" onclick={closeProfileModal}>
    <div
      class="auth-modal profile-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onclick={(event) => event.stopPropagation()}
    >
      <div class="auth-modal-head">
        <h3 id="profile-modal-title">Edit Profile</h3>
        <button class="text-button" type="button" onclick={closeProfileModal}>
          Close
        </button>
      </div>
      <form class="auth-sign-in auth-form profile-form" onsubmit={saveProfileSettings}>
        <p class="profile-note">This is the identity shown when you share a collection.</p>
        <div class="auth-email-fields">
          <label class="auth-email-label" for="profile-public-name">Public Profile Name</label>
          <input
            id="profile-public-name"
            class="auth-email-input"
            type="text"
            bind:value={profilePublicName}
            maxlength="60"
            placeholder="Your public collection name"
            required
          />
        </div>
        <div class="auth-email-fields">
          <label class="auth-email-label" for="profile-display-name">Display Name</label>
          <input
            id="profile-display-name"
            class="auth-email-input"
            type="text"
            bind:value={profileDisplayName}
            maxlength="60"
            placeholder="Your display name"
            required
          />
        </div>
        <div class="auth-email-fields">
          <label class="auth-email-label" for="profile-handle">Handle</label>
          <input
            id="profile-handle"
            class="auth-email-input"
            type="text"
            bind:value={profileHandle}
            maxlength="32"
            placeholder="your-handle"
            required
          />
        </div>
        {#if currentUserProfile?.email}
          <p class="profile-note">Signed in as {currentUserProfile.email}</p>
        {/if}
        {#if profileError}
          <p class="status-error">{profileError}</p>
        {/if}
        {#if profileSuccess}
          <p class="status-success">{profileSuccess}</p>
        {/if}
        <button type="submit" class="load-button auth-button" disabled={profileSaving}>
          {profileSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  </div>
{/if}

{#if editingSourceSummary}
  <div class="modal-backdrop" onclick={cancelEditingSource}>
    <div
      class="auth-modal source-edit-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-edit-modal-title"
      onclick={(event) => event.stopPropagation()}
    >
      <div class="auth-modal-head">
        <h3 id="source-edit-modal-title">Stash Settings</h3>
        <button class="text-button" type="button" onclick={cancelEditingSource}>
          Close
        </button>
      </div>
      <form
        class="auth-sign-in auth-form source-edit-form"
        onsubmit={(event) => {
          event.preventDefault();
          void saveSourceRename(editingSourceSummary.id);
        }}
      >
        <p class="profile-note">Manage the stash name, sharing, and delete controls here.</p>
        <label class="auth-email-fields" class:field-error={!!sourceManageError}>
          <span class="auth-email-label">Rename Private Stash</span>
          <input
            bind:value={editingSourceName}
            class="auth-email-input"
            maxlength="100"
            placeholder="Collection Name"
          />
        </label>
        {#if sourceManageError}
          <p class="status-error">{sourceManageError}</p>
        {/if}
        {#if sourceManageSuccess}
          <p class="status-success">{sourceManageSuccess}</p>
        {/if}
        <div class="stash-edit-actions source-edit-actions">
          <button
            class="load-button"
            type="submit"
            disabled={savingSourceId === editingSourceSummary.id}
          >
            {savingSourceId === editingSourceSummary.id ? 'Saving...' : 'Save Name'}
          </button>
          <button
            class="load-button clear-stash-button"
            type="button"
            disabled={deletingSourceId === editingSourceSummary.id}
            onclick={() => requestDeleteSource(editingSourceSummary.id, editingSourceSummary.name)}
          >
            {deletingSourceId === editingSourceSummary.id ? 'Deleting...' : 'Delete'}
          </button>
          {#if editingSourceSummary.kind === 'csv'}
            <button
              class="text-button"
              type="button"
              onclick={() => beginReplacingCsvSource(editingSourceSummary)}
            >
              Replace CSV
            </button>
          {/if}
        </div>
        <div class="source-edit-share-divider" aria-hidden="true"></div>
        <div class="share-settings-row source-edit-share-settings">
          <button
            class="text-button"
            type="button"
            disabled={savingSourceId === editingSourceSummary.id}
            onclick={() =>
              updateSourceVisibility(
                editingSourceSummary.id,
                editingSourceSummary.visibility === 'shared' ? 'private' : 'shared'
              )}
          >
            {editingSourceSummary.visibility === 'shared' ? 'Unshare' : 'Share'}
          </button>
          {#if editingSourceSummary.visibility === 'shared'}
            <button
              class="text-button"
              type="button"
              disabled={copyingShareId === editingSourceSummary.id}
              onclick={() => copyShareLink(editingSourceSummary.id)}
            >
              {copyingShareId === editingSourceSummary.id ? 'Copying...' : 'Copy Link'}
            </button>
            <button
              class="text-button"
              type="button"
              disabled={sendingShareId === editingSourceSummary.id}
              onclick={() => sendShareLink(editingSourceSummary.id)}
            >
              {sendingShareId === editingSourceSummary.id ? 'Sending...' : 'Send Stash'}
            </button>
          {/if}
        </div>
        {#if editingSourceSummary.visibility === 'shared'}
          <p class="status-note share-link-note">{buildShareUrl(editingSourceSummary.id)}</p>
        {/if}
      </form>
    </div>
  </div>
{/if}

{#if deleteSourceConfirm}
  <div class="modal-backdrop" onclick={() => (deleteSourceConfirm = null)}>
    <div
      class="auth-modal confirm-delete-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-source-modal-title"
      onclick={(event) => event.stopPropagation()}
    >
      <div class="auth-modal-head">
        <h3 id="delete-source-modal-title">Delete Stash?</h3>
      </div>
      <div class="auth-sign-in auth-form confirm-delete-form">
        <p class="profile-note">
          <strong>{deleteSourceConfirm.name}</strong> will be removed from My Stash.
        </p>
        <p class="status-note">This clears the stash, its albums, and any existing share link.</p>
        <div class="stash-edit-actions confirm-delete-actions">
          <button class="text-button" type="button" onclick={() => (deleteSourceConfirm = null)}>
            Cancel
          </button>
          <button
            class="load-button clear-stash-button"
            type="button"
            disabled={deletingSourceId === deleteSourceConfirm.id}
            onclick={() => {
              void confirmDeleteSource();
            }}
          >
            {deletingSourceId === deleteSourceConfirm.id ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if deleteFriendConfirm}
  <div class="modal-backdrop" onclick={() => (deleteFriendConfirm = null)}>
    <div
      class="auth-modal confirm-delete-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-friend-modal-title"
      onclick={(event) => event.stopPropagation()}
    >
      <div class="auth-modal-head">
        <h3 id="delete-friend-modal-title">Remove Friend Stash?</h3>
      </div>
      <div class="auth-sign-in auth-form confirm-delete-form">
        <p class="profile-note">
          <strong>{deleteFriendConfirm.name}</strong> will be removed from Friends Stash.
        </p>
        <p class="status-note">You can accept a new share again later if this friend sends it back.</p>
        <div class="stash-edit-actions confirm-delete-actions">
          <button class="text-button" type="button" onclick={() => (deleteFriendConfirm = null)}>
            Cancel
          </button>
          <button
            class="load-button clear-stash-button"
            type="button"
            disabled={deletingFriendSourceId === deleteFriendConfirm.id}
            onclick={() => {
              void confirmDeleteFriendStash();
            }}
          >
            {deletingFriendSourceId === deleteFriendConfirm.id ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if loginModalOpen}
  <div class="modal-backdrop" onclick={() => (loginModalOpen = false)}>
    <div
      class="auth-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      onclick={(event) => event.stopPropagation()}
    >
      <div class="auth-modal-head">
        <h3 id="login-modal-title">Sign In</h3>
        <button class="text-button" type="button" onclick={() => (loginModalOpen = false)}>
          Close
        </button>
      </div>
      <form class="auth-sign-in auth-form" method="POST" action="/signin">
        <input type="hidden" name="providerId" value="resend" />
        <input type="hidden" name="redirectTo" value="/?signedIn=1" />
        <div class="auth-email-fields">
          <label class="auth-email-label" for="auth-email-modal">Email</label>
          <input
            id="auth-email-modal"
            class="auth-email-input"
            type="email"
            name="email"
            placeholder="email@example.com"
            required
          />
        </div>
        <button type="submit" class="load-button auth-button">Send Magic Link</button>
      </form>
    </div>
  </div>
{/if}

{#if discogsTokenModalOpen}
  <div class="modal-backdrop" onclick={() => (discogsTokenModalOpen = false)}>
    <div
      class="auth-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discogs-token-modal-title"
      onclick={(event) => event.stopPropagation()}
    >
      <div class="auth-modal-head">
        <h3 id="discogs-token-modal-title">Connect Discogs</h3>
        <button class="text-button" type="button" onclick={() => (discogsTokenModalOpen = false)}>
          Close
        </button>
      </div>
      <form class="auth-sign-in auth-form" onsubmit={saveDiscogsPersonalToken}>
        <div class="auth-email-fields">
          <label class="auth-email-label" for="discogs-token-input">Discogs Personal Token</label>
          <input
            id="discogs-token-input"
            class="auth-email-input"
            type="text"
            bind:value={discogsTokenValue}
            placeholder="Paste your Discogs token"
            required
          />
        </div>
        <button type="submit" class="load-button auth-button" disabled={savingDiscogsToken}>
          {savingDiscogsToken ? 'Saving...' : 'Save Token'}
        </button>
        <div class="discogs-help-block">
          <button
            class="discogs-help-toggle"
            type="button"
            aria-expanded={discogsHelpOpen}
            aria-controls="discogs-help-panel"
            onclick={() => (discogsHelpOpen = !discogsHelpOpen)}
          >
            ?
          </button>
          <div class="discogs-help-copy">
            <strong>Need a token?</strong>
          </div>
        </div>
        {#if discogsHelpOpen}
          <div id="discogs-help-panel" class="discogs-help-panel">
            <p><a href="https://www.discogs.com/settings/developers" target="_blank" rel="noreferrer">Visit Discogs</a></p>
            <p>In Discogs, go to `Settings` → `Developers` → `Generate new token`.</p>
            <p>Copy that personal token and paste it into the 'Discogs Personal Token' field. Then select Save Token.</p>
          </div>
        {/if}
      </form>
    </div>
  </div>
{/if}

{#if resetDiscogsWarningOpen}
  <div class="modal-backdrop" onclick={() => (resetDiscogsWarningOpen = false)}>
    <div
      class="auth-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discogs-reset-modal-title"
      onclick={(event) => event.stopPropagation()}
    >
      <div class="auth-modal-head">
        <h3 id="discogs-reset-modal-title">Reset Discogs Key</h3>
      </div>
      <div class="auth-status-card">
        <div class="auth-status-copy">
          <strong>This will disconnect Discogs from your account.</strong>
        </div>
      </div>
      <div class="stash-edit-actions">
        <button class="load-button clear-stash-button" type="button" onclick={resetDiscogsToken}>
          Reset Discogs Key
        </button>
        <button class="text-button" type="button" onclick={() => (resetDiscogsWarningOpen = false)}>
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

{#if importingDiscogs}
  <div class="modal-backdrop import-overlay-backdrop">
    <div class="import-overlay" role="status" aria-live="polite" aria-label="Importing Discogs collection">
      <VinylLoader size={180} active={true} />
      <div class="import-overlay-copy">
        <strong>Importing Discogs</strong>
        <p>Pulling your collection into My Stash.</p>
      </div>
    </div>
  </div>
{/if}

{#if expiredLinkModalOpen}
  <div class="modal-backdrop" onclick={closeExpiredLinkModal}>
    <div
      class="auth-modal expired-link-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expired-link-modal-title"
      onclick={(event) => event.stopPropagation()}
    >
      <div class="auth-modal-head">
        <h3 id="expired-link-modal-title">Link Expired</h3>
        <button class="text-button" type="button" onclick={closeExpiredLinkModal}>
          Close
        </button>
      </div>
      <div class="auth-status-card">
        <div class="auth-status-copy">
          <strong>That magic link is no longer valid.</strong>
          <p>It may have already been used, or it may have expired. Request a fresh magic link from the main app screen.</p>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if welcomeModalOpen}
  <div class="modal-backdrop welcome-backdrop" onclick={closeWelcomeModal}>
    <div
      class="auth-modal welcome-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      onclick={(event) => event.stopPropagation()}
    >
      <div class="welcome-vinyl">
        <VinylLoader size={126} animated={true} />
      </div>
      <h2 class="welcome-heading" id="welcome-modal-title">Signed In &amp; Ready to Spin</h2>
      <p class="welcome-intro">Start by loading your own collection, then press the random button.</p>

      <ul class="welcome-features">
        <li>
          <span class="welcome-feature-label">My Stash</span>
          <span class="welcome-feature-desc">Upload a CSV or import from Discogs.</span>
        </li>
        <li>
          <span class="welcome-feature-label">Randomize Roll</span>
          <span class="welcome-feature-desc">Hit Random to let the receiver choose the next record.</span>
        </li>
        <li>
          <span class="welcome-feature-label">Filters</span>
          <span class="welcome-feature-desc">Dial the room down by genre or decade once a stash is loaded.</span>
        </li>
        <li>
          <span class="welcome-feature-label">Friends</span>
          <span class="welcome-feature-desc">Share stashes, swap links, and compare matching albums with friends.</span>
        </li>
      </ul>

      <button class="load-button welcome-go-button" type="button" onclick={closeWelcomeModal}>
        Enter The Room
      </button>
    </div>
  </div>
{/if}

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
    --font-display: "Satoshi", "Avenir Next", "Helvetica Neue", sans-serif;
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
    height: 689px;
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
    min-height: 40.5px;
  }

  .bottom-stashes > .queue-section-header,
  .source-panel > .queue-section-header {
    height: 40.5px;
    min-height: 40.5px;
  }

  .queue-section-header span {
    color: #d2b994;
    font-size: 0.9rem;
  }

  .queue-section-header h3,
  .selector-bank-head h3 {
    font-family: var(--font-display);
    font-size: 0.92rem;
    letter-spacing: 0.16em;
    line-height: 1;
    text-transform: uppercase;
    color: #f5deb0;
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
    margin-left: 0.42em;
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
    background: transparent;
  }

  .pick-reveal {
    display: grid;
    gap: 33px;
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

  .jump-to-stashes-kicker {
    display: none;
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

  .public-stash-card {
    padding: 18px 16px 14px;
  }

  .public-stash-card::before {
    width: 64px;
    height: 8px;
    background: rgba(101, 50, 24, 0.12);
  }

  .stash-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 10px;
  }

  .friend-shelf-card {
    min-height: 178px;
    gap: 10px;
    overflow: visible;
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
    border: 2px solid rgb(253 137 95);
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

  .stash-actions-group {
    display: grid;
    gap: 10px;
  }

  .stash-edit-button {
    align-self: start;
    font-size: 0.8rem;
    color: #3a210f;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .stash-edit-panel {
    display: grid;
    gap: 12px;
    margin-top: 10px;
    padding-top: 12px;
    border-top: 1px solid rgba(90, 58, 30, 0.14);
  }

  .share-settings-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }

  .share-link-note {
    margin: 0;
    word-break: break-all;
  }

  .stash-edit-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
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

  .bottom-stashes {
    grid-template-rows: auto auto minmax(0, 1fr);
    min-height: 0;
    max-height: 100%;
    overflow: hidden;
  }

  .bottom-stashes .crate-feed {
    min-height: 0;
    height: 100%;
    max-height: none;
  }

  .loaded-crate-feed {
    max-height: none;
    justify-items: center;
  }

  .stash-tabs {
    display: flex;
    align-items: stretch;
    flex-wrap: nowrap;
    width: 100%;
    gap: 6px;
    min-height: 40.5px;
    padding: 4px;
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(255, 237, 205, 0.08), rgba(29, 13, 8, 0.28)),
      linear-gradient(180deg, #2a150b 0%, #1a0d06 100%);
    border: 1px solid rgba(255, 223, 169, 0.08);
    box-shadow:
      inset 0 1px 0 rgba(255, 241, 214, 0.04),
      inset 0 -1px 0 rgba(8, 4, 2, 0.28);
  }

  .stash-tab {
    flex: 1 1 0;
    min-width: 0;
    min-height: 40.5px;
    padding: 10px 6px;
    border-radius: 12px;
    border: 1px solid transparent;
    background: transparent;
    color: rgba(232, 214, 181, 0.74);
    font-family: var(--font-ui);
    font-size: 0.74rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    box-shadow: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .stash-tab-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    line-height: 1;
    color: currentColor;
    flex-shrink: 0;
  }

  .stash-tab-icon svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .stash-tab-label {
    display: inline-flex;
    align-items: center;
  }

  .stash-tab:hover:not(:disabled),
  .stash-tab:focus-visible:not(:disabled) {
    color: #f7ead0;
    border-color: rgba(255, 214, 150, 0.12);
    background: rgba(255, 244, 220, 0.04);
  }

  .stash-tab-active {
    color: #fff1d2;
    border-color: rgba(214, 93, 58, 0.22);
    background:
      linear-gradient(180deg, rgba(255, 240, 210, 0.08), rgba(102, 44, 23, 0.18)),
      linear-gradient(180deg, rgba(255, 167, 126, 0.12), rgba(140, 50, 26, 0.18));
    box-shadow:
      inset 0 1px 0 rgba(255, 245, 225, 0.08),
      0 0 0 1px rgba(214, 93, 58, 0.08);
  }

  .stash-tab-disabled {
    color: rgba(210, 191, 158, 0.36);
    cursor: pointer;
    opacity: 0.8;
  }

  .stash-tab-disabled:hover,
  .stash-tab-disabled:focus-visible {
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

  .my-stash-feed {
    min-height: 0;
    align-content: start;
  }

  .my-stash-state {
    padding-block: 28px;
    text-align: center;
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

  .discogs-actions {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
  }

  .source-discogs-module {
    align-items: start;
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

  .discogs-help-block {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 12px;
    align-items: center;
    padding: 12px 14px;
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.22)),
      linear-gradient(180deg, #342015 0%, #22140d 100%);
    border: 1px solid rgba(255, 225, 176, 0.1);
  }

  .discogs-help-toggle {
    width: 45px;
    height: 45px;
    border-radius: 999px;
    border: 1px solid rgba(255, 225, 176, 0.16);
    background:
      linear-gradient(180deg, rgba(255, 240, 210, 0.08), rgba(102, 44, 23, 0.18)),
      linear-gradient(180deg, rgba(255, 167, 126, 0.12), rgba(140, 50, 26, 0.18));
    color: #fff1d2;
    font-family: var(--font-display);
    font-size: 1rem;
    line-height: 1;
    display: grid;
    place-items: center;
  }

  .discogs-help-copy {
    display: grid;
    gap: 4px;
  }

  .discogs-help-copy strong {
    font-family: var(--font-ui);
    font-size: 0.94rem;
    letter-spacing: 0.02em;
  }

  .discogs-help-panel {
    display: grid;
    gap: 6px;
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(14, 8, 5, 0.42);
    border: 1px solid rgba(255, 225, 176, 0.08);
  }

  .discogs-help-panel p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.86rem;
    line-height: 1.4;
  }

  .discogs-help-panel a {
    color: #fff1d2;
    text-underline-offset: 0.18em;
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

  .friend-stash-panel {
    display: grid;
    gap: 12px;
    padding-top: 14px;
  }

  .friend-stash-compare {
    display: grid;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(255, 245, 226, 0.32), rgba(213, 178, 113, 0.18));
    border: 1px solid rgba(143, 98, 53, 0.22);
  }

  .friend-stash-compare-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .friend-stash-compare-title {
    color: rgba(120, 36, 25, 0.82);
    font-family: var(--font-display);
    font-size: 0.78rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .friend-stash-shelf-compare {
    display: grid !important;
    margin-top: 0;
    width: 100%;
    box-sizing: border-box;
    align-self: stretch;
    min-height: max-content;
    overflow: visible;
  }

  .friend-stash-compare label {
    color: rgba(120, 36, 25, 0.82);
    font-family: var(--font-display);
    font-size: 0.78rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
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
    box-shadow:
      inset 0 1px 0 rgba(255, 214, 201, 0.18),
      0 2px 6px rgba(61, 28, 11, 0.08);
    transition:
      background 180ms ease,
      border-color 180ms ease,
      box-shadow 180ms ease;
  }

  .friend-stash-shelf-toggle-active {
    background:
      linear-gradient(180deg, rgba(139, 224, 110, 0.92), rgba(57, 145, 53, 0.94));
    border-color: rgba(43, 104, 37, 0.24);
    box-shadow:
      inset 0 1px 0 rgba(229, 255, 214, 0.18),
      0 2px 6px rgba(61, 28, 11, 0.08);
  }

  .friend-stash-shelf-toggle-track {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 100%;
    height: 100%;
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(255, 112, 96, 0.92), rgba(177, 40, 35, 0.94));
    transition: background 180ms ease;
  }

  .friend-stash-shelf-toggle-thumb {
    width: 18px;
    height: 18px;
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(255, 246, 226, 0.92), rgba(228, 203, 151, 0.98));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.36),
      0 2px 6px rgba(61, 28, 11, 0.12);
    transform: translateX(0);
    transition: transform 180ms ease;
  }

  .friend-stash-shelf-toggle-active .friend-stash-shelf-toggle-thumb {
    transform: translateX(20px);
  }

  .friend-stash-shelf-toggle-active .friend-stash-shelf-toggle-track {
    background:
      linear-gradient(180deg, rgba(139, 224, 110, 0.92), rgba(57, 145, 53, 0.94));
  }

  .loaded-card-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .loaded-indicator {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 11px;
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgb(255 68 0 / 72%), rgba(207, 47, 47, 0.72));
    border: 3px solid rgb(252 94 94);
    color: #ffffff;
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
    background: #ffffff;
    box-shadow: 0 0 10px rgba(207, 47, 47, 0.72);
  }

  .source-panel,
  .filter-panel {
    display: grid;
    gap: 12px;
    align-content: start;
  }

  .source-panel {
    grid-template-rows: auto minmax(0, 1fr);
  }

  .source-panel-body {
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    display: grid;
    align-content: start;
    gap: 12px;
    padding-right: 4px;
  }

  .source-signout-form {
    margin: 0;
  }

  .source-profile-button,
  .source-signout-button {
    padding-inline: 14px;
  }

  .source-inbox-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border-radius: 999px;
  }

  .source-info-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border-radius: 999px;
    font-family: var(--font-display);
  }

  .info-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: #3a210f;
  }

  .info-icon svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .message-icon {
    position: relative;
    display: inline-flex;
    width: 30px;
    height: 30px;
    color: #3a210f;
  }

  .message-icon svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .message-icon-alert {
    position: absolute;
    top: -2px;
    right: -3px;
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(255, 112, 96, 0.98), rgba(207, 47, 47, 0.98));
    box-shadow:
      0 0 0 2px rgba(30, 15, 9, 0.92),
      0 0 10px rgba(252, 94, 94, 0.4);
  }

  .bottom-strip-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
  }

  .shared-link-arrival {
    position: absolute;
    top: 68px;
    left: 50%;
    z-index: 4;
    display: inline-grid;
    justify-items: center;
    gap: 6px;
    width: min(calc(100% - 56px), 380px);
    transform: translateX(-50%);
    padding: 12px 16px 13px;
    border-radius: 18px;
    background:
      radial-gradient(circle at 50% 22%, rgba(255, 171, 120, 0.52) 0%, rgba(255, 143, 99, 0.28) 22%, transparent 58%),
      linear-gradient(180deg, rgba(255, 231, 193, 0.16), rgba(122, 24, 18, 0.12)),
      radial-gradient(circle at 50% 22%, #ff8f63 0%, #e5533a 26%, #cf2f2f 56%, #9b1a1f 100%);
    border: 1px solid rgba(78, 47, 28, 0.72);
    box-shadow:
      inset 0 1px 0 rgba(255, 234, 195, 0.18),
      0 0 0 1px rgba(214, 189, 145, 0.14),
      0 12px 20px rgba(86, 18, 8, 0.26);
    color: #ffe6b7;
    text-align: center;
    transition: opacity 900ms ease, transform 900ms ease;
  }

  .shared-link-arrival-kicker {
    color: rgba(255, 225, 184, 0.9);
    font-family: var(--font-display);
    font-size: 0.7rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .shared-link-arrival-main {
    display: grid;
    justify-items: center;
    width: 100%;
  }

  .shared-link-arrival strong {
    font-family: var(--font-display);
    font-size: 1rem;
    letter-spacing: 0.02em;
    font-weight: 700;
    text-transform: uppercase;
  }

  .shared-link-arrival-close {
    padding: 4px 10px;
    border: 1px solid rgba(255, 231, 193, 0.24);
    border-radius: 999px;
    background: rgba(86, 18, 8, 0.24);
    color: #fff1d2;
    font-family: var(--font-display);
    font-size: 0.64rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    box-shadow: inset 0 1px 0 rgba(255, 239, 212, 0.12);
  }

  .shared-link-arrival-close:hover:not(:disabled),
  .shared-link-arrival-close:focus-visible:not(:disabled) {
    transform: translateY(-1px);
    background: rgba(86, 18, 8, 0.34);
  }

  .shared-link-arrival-countdown {
    color: rgba(255, 225, 184, 0.82);
    font-family: var(--font-display);
    font-size: 0.68rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .shared-link-arrival-fading {
    opacity: 0;
    transform: translateX(-50%) translateY(-6px);
  }

  .footer-session-note {
    margin: 0 auto 0 0;
    color: rgba(232, 214, 181, 0.74);
    font-size: 0.82rem;
    line-height: 1.2;
  }

  .about-form {
    gap: 18px;
  }

  .about-brand-mark {
    display: grid;
    justify-items: center;
    margin-top: 4px;
  }

  .about-brand-mark img {
    width: 92px;
    height: 92px;
    object-fit: cover;
    border-radius: 18px;
    box-shadow:
      0 14px 24px rgba(19, 8, 4, 0.26),
      0 0 0 1px rgba(255, 220, 177, 0.12);
  }

  .about-copy-block {
    display: grid;
    gap: 8px;
  }

  .about-copy-block strong {
    color: #f3dfbb;
    font-family: var(--font-display);
    font-size: 0.82rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .about-copy-block p,
  .about-copy-block a {
    margin: 0;
    color: rgba(245, 233, 205, 0.9);
    line-height: 1.5;
  }

  .about-copy-block a {
    text-decoration: underline;
    text-underline-offset: 0.18em;
  }

  .about-legal-note {
    margin-top: 8px;
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

  .source-tab:disabled {
    color: rgba(210, 191, 158, 0.36);
    cursor: not-allowed;
  }

  .source-tab-disabled {
    color: rgba(210, 191, 158, 0.36);
    cursor: pointer;
    opacity: 0.8;
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

  .auth-panel {
    margin-bottom: 18px;
  }

  .auth-status-card {
    display: grid;
    gap: 14px;
    padding: 16px 18px;
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(42, 27, 18, 0.74), rgba(24, 16, 11, 0.88)),
      linear-gradient(180deg, rgba(255, 248, 233, 0.08), rgba(255, 248, 233, 0));
    border: 1px solid rgba(212, 93, 58, 0.2);
    box-shadow:
      inset 0 1px 0 rgba(255, 240, 220, 0.08),
      0 10px 24px rgba(0, 0, 0, 0.18);
  }

  .auth-status-signed-in {
    border-color: rgba(0, 255, 235, 0.26);
  }

  .auth-status-copy {
    display: grid;
    gap: 6px;
  }

  .auth-status-copy strong {
    font-family: var(--font-ui);
    font-size: 1.02rem;
    letter-spacing: 0.02em;
  }

  .auth-status-copy p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.94rem;
    line-height: 1.45;
  }

  .auth-error-note {
    color: rgba(255, 181, 159, 0.92) !important;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(10, 4, 2, 0.62);
    backdrop-filter: blur(6px);
  }

  .auth-modal {
    width: min(100%, 504px);
    display: grid;
    gap: 16px;
    padding: 20px;
    border-radius: 20px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.26)),
      linear-gradient(180deg, #3a2013 0%, #21120c 100%);
    border: 1px solid rgba(255, 225, 176, 0.14);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.08),
      0 24px 54px rgba(0, 0, 0, 0.34);
  }

  .auth-modal-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .auth-modal-head h3 {
    margin: 0;
  }

  .profile-modal {
    width: min(100%, 560px);
  }

  .source-edit-modal {
    width: min(100%, 580px);
  }

  .inbox-modal {
    width: min(100%, 760px);
  }

  .inbox-mode-strip {
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

  .inbox-list-shell {
    min-height: 320px;
  }

  .inbox-list {
    display: grid;
    gap: 12px;
    max-height: 420px;
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
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.06),
      inset 0 -1px 0 rgba(0, 0, 0, 0.22);
    cursor: default;
  }

  .message-card-unread {
    background:
      linear-gradient(180deg, rgba(255, 240, 210, 0.08), rgba(102, 44, 23, 0.18)),
      linear-gradient(180deg, rgb(255 81 0 / 75%), rgb(140 50 26));
    border-color: rgba(252, 137, 95, 0.36);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.08),
      0 0 0 1px rgba(252, 137, 95, 0.08);
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

  .message-card-heading strong {
    font-family: var(--font-ui);
    font-size: 0.94rem;
    line-height: 1.15;
  }

  .message-card-top p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.8rem;
    line-height: 1.2;
  }

  .message-card-controls {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
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
    min-width: 0;
    max-width: 210px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-ui);
    font-size: 0.78rem;
    color: #f0dfbf;
  }

  .message-card .stash-share-badge {
    color: rgb(255 206 0 / 92%);
  }

  .message-card .stash-kind-badge {
    color: rgb(238 176 176);
  }

  .message-card-body {
    margin: 0;
    color: #f0dfbf;
    font-size: 0.88rem;
    line-height: 1.42;
  }

  .message-card-actions {
    display: flex;
    justify-content: flex-end;
  }

  .message-open-button {
    min-width: 156px;
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

  .selected-member-card strong {
    font-family: var(--font-ui);
    font-size: 0.98rem;
  }

  .selected-member-card span {
    color: var(--color-text-muted);
    font-size: 0.84rem;
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

  .member-search-result strong {
    font-family: var(--font-ui);
    font-size: 0.92rem;
  }

  .member-search-result span {
    color: var(--color-text-muted);
    font-size: 0.82rem;
  }

  .inbox-compose-form {
    gap: 14px;
  }

  .inbox-message-input {
    min-height: 120px;
    resize: vertical;
  }

  .inbox-send-button {
    min-height: 78px;
    font-size: 1.46rem;
    letter-spacing: 0.08em;
  }

  .empty-state-compact {
    min-height: 220px;
  }

  .profile-form {
    gap: 14px;
  }

  .source-edit-form {
    gap: 14px;
  }

  .source-edit-share-settings {
    margin-top: 2px;
    gap: 8px;
  }

  .source-edit-share-settings .text-button {
    padding: 6px 10px;
    min-height: 34px;
    font-size: 0.76rem;
    letter-spacing: 0.08em;
  }

  .source-edit-share-divider {
    height: 1px;
    width: 100%;
    background: linear-gradient(90deg, transparent, rgba(120, 78, 42, 0.28), transparent);
  }

  .source-edit-actions {
    justify-content: flex-start;
  }

  .confirm-delete-modal {
    width: min(100%, 520px);
  }

  .confirm-delete-form {
    gap: 12px;
  }

  .confirm-delete-actions {
    justify-content: flex-end;
    align-items: center;
  }

  .profile-note {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .friend-load-modal {
    width: min(100%, 560px);
  }

  .friend-load-card {
    gap: 8px;
  }

  .friend-load-compare {
    margin-top: -4px;
  }

  .friend-load-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .import-overlay-backdrop {
    z-index: 36;
  }

  .import-overlay {
    display: grid;
    justify-items: center;
    gap: 18px;
    width: min(100%, 420px);
    padding: 28px 24px;
    border-radius: 24px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.26)),
      linear-gradient(180deg, #3a2013 0%, #21120c 100%);
    border: 1px solid rgba(255, 225, 176, 0.14);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.08),
      0 24px 54px rgba(0, 0, 0, 0.34);
    text-align: center;
  }

  .import-overlay-copy {
    display: grid;
    gap: 6px;
  }

  .import-overlay-copy strong {
    font-family: var(--font-ui);
    font-size: 1.08rem;
    letter-spacing: 0.03em;
  }

  .expired-link-modal {
    width: min(100%, 468px);
  }

  .welcome-backdrop {
    z-index: 39;
  }

  .welcome-modal {
    width: min(100%, 660px);
    justify-items: center;
    gap: 16px;
    text-align: center;
    padding: 22px 24px 28px;
    background:
      radial-gradient(circle at top, rgba(255, 245, 222, 0.08), transparent 32%),
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.26)),
      linear-gradient(180deg, #3a2013 0%, #21120c 100%);
  }

  .welcome-vinyl {
    display: grid;
    place-items: center;
    width: 168px;
    height: 168px;
    border-radius: 999px;
  }

  .welcome-heading {
    margin: 0;
    font-size: clamp(2.15rem, 3vw, 2.8rem);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    line-height: 1.02;
  }

  .welcome-intro {
    margin: 0;
    max-width: 58ch;
    color: var(--color-text-muted);
    font-size: 0.96rem;
    line-height: 1.6;
  }

  .welcome-features {
    display: grid;
    gap: 8px;
    width: 100%;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .welcome-features li {
    display: grid;
    grid-template-columns: 1fr;
    align-items: start;
    gap: 6px;
    padding: 10px 14px 11px;
    border-radius: 16px;
    text-align: left;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.06), rgba(31, 14, 8, 0.2)),
      linear-gradient(180deg, #321b11 0%, #1f120c 100%);
    border: 1px solid rgba(255, 225, 176, 0.1);
  }

  .welcome-feature-label {
    color: #f3deb1;
    font-family: var(--font-display);
    font-size: 0.84rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    display: block;
  }

  .welcome-feature-desc {
    color: var(--color-text-muted);
    font-size: 0.88rem;
    line-height: 1.42;
  }

  .welcome-go-button {
    width: min(100%, 320px);
    min-height: 74px;
    font-size: 1.42rem;
    letter-spacing: 0.08em;
  }

  .import-overlay-copy p {
    margin: 0;
    color: var(--color-text-muted);
  }

  .auth-kicker {
    color: #f0d7a2;
    font-family: var(--font-display);
    font-size: 0.82rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .auth-sign-in {
    display: grid;
    gap: 12px;
  }

  .auth-email-fields {
    display: grid;
    gap: 8px;
  }

  .auth-email-label {
    color: var(--color-text-muted);
    font-family: var(--font-ui);
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .auth-email-input {
    width: 100%;
    box-sizing: border-box;
    border-radius: 14px;
    border: 1px solid rgba(255, 235, 204, 0.14);
    background: rgba(12, 10, 9, 0.62);
    color: var(--color-text);
    padding: 12px 14px;
    font: inherit;
  }

  .auth-email-input::placeholder {
    color: rgba(219, 200, 164, 0.46);
  }

  .auth-action,
  .auth-sign-in :global(form),
  .auth-sign-in :global(.signInButton),
  .auth-action :global(.signOutButton) {
    display: block;
  }

  .auth-button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
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

  .auth-button:hover:not(:disabled),
  .auth-button:focus-visible:not(:disabled) {
    transform: translateY(-1px);
    box-shadow:
      inset 0 1px 0 rgba(255, 234, 195, 0.18),
      0 0 0 1px rgba(214, 189, 145, 0.16),
      0 16px 24px rgba(86, 18, 8, 0.3);
  }

  .auth-button:disabled {
    cursor: default;
    opacity: 0.78;
  }

  .selector-bank {
    display: grid;
    grid-template-rows: 40.5px auto;
    align-content: start;
    gap: 20px;
    padding: 16px;
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
    align-items: center;
    flex: 0 0 40.5px;
    height: 40.5px;
    min-height: 40.5px;
    max-height: 40.5px;
  }

  .selector-bank-head > div {
    display: flex;
    align-items: center;
    height: 40.5px;
    min-height: 40.5px;
    max-height: 40.5px;
  }

  .selector-bank-head h3 {
    display: flex;
    align-items: center;
    height: 40.5px;
    margin: 0;
    min-height: 40.5px;
    max-height: 40.5px;
    line-height: 1;
  }

  .filter-summary {
    margin: 2px 0 0;
    color: #d7be94;
    font-size: 0.84rem;
  }

  .filter-placeholder {
    display: grid;
    place-items: center;
    min-height: 160px;
    padding: 18px;
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.04), rgba(31, 14, 8, 0.18));
    border: 1px dashed rgba(255, 225, 176, 0.14);
    text-align: center;
  }

  .filter-placeholder p {
    margin: 0;
    color: var(--color-text-muted);
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

  .filter-tuner-idle {
    display: grid;
    place-items: center;
    min-height: 104px;
    padding: 18px;
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.04), rgba(31, 14, 8, 0.18));
    border: 1px dashed rgba(255, 225, 176, 0.14);
    text-align: center;
  }

  .filter-tuner-idle p {
    margin: 0;
    color: var(--color-text-muted);
  }

  .filter-tray {
    display: grid;
    gap: 16px;
    padding: 18px;
    border-radius: 22px;
    background:
      radial-gradient(circle at top, rgba(255, 245, 223, 0.08), transparent 42%),
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.26)),
      linear-gradient(180deg, #3a2013 0%, #21120c 100%);
    border: 1px solid rgba(255, 225, 176, 0.12);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.08),
      inset 0 -1px 0 rgba(0, 0, 0, 0.24);
  }

  .filter-tray-head {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 12px;
  }

  .filter-tray-head strong {
    font-family: var(--font-display);
    font-size: 1.36rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #f5deb0;
  }

  .filter-tray-kicker {
    color: rgba(207, 47, 47, 0.72);
    font-family: var(--font-display);
    font-size: 0.72rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  .filter-tray-search input {
    border-radius: 16px;
  }

  .filter-tray-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    align-content: start;
  }

  .filter-tray-option {
    min-height: 58px;
    padding: 12px 14px;
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.06), rgba(31, 14, 8, 0.22)),
      linear-gradient(180deg, #321b11 0%, #1f120c 100%);
    border: 1px solid rgba(255, 225, 176, 0.1);
    color: #f4e2bf;
    font-family: var(--font-ui);
    font-size: 0.88rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: none;
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.06),
      inset 0 -1px 0 rgba(0, 0, 0, 0.22);
  }

  .filter-tray-option:hover,
  .filter-tray-option:focus-visible {
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

  .filter-tray-option-active {
    background:
      linear-gradient(180deg, rgba(180, 255, 250, 0.18), rgba(21, 89, 84, 0.28));
    border-color: rgba(133, 243, 235, 0.2);
    color: #d9fffb;
    box-shadow: 0 0 12px rgba(71, 236, 224, 0.08);
  }

  .filter-tray-page {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding-top: 2px;
    color: rgba(234, 216, 182, 0.78);
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .filter-tray-page-button {
    min-width: 74px;
    padding: 10px 12px;
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.26)),
      linear-gradient(180deg, #2a150b 0%, #1a0d06 100%);
    border: 1px solid rgba(255, 225, 176, 0.12);
    color: #f1ddba;
    font-size: 0.78rem;
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.06),
      inset 0 -1px 0 rgba(0, 0, 0, 0.22);
  }

  .selector-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .selector-grid-dials {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
    justify-items: center;
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
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.08), rgba(31, 14, 8, 0.26)),
      linear-gradient(180deg, #3a2013 0%, #21120c 100%);
    border: 1px solid rgba(255, 225, 176, 0.12);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.08),
      inset 0 -1px 0 rgba(0, 0, 0, 0.24);
  }

  .selector-unit-dial-option {
    padding: 12px 10px 14px;
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(255, 236, 198, 0.06), rgba(31, 14, 8, 0.22)),
      linear-gradient(180deg, #321b11 0%, #1f120c 100%);
    border: 1px solid rgba(255, 225, 176, 0.1);
    box-shadow:
      inset 0 1px 0 rgba(255, 238, 200, 0.06),
      inset 0 -1px 0 rgba(0, 0, 0, 0.22);
  }

  .selector-unit-dial:hover,
  .selector-unit-dial:focus-visible {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }

  .selector-unit-dial-option:hover,
  .selector-unit-dial-option:focus-visible {
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

  .selector-knob-dial {
    width: 64px;
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.36),
      inset 0 -4px 7px rgba(52, 32, 17, 0.42),
      0 6px 12px rgba(0, 0, 0, 0.24),
      0 0 0 3px rgba(36, 23, 15, 0.72);
  }

  .selector-knob-dial::before {
    top: 10px;
    width: 3px;
    height: 18px;
  }

  .selector-knob-dial::after {
    inset: -6px;
    mask: radial-gradient(circle, transparent 0 31px, #000 32px 37px, transparent 38px);
  }

  .selector-label-dial {
    font-size: 0.74rem;
    letter-spacing: 0.14em;
  }

  .selector-value-dial {
    min-height: 0;
    max-width: 12ch;
    font-size: 0.84rem;
    line-height: 1.2;
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
    gap: 8px;
    padding: 6px 12px;
    border-radius: 999px;
    background:
      linear-gradient(180deg, rgba(180, 255, 250, 0.18), rgba(21, 89, 84, 0.28));
    border: 1px solid rgba(133, 243, 235, 0.2);
    color: #d9fffb;
    font-size: 0.84rem;
    box-shadow: 0 0 12px rgba(71, 236, 224, 0.08);
  }

  .rotary-head-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
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
    margin-top: 5%;
    padding: 14px;
    border-radius: 16px;
    background:
      linear-gradient(180deg, rgba(255, 228, 177, 0.06), rgba(24, 10, 6, 0.2));
    border: 1px solid rgba(255, 228, 177, 0.08);
  }

  .rotary-expanded-group {
    padding-top: 16px;
  }

  .filter-search-row {
    display: grid;
    gap: 6px;
    margin-bottom: 12px;
  }

  .filter-search-input {
    padding: 11px 14px;
    border-radius: 14px;
    border: 1px solid rgba(108, 233, 224, 0.14);
    background:
      linear-gradient(180deg, rgba(248, 228, 190, 0.08), rgba(52, 23, 11, 0.32)),
      rgba(20, 12, 8, 0.78);
    color: #f5e7c8;
  }

  .filter-search-input::placeholder {
    color: rgba(231, 211, 174, 0.58);
  }

  .filter-empty-state {
    margin: 0;
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
    justify-content: center;
    gap: 8px;
    margin-top: 12px;
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

  .rotary-option-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .rotary-option-viewport {
    overflow: hidden;
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
  }

  @media (max-width: 1180px) {
    .stash-tab {
      min-width: 54px;
      padding: 10px 6px;
      gap: 0;
    }

    .stash-tab-label {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .stash-tab-icon {
      width: 18px;
      height: 18px;
    }

    .stash-tab-badge {
      display: none;
    }
  }

  @media (max-width: 895px) {
    .shell {
      padding: 14px 12px calc(172px + env(safe-area-inset-bottom, 0px));
    }

    .player-panel {
      padding: 14px;
    }

    .album-card {
      grid-template-rows: auto auto;
      gap: 12px;
    }

    .album-display {
      min-height: clamp(188px, 28svh, 232px);
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
      bottom: max(0px, env(safe-area-inset-bottom, 0px));
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

    .album-stage {
      inset: 0;
      padding: 0;
    }

    .art-slot {
      width: min(67vw, 385px);
    }

    .art-gallery-controls {
      bottom: 14px;
      gap: 6px;
      padding: 4px 6px;
    }

    .art-gallery-button {
      width: 23px;
      height: 23px;
      font-size: 0.74rem;
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

    .bottom-strip-footer {
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 8px;
      text-align: center;
    }

    .footer-session-note {
      width: 100%;
      margin: 0;
      text-align: center;
      font-size: 0.78rem;
    }

    .source-profile-button,
    .source-signout-button {
      padding-inline: 12px;
      font-size: 0.76rem;
    }

    .source-inbox-button {
      width: 40px;
      height: 40px;
    }

    .source-info-button {
      width: 40px;
      height: 40px;
    }

    .message-icon {
      width: 26px;
      height: 26px;
    }

    .info-icon {
      width: 22px;
      height: 22px;
      font-size: 0.94rem;
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

  @media (max-width: 667px) {
    .player-panel {
      padding: 12px;
    }

    .album-card {
      gap: 10px;
    }

    .album-display {
      min-height: clamp(168px, 24svh, 208px);
    }
  }

  @media (max-width: 480px) {
    .shell {
      padding: 12px 10px calc(188px + env(safe-area-inset-bottom, 0px));
    }

    .album-display {
      min-height: clamp(154px, 22svh, 188px);
    }

    .album-stage {
      inset: 0;
      padding: 0;
    }

    .art-slot {
      width: min(63vw, 238px);
    }

    .art-gallery-controls {
      bottom: 12px;
    }

    .art-slot .cover-art {
      width: min(90%, 214px);
      height: min(90%, 214px);
    }

    .random-button {
      left: 0;
      right: 0;
      bottom: 0;
      height: 68px;
      min-height: 68px;
      padding: 12px 18px calc(14px + env(safe-area-inset-bottom, 0px));
      font-size: 1.5rem;
      letter-spacing: 0.08em;
      border-radius: 18px 18px 0 0;
    }

    .random-button-content {
      min-height: 34px;
    }

    .bottom-strip-footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }

    .footer-session-note {
      order: 1;
      width: 100%;
      font-size: 0.74rem;
    }

    .source-inbox-button,
    .source-profile-button,
    .source-signout-form {
      order: 2;
    }

    .source-profile-button,
    .source-signout-button {
      padding: 7px 10px;
      font-size: 0.72rem;
      letter-spacing: 0.03em;
    }

    .source-signout-form {
      margin: 0;
    }

    .source-inbox-button {
      width: 38px;
      height: 38px;
    }

    .source-info-button {
      order: 3;
      flex: 0 0 100%;
      margin-top: 2px;
      width: 38px;
      height: 38px;
    }

    .message-icon {
      width: 24px;
      height: 24px;
    }

    .info-icon {
      width: 20px;
      height: 20px;
      font-size: 0.88rem;
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
