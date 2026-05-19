import { and, desc, eq } from 'drizzle-orm';

import type {
  DiscogsAlbumDetails,
  DiscogsAuthMode,
  DiscogsConnectionSummary,
  ParsedAlbumInput
} from '$lib/types';
import { authDb, schema } from '$lib/server/db/client';
import { fetchDiscogsOAuthIdentity, fetchDiscogsOAuthResource } from '$lib/server/discogs-oauth';
import { fetchWithTimeout } from '$lib/server/http';

const DISCOGS_API_BASE = 'https://api.discogs.com';
const USER_AGENT = 'ShakedownSpins/1.0 +https://joekirchner.com';

type DiscogsConnectionRow = typeof schema.discogsConnections.$inferSelect;
type ActiveDiscogsCredential = {
  authMode: DiscogsAuthMode;
  username: string;
  token: string;
  tokenSecret?: string | null;
  discogsUserId?: string | null;
};

function mapDiscogsConnection(row: DiscogsConnectionRow): DiscogsConnectionSummary {
  return {
    username: row.username,
    connectedAt: row.createdAt.toISOString(),
    authMode: row.authMode as DiscogsAuthMode,
    discogsUserId: row.discogsUserId ?? undefined
  };
}

function mapActiveDiscogsCredential(row: DiscogsConnectionRow): ActiveDiscogsCredential {
  return {
    authMode: row.authMode as DiscogsAuthMode,
    username: row.username,
    token: row.oauthToken,
    tokenSecret: row.oauthTokenSecret,
    discogsUserId: row.discogsUserId
  };
}

function buildDiscogsTokenHeader(token: string) {
  return `Discogs token=${token}`;
}

function normalizeDiscogsName(value?: string | null) {
  return value?.replace(/\s+\(\d+\)$/, '').trim() ?? '';
}

function buildDiscogsFormat(
  formats?: Array<{ name?: string; descriptions?: string[] }>
) {
  return (
    formats
      ?.map((entry) => [entry.name, ...(entry.descriptions ?? [])].filter(Boolean).join(' · '))
      .filter(Boolean)
      .join(', ') ?? null
  );
}

function buildDiscogsFact(args: {
  year?: number | null;
  label?: string | null;
  format?: string | null;
  country?: string | null;
  styles?: string[] | null;
}) {
  const parts = [
    args.year ? String(args.year) : null,
    args.label?.trim() || null,
    args.format?.trim() || null,
    args.country?.trim() || null
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(' • ');
  }

  const firstStyle = args.styles?.find(Boolean)?.trim();
  return firstStyle ? `Style: ${firstStyle}` : null;
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDiscogsBlurb(notes?: string | null) {
  if (!notes) return null;

  const normalized = stripHtml(notes);
  if (!normalized) return null;

  return normalized.length > 220 ? `${normalized.slice(0, 217).trimEnd()}...` : normalized;
}

async function fetchDiscogsIdentity(token: string) {
  const response = await fetchWithTimeout(`${DISCOGS_API_BASE}/oauth/identity`, {
    headers: {
      Authorization: buildDiscogsTokenHeader(token),
      'User-Agent': USER_AGENT
    }
  });

  const payload = (await response.json().catch(() => null)) as
    | { id?: number | string; username?: string }
    | null;

  if (!response.ok || !payload?.username) {
    throw new Error('Discogs token could not be verified. Check the token and try again.');
  }

  return {
    username: payload.username,
    discogsUserId: payload.id ? String(payload.id) : null
  };
}

async function tokenDiscogsFetch(args: { url: string; token: string }) {
  return fetchWithTimeout(args.url, {
    headers: {
      Authorization: buildDiscogsTokenHeader(args.token),
      'User-Agent': USER_AGENT
    }
  });
}

async function authenticatedDiscogsFetch(args: {
  url: string;
  credential: ActiveDiscogsCredential;
}) {
  if (args.credential.authMode === 'oauth') {
    return fetchDiscogsOAuthResource({
      url: args.url,
      oauthToken: args.credential.token,
      oauthTokenSecret: args.credential.tokenSecret ?? ''
    });
  }

  return tokenDiscogsFetch({
    url: args.url,
    token: args.credential.token
  });
}

async function publicDiscogsFetch(url: string) {
  return fetchWithTimeout(url, {
    headers: {
      'User-Agent': USER_AGENT
    }
  });
}

async function getOptionalDiscogsConnection(userId?: string | null) {
  if (!userId) return null;

  return authDb.query.discogsConnections.findFirst({
    where: eq(schema.discogsConnections.userId, userId)
  });
}

export async function listDiscogsConnection(userId: string): Promise<DiscogsConnectionSummary | null> {
  const row = await authDb.query.discogsConnections.findFirst({
    where: eq(schema.discogsConnections.userId, userId)
  });

  return row ? mapDiscogsConnection(row) : null;
}

export async function saveDiscogsToken(args: { userId: string; token: string }) {
  const token = args.token.trim();
  if (!token) {
    throw new Error('Discogs personal token is required.');
  }

  const { username, discogsUserId } = await fetchDiscogsIdentity(token);
  const now = new Date();
  const existing = await authDb.query.discogsConnections.findFirst({
    where: eq(schema.discogsConnections.userId, args.userId)
  });

  if (existing) {
    await authDb
      .update(schema.discogsConnections)
      .set({
        authMode: 'personal_token',
        username,
        oauthToken: token,
        oauthTokenSecret: null,
        discogsUserId,
        updatedAt: now
      })
      .where(eq(schema.discogsConnections.id, existing.id));
  } else {
    await authDb.insert(schema.discogsConnections).values({
      userId: args.userId,
      authMode: 'personal_token',
      username,
      oauthToken: token,
      oauthTokenSecret: null,
      discogsUserId,
      updatedAt: now
    });
  }

  return {
    username,
    authMode: 'personal_token' as const,
    discogsUserId: discogsUserId ?? undefined
  };
}

export async function saveDiscogsOAuthConnection(args: {
  userId: string;
  oauthToken: string;
  oauthTokenSecret: string;
}) {
  const { username, discogsUserId } = await fetchDiscogsOAuthIdentity({
    oauthToken: args.oauthToken,
    oauthTokenSecret: args.oauthTokenSecret
  });

  const now = new Date();
  const existing = await authDb.query.discogsConnections.findFirst({
    where: eq(schema.discogsConnections.userId, args.userId)
  });

  if (existing) {
    await authDb
      .update(schema.discogsConnections)
      .set({
        authMode: 'oauth',
        username,
        oauthToken: args.oauthToken,
        oauthTokenSecret: args.oauthTokenSecret,
        discogsUserId,
        updatedAt: now
      })
      .where(eq(schema.discogsConnections.id, existing.id));
  } else {
    await authDb.insert(schema.discogsConnections).values({
      userId: args.userId,
      authMode: 'oauth',
      username,
      oauthToken: args.oauthToken,
      oauthTokenSecret: args.oauthTokenSecret,
      discogsUserId,
      updatedAt: now
    });
  }

  return {
    username,
    authMode: 'oauth' as const,
    discogsUserId: discogsUserId ?? undefined
  };
}

async function requireDiscogsConnection(userId: string) {
  const connection = await authDb.query.discogsConnections.findFirst({
    where: eq(schema.discogsConnections.userId, userId)
  });

  if (!connection) {
    throw new Error('Connect Discogs before importing your collection.');
  }

  return mapActiveDiscogsCredential(connection);
}

export async function importDiscogsCollection(userId: string) {
  const connection = await requireDiscogsConnection(userId);

  const collected: ParsedAlbumInput[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${DISCOGS_API_BASE}/users/${encodeURIComponent(connection.username)}/collection/folders/0/releases?per_page=100&page=${page}`;
    const response = await authenticatedDiscogsFetch({ url, credential: connection });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Discogs import failed: ${message || response.statusText}`);
    }

      const payload = (await response.json()) as {
      releases?: Array<{
        basic_information?: {
          title?: string;
          year?: number;
          artists?: Array<{ name?: string }>;
          labels?: Array<{ name?: string }>;
          formats?: Array<{ name?: string; descriptions?: string[] }>;
          genres?: string[];
          styles?: string[];
          id?: number;
          cover_image?: string;
        };
        notes?: Array<{ value?: string }>;
      }>;
      pagination?: { pages?: number };
    };

    totalPages = payload.pagination?.pages ?? page;

    for (const release of payload.releases ?? []) {
      const info = release.basic_information;
      if (!info?.title) continue;

      const artist =
        info.artists
          ?.map((entry) => normalizeDiscogsName(entry.name))
          .filter(Boolean)
          .join(', ') ?? '';

      if (!artist) continue;

      const format = buildDiscogsFormat(info.formats);

      const notes =
        release.notes?.map((entry) => entry.value?.trim()).filter(Boolean).join(' | ') ?? null;

      collected.push({
        artist,
        title: info.title.trim(),
        year: typeof info.year === 'number' ? info.year : null,
        genre: [...(info.genres ?? []), ...(info.styles ?? [])].filter(Boolean),
        label: info.labels?.[0]?.name?.trim() ?? null,
        format,
        discogsId: info.id ? String(info.id) : null,
        notes,
        coverImageUrl: info.cover_image?.trim() ?? null
      });
    }

    page += 1;
  }

  if (collected.length === 0) {
    throw new Error('Discogs collection import returned no albums.');
  }

  const now = new Date();
  const sourceName = `Discogs • ${connection.username}`;
  const existingSource = await authDb.query.sources.findFirst({
    where: and(eq(schema.sources.userId, userId), eq(schema.sources.kind, 'discogs')),
    orderBy: [desc(schema.sources.updatedAt)]
  });

  if (existingSource) {
    await authDb.transaction(async (tx) => {
      await tx.delete(schema.sourceAlbums).where(eq(schema.sourceAlbums.sourceId, existingSource.id));
      await tx
        .update(schema.sources)
        .set({
          name: sourceName,
          albumCount: collected.length,
          visibility: 'private',
          syncStatus: 'ready',
          lastSyncedAt: now,
          updatedAt: now
        })
        .where(eq(schema.sources.id, existingSource.id));

      await tx.insert(schema.sourceAlbums).values(
        collected.map((album, index) => ({
          sourceId: existingSource.id,
          rowOrder: index,
          artist: album.artist,
          title: album.title,
          year: album.year,
          genre: album.genre,
          label: album.label,
          format: album.format,
          discogsId: album.discogsId,
          notes: album.notes,
          coverImageUrl: album.coverImageUrl,
          updatedAt: now
        }))
      );
    });

    const updated = await authDb.query.sources.findFirst({
      where: eq(schema.sources.id, existingSource.id)
    });

    if (!updated) {
      throw new Error('Discogs source update failed.');
    }

    return {
      sourceId: updated.id,
      sourceName: updated.name,
      albumCount: updated.albumCount
    };
  }

  const [source] = await authDb
    .insert(schema.sources)
    .values({
      userId,
      kind: 'discogs',
      name: sourceName,
      visibility: 'private',
      syncStatus: 'ready',
      lastSyncedAt: now,
      albumCount: collected.length,
      updatedAt: now
    })
    .returning();

  await authDb.insert(schema.sourceAlbums).values(
    collected.map((album, index) => ({
      sourceId: source.id,
      rowOrder: index,
      artist: album.artist,
      title: album.title,
      year: album.year,
      genre: album.genre,
      label: album.label,
      format: album.format,
      discogsId: album.discogsId,
      notes: album.notes,
      coverImageUrl: album.coverImageUrl,
      updatedAt: now
    }))
  );

  return {
    sourceId: source.id,
    sourceName: source.name,
    albumCount: source.albumCount
  };
}

export async function getDiscogsReleaseDetails(args: {
  userId: string;
  sourceId: string;
  albumId: string;
}): Promise<DiscogsAlbumDetails> {
  const source = await authDb.query.sources.findFirst({
    where: and(eq(schema.sources.id, args.sourceId), eq(schema.sources.userId, args.userId))
  });

  if (!source || source.kind !== 'discogs') {
    throw new Error('Discogs source not found.');
  }

  const album = await authDb.query.sourceAlbums.findFirst({
    where: and(eq(schema.sourceAlbums.id, args.albumId), eq(schema.sourceAlbums.sourceId, args.sourceId))
  });

  if (!album?.discogsId) {
    throw new Error('Discogs release details are not available for this album.');
  }

  const connection = await requireDiscogsConnection(args.userId);
  const response = await authenticatedDiscogsFetch({
    url: `${DISCOGS_API_BASE}/releases/${encodeURIComponent(album.discogsId)}`,
    credential: connection
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Discogs release details failed: ${message || response.statusText}`);
  }

  const payload = (await response.json()) as {
    year?: number;
    country?: string;
    notes?: string;
    styles?: string[];
    labels?: Array<{ name?: string }>;
    formats?: Array<{ name?: string; descriptions?: string[] }>;
    images?: Array<{ uri?: string; type?: string }>;
  };

  const imageUrls = Array.from(
    new Set(
      (payload.images ?? [])
        .slice()
        .sort((a, b) => (a.type === 'primary' ? -1 : 0) - (b.type === 'primary' ? -1 : 0))
        .map((image) => image.uri?.trim())
        .filter(Boolean) as string[]
    )
  );

  if (imageUrls.length === 0 && album.coverImageUrl) {
    imageUrls.push(album.coverImageUrl);
  }

  const year = typeof payload.year === 'number' ? payload.year : (album.year ?? undefined);
  const label = payload.labels?.[0]?.name?.trim() || album.label || undefined;
  const format = buildDiscogsFormat(payload.formats) || album.format || undefined;
  const country = payload.country?.trim() || undefined;
  const styles = (payload.styles ?? []).map((value) => value.trim()).filter(Boolean);
  const fact =
    buildDiscogsFact({
      year,
      label,
      format,
      country,
      styles
    }) ?? null;
  const blurb = buildDiscogsBlurb(payload.notes);

  return {
    imageUrls,
    fact,
    blurb,
    year,
    label,
    format,
    country,
    styles: styles.length > 0 ? styles : undefined
  };
}

export async function getDiscogsReleaseDetailsByDiscogsId(args: {
  discogsId: string;
  userId?: string | null;
}): Promise<DiscogsAlbumDetails> {
  const discogsId = args.discogsId.trim();
  if (!discogsId) {
    throw new Error('Discogs release id is required.');
  }

  const connection = await getOptionalDiscogsConnection(args.userId);
  const credential = connection ? mapActiveDiscogsCredential(connection) : null;
  const releaseUrl = `${DISCOGS_API_BASE}/releases/${encodeURIComponent(discogsId)}`;
  const response = credential
    ? await authenticatedDiscogsFetch({ url: releaseUrl, credential })
    : await publicDiscogsFetch(releaseUrl);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Discogs release details failed: ${message || response.statusText}`);
  }

  const payload = (await response.json()) as {
    year?: number;
    country?: string;
    notes?: string;
    styles?: string[];
    labels?: Array<{ name?: string }>;
    formats?: Array<{ name?: string; descriptions?: string[] }>;
    images?: Array<{ uri?: string; type?: string }>;
  };

  const imageUrls = Array.from(
    new Set(
      (payload.images ?? [])
        .slice()
        .sort((a, b) => (a.type === 'primary' ? -1 : 0) - (b.type === 'primary' ? -1 : 0))
        .map((image) => image.uri?.trim())
        .filter(Boolean) as string[]
    )
  );

  const year = typeof payload.year === 'number' ? payload.year : undefined;
  const label = payload.labels?.[0]?.name?.trim() || undefined;
  const format = buildDiscogsFormat(payload.formats) || undefined;
  const country = payload.country?.trim() || undefined;
  const styles = (payload.styles ?? []).map((value) => value.trim()).filter(Boolean);
  const fact =
    buildDiscogsFact({
      year,
      label,
      format,
      country,
      styles
    }) ?? null;
  const blurb = buildDiscogsBlurb(payload.notes);

  return {
    imageUrls,
    fact,
    blurb,
    year,
    label,
    format,
    country,
    styles: styles.length > 0 ? styles : undefined
  };
}
