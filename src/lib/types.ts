export type Top10AlbumSource = {
  kind: 'top10';
  id: string;
  label: string;
};

export type AlbumSource = Top10AlbumSource;

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
  databaseAvailable: boolean;
};
