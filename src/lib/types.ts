export type Top10AlbumSource = {
  kind: 'top10';
  id: string;
  label: string;
};

export type PrivateAlbumSource = {
  kind: 'private';
  id: string;
  label: string;
};

export type SharedAlbumSource = {
  kind: 'shared';
  id: string;
  label: string;
};

export type SharedOverlapAlbumSource = {
  kind: 'shared-overlap';
  id: string;
  label: string;
  sharedSourceId: string;
  mineSourceId: string;
};

export type AlbumSource =
  | Top10AlbumSource
  | PrivateAlbumSource
  | SharedAlbumSource
  | SharedOverlapAlbumSource;

export type Album = {
  id: string;
  title: string;
  artist: string;
  year?: number;
  genre?: string[];
  label?: string;
  format?: string;
  discogsId?: string;
  notes?: string;
  coverImageUrl?: string;
  country?: string;
  styles?: string[];
};

export type AlbumCollection = {
  source: AlbumSource;
  albums: Album[];
};

export type ActiveCollectionState =
  | { status: 'idle' }
  | { status: 'loaded'; collection: AlbumCollection };

export type StashPreviewAlbum = Pick<Album, 'artist' | 'title' | 'year' | 'genre'>;

export type StashSummary = {
  id: string;
  name: string;
  albumCount: number;
  createdAt: string;
  stashPreview: StashPreviewAlbum[];
};

export type LoadedStash = StashSummary & {
  albums: Album[];
};

export type PrivateSourceSummary = {
  id: string;
  name: string;
  albumCount: number;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
  kind: string;
  visibility: 'private' | 'shared';
  syncStatus: 'ready' | 'syncing' | 'error';
};

export type LoadedPrivateSource = PrivateSourceSummary & {
  albums: Album[];
};

export type SharedOwnerProfile = {
  publicProfileName: string;
  displayName: string;
  handle: string;
};

export type UserProfileSettings = SharedOwnerProfile & {
  email: string;
};

export type UserUiPreferences = {
  welcomeSeen: boolean;
  welcomeSeenAt: string | null;
  friendLoadModes: Record<string, 'full' | 'matching'>;
  friendShelfSources: Record<string, string>;
};

export type SharedSourceSummary = {
  id: string;
  name: string;
  albumCount: number;
  updatedAt: string;
  createdAt: string;
  lastSyncedAt?: string;
  kind: string;
  visibility: 'shared';
  syncStatus: 'ready' | 'syncing' | 'error';
};

export type LoadedSharedSource = SharedSourceSummary & {
  owner: SharedOwnerProfile;
  albums: Album[];
};

export type FriendStashSummary = SharedSourceSummary & {
  owner: SharedOwnerProfile;
};

export type MemberDirectoryEntry = SharedOwnerProfile & {
  id: string;
};

export type MemberMessageSourceSummary = {
  id: string;
  name: string;
  owner: SharedOwnerProfile;
};

export type MemberMessageSummary = {
  id: string;
  direction: 'inbox' | 'sent';
  body?: string;
  createdAt: string;
  readAt?: string;
  sender: SharedOwnerProfile;
  recipient: SharedOwnerProfile;
  sharedSource?: MemberMessageSourceSummary | null;
};

export type SharedOverlapCollection = {
  id: string;
  name: string;
  albumCount: number;
  mineSourceId: string;
  mineSourceName: string;
  sharedSourceId: string;
  sharedSourceName: string;
  sharedOwner: SharedOwnerProfile;
  albums: Album[];
};

export type DiscogsAuthMode = 'personal_token' | 'oauth';

export type DiscogsConnectionSummary = {
  username: string;
  connectedAt: string;
  authMode: DiscogsAuthMode;
  discogsUserId?: string;
};

export type DiscogsAlbumDetails = {
  imageUrls: string[];
  fact: string | null;
  blurb: string | null;
  year?: number;
  label?: string;
  format?: string;
  country?: string;
  styles?: string[];
};

export type ContextBlurb = {
  text: string;
  source: 'Wikipedia' | 'TheAudioDB';
  sourceUrl: string;
  truncated: boolean;
};

export type AlbumContext = {
  albumSummary: ContextBlurb | null;
  artistSummary: ContextBlurb | null;
};

export type UploadPreview = {
  validAlbums: number;
  skippedRows: number;
  albums: ParsedAlbumInput[];
};

export type ParsedAlbumInput = {
  artist: string;
  title: string;
  year: number | null;
  genre: string[];
  label: string | null;
  format: string | null;
  discogsId: string | null;
  notes: string | null;
  coverImageUrl?: string | null;
};

export type UploadResponse = {
  stash: StashSummary;
};

export type FilterState = {
  genre: string[];
  decade: string[];
  label: string[];
  format: string[];
};

export type FeedData = {
  stashes: StashSummary[];
  mySources: PrivateSourceSummary[];
  friendStashes: FriendStashSummary[];
  memberMessages: MemberMessageSummary[];
  unreadMessageCount: number;
  discogsConnection: DiscogsConnectionSummary | null;
  discogsOAuthEnabled?: boolean;
  databaseAvailable: boolean;
  currentUserProfile?: UserProfileSettings | null;
  uiPreferences?: UserUiPreferences | null;
  initialSharedSource?: LoadedSharedSource | null;
  initialSharedOverlap?: SharedOverlapCollection | null;
};
