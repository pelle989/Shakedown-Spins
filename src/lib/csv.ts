import type { ParsedAlbumInput, UploadPreview } from '$lib/types';

const REQUIRED_HEADERS = ['artist', 'title'] as const;
const HEADER_MAP: Record<string, keyof CsvRow> = {
  artist: 'artist',
  'artist(s)': 'artist',
  artist_name: 'artist',
  artistname: 'artist',
  'artist.name': 'artist',
  'song.artist_name': 'artist',
  band: 'artist',
  performer: 'artist',
  musician: 'artist',
  creator: 'artist',
  album_artist: 'artist',
  'album artist': 'artist',
  track_artist: 'artist',
  'track artist': 'artist',
  artist_id: 'artist',
  title: 'title',
  album: 'title',
  'album title': 'title',
  'release title': 'title',
  album_title: 'title',
  albumtitle: 'title',
  'release.name': 'title',
  'song.title': 'title',
  track: 'title',
  track_title: 'title',
  'track title': 'title',
  release: 'title',
  record: 'title',
  lp: 'title',
  album_name: 'title',
  'album name': 'title',
  song_name: 'title',
  'song name': 'title',
  release_id: 'discogsId',
  releaseid: 'discogsId',
  year: 'year',
  'song.year': 'year',
  released: 'year',
  release_year: 'year',
  'release year': 'year',
  release_date: 'year',
  'release date': 'year',
  date: 'year',
  original_year: 'year',
  'original year': 'year',
  genre: 'genre',
  subgenre: 'genre',
  style: 'genre',
  'artist.terms': 'genre',
  genres: 'genre',
  subgenres: 'genre',
  styles: 'genre',
  category: 'genre',
  categories: 'genre',
  tags: 'genre',
  keywords: 'genre',
  label: 'label',
  record_label: 'label',
  'record label': 'label',
  publisher: 'label',
  imprint: 'label',
  'release.id': 'discogsId',
  format: 'format',
  media: 'format',
  medium: 'format',
  type: 'format',
  release_format: 'format',
  'release format': 'format',
  'discogs id': 'discogsId',
  discogsid: 'discogsId',
  discogs_release_id: 'discogsId',
  'discogs release id': 'discogsId',
  mbid: 'discogsId',
  musicbrainz_id: 'discogsId',
  notes: 'notes'
};

type CsvRow = {
  artist: string;
  title: string;
  year: string;
  genre: string;
  label: string;
  format: string;
  discogsId: string;
  notes: string;
};

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function parseYear(raw: string): number | null {
  if (!/^\d{4}$/.test(raw.trim())) return null;
  return Number(raw);
}

function parseGenres(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function nullable(raw: string): string | null {
  const value = raw.trim();
  return value.length > 0 ? value : null;
}

function createRowObject(headers: string[], values: string[]): CsvRow {
  const base: CsvRow = {
    artist: '',
    title: '',
    year: '',
    genre: '',
    label: '',
    format: '',
    discogsId: '',
    notes: ''
  };

  headers.forEach((header, index) => {
    const mapped = HEADER_MAP[header];
    if (!mapped) return;
    base[mapped] = values[index] ?? '';
  });

  return base;
}

function resolveCanonicalHeaders(headers: string[]): string[] {
  return headers.map((header) => {
    const mapped = HEADER_MAP[header];
    if (mapped === 'artist') return 'artist';
    if (mapped === 'title') return 'title';
    return header;
  });
}

export function parseCsv(text: string): UploadPreview {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { validAlbums: 0, skippedRows: 0, albums: [] };
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const canonicalHeaders = resolveCanonicalHeaders(headers);
  const hasRequiredHeaders = REQUIRED_HEADERS.every((header) => canonicalHeaders.includes(header));
  if (!hasRequiredHeaders) {
    return { validAlbums: 0, skippedRows: Math.max(lines.length - 1, 0), albums: [] };
  }

  const albums: ParsedAlbumInput[] = [];
  let skippedRows = 0;

  for (const line of lines.slice(1)) {
    const row = createRowObject(headers, splitCsvLine(line));
    const artist = row.artist.trim();
    const title = row.title.trim();

    if (!artist || !title) {
      skippedRows += 1;
      continue;
    }

    albums.push({
      artist,
      title,
      year: parseYear(row.year),
      genre: parseGenres(row.genre),
      label: nullable(row.label),
      format: nullable(row.format),
      discogsId: nullable(row.discogsId),
      notes: nullable(row.notes)
    });
  }

  return {
    validAlbums: albums.length,
    skippedRows,
    albums
  };
}

export function fileLooksTooLarge(size: number): boolean {
  return size > 5 * 1024 * 1024;
}
