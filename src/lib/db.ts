import { Pool } from 'pg';
import { env } from '$env/dynamic/private';
import type { FeedData, LoadedStash, ParsedAlbumInput, StashPreviewAlbum, StashSummary } from '$lib/types';

const DATABASE_URL = env.DATABASE_URL ?? process.env.DATABASE_URL ?? '';
const DATABASE_URL_UNPOOLED = env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL_UNPOOLED ?? '';

let readPool: Pool | null = null;
let writePool: Pool | null = null;

function getReadPool(): Pool | null {
  if (!DATABASE_URL) return null;
  readPool ??= new Pool({ connectionString: DATABASE_URL });
  return readPool;
}

function getWritePool(): Pool | null {
  if (!DATABASE_URL_UNPOOLED) return null;
  writePool ??= new Pool({ connectionString: DATABASE_URL_UNPOOLED });
  return writePool;
}

type SummaryRow = {
  id: string;
  name: string;
  album_count: number;
  created_at: string;
  stash_preview_json: StashPreviewAlbum[] | null;
};

function mapSummary(row: SummaryRow): StashSummary {
  return {
    id: String(row.id),
    name: String(row.name),
    albumCount: Number(row.album_count),
    createdAt: new Date(String(row.created_at)).toISOString(),
    stashPreview: Array.isArray(row.stash_preview_json)
      ? (row.stash_preview_json as StashPreviewAlbum[])
      : []
  };
}

export function databaseAvailable(): boolean {
  return Boolean(DATABASE_URL && DATABASE_URL_UNPOOLED);
}

export async function listStashes(): Promise<FeedData> {
  const pool = getReadPool();
  if (!pool) {
    return { stashes: [], databaseAvailable: false };
  }

  const result = await pool.query<SummaryRow>(
    `select id, name, album_count, created_at, stash_preview_json
     from stashes
     order by created_at desc
     limit 10`
  );

  return {
    stashes: result.rows.map(mapSummary),
    databaseAvailable: true
  };
}

export async function getStash(id: string): Promise<LoadedStash | null> {
  const pool = getReadPool();
  if (!pool) return null;

  const summaryResult = await pool.query<SummaryRow>(
    `select id, name, album_count, created_at, stash_preview_json
     from stashes
     where id = $1`,
    [id]
  );

  if (summaryResult.rowCount === 0) return null;

  const albumsResult = await pool.query<{
    id: string;
    title: string;
    artist: string;
    year: number | null;
    genre: string[] | null;
    label: string | null;
    format: string | null;
    discogs_id: string | null;
    notes: string | null;
  }>(
    `select id, title, artist, year, genre, label, format, discogs_id, notes
     from stash_albums
     where stash_id = $1
     order by row_order asc`,
    [id]
  );

  const summary = mapSummary(summaryResult.rows[0]);

  return {
    ...summary,
    albums: albumsResult.rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      artist: String(row.artist),
      year: row.year ? Number(row.year) : undefined,
      genre: Array.isArray(row.genre) ? (row.genre as string[]) : undefined,
      label: row.label ? String(row.label) : undefined,
      format: row.format ? String(row.format) : undefined,
      discogsId: row.discogs_id ? String(row.discogs_id) : undefined,
      notes: row.notes ? String(row.notes) : undefined
    }))
  };
}

export async function createStash(args: {
  name: string;
  albums: ParsedAlbumInput[];
  ipHash: string;
}): Promise<StashSummary> {
  const pool = getWritePool();
  if (!pool) {
    throw new Error('DATABASE_URL_UNPOOLED is not configured');
  }

  const result = await pool.query<(SummaryRow & { outcome: string | null })>(
    'select * from create_stash($1::text, $2::jsonb, $3::text)',
    [args.name, JSON.stringify(args.albums), args.ipHash]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('create_stash returned no rows');
  }

  if (row.outcome === 'rate_limited') {
    const error = new Error('Rate limited');
    error.name = 'RateLimitError';
    throw error;
  }

  return mapSummary(row);
}
