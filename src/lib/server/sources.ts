import { and, asc, desc, eq } from 'drizzle-orm';

import type {
  Album,
  FriendStashSummary,
  LoadedPrivateSource,
  LoadedSharedSource,
  ParsedAlbumInput,
  PrivateSourceSummary,
  SharedOverlapCollection
} from '$lib/types';
import { authDb, schema } from '$lib/server/db/client';
import { buildSharedOwnerProfile } from '$lib/server/profile';

function mapSourceSummary(
  row: typeof schema.sources.$inferSelect
): PrivateSourceSummary {
  return {
    id: row.id,
    name: row.name,
    albumCount: row.albumCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastSyncedAt: row.lastSyncedAt?.toISOString(),
    kind: row.kind,
    visibility: row.visibility as 'private' | 'shared',
    syncStatus: row.syncStatus as 'ready' | 'syncing' | 'error'
  };
}

function mapSourceAlbums(rows: Array<typeof schema.sourceAlbums.$inferSelect>): Album[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    year: row.year ?? undefined,
    genre: row.genre.length > 0 ? row.genre : undefined,
    label: row.label ?? undefined,
    format: row.format ?? undefined,
    discogsId: row.discogsId ?? undefined,
    notes: row.notes ?? undefined,
    coverImageUrl: row.coverImageUrl ?? undefined
  }));
}

function mapLoadedSource(
  source: typeof schema.sources.$inferSelect,
  albums: Array<typeof schema.sourceAlbums.$inferSelect>
): LoadedPrivateSource {
  return {
    ...mapSourceSummary(source),
    albums: mapSourceAlbums(albums)
  };
}

function normalizeText(value: string | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function overlapKey(album: Album) {
  if (album.discogsId) return `discogs:${album.discogsId}`;
  return `title:${normalizeText(album.artist)}::${normalizeText(album.title)}`;
}

export async function listUserSources(userId: string): Promise<PrivateSourceSummary[]> {
  const rows = await authDb.query.sources.findMany({
    where: eq(schema.sources.userId, userId),
    orderBy: [desc(schema.sources.updatedAt)]
  });

  return rows.map(mapSourceSummary);
}

export async function ensureSharedSourceAccess(args: {
  userId: string;
  sourceId: string;
}): Promise<void> {
  const source = await authDb.query.sources.findFirst({
    where: and(eq(schema.sources.id, args.sourceId), eq(schema.sources.visibility, 'shared'))
  });

  if (!source || source.userId === args.userId) return;

  await authDb
    .insert(schema.sharedSourceAccess)
    .values({
      sourceId: args.sourceId,
      recipientUserId: args.userId
    })
    .onConflictDoNothing();
}

export async function listAccessibleSharedSources(userId: string): Promise<FriendStashSummary[]> {
  const rows = await authDb.query.sharedSourceAccess.findMany({
    where: eq(schema.sharedSourceAccess.recipientUserId, userId),
    orderBy: [desc(schema.sharedSourceAccess.createdAt)],
    with: {
      source: {
        with: {
          user: true
        }
      }
    }
  });

  return rows
    .map((row) => {
      if (!row.source?.user || row.source.visibility !== 'shared') return null;

      return {
        ...mapSourceSummary(row.source),
        owner: buildSharedOwnerProfile(row.source.user),
        visibility: 'shared'
      } satisfies FriendStashSummary;
    })
    .filter((row): row is FriendStashSummary => Boolean(row));
}

export async function revokeSharedSourceAccess(args: {
  userId: string;
  sourceId: string;
}): Promise<boolean> {
  const deleted = await authDb
    .delete(schema.sharedSourceAccess)
    .where(
      and(
        eq(schema.sharedSourceAccess.recipientUserId, args.userId),
        eq(schema.sharedSourceAccess.sourceId, args.sourceId)
      )
    )
    .returning({ id: schema.sharedSourceAccess.id });

  return deleted.length > 0;
}

export async function getUserSource(
  userId: string,
  sourceId: string
): Promise<LoadedPrivateSource | null> {
  const source = await authDb.query.sources.findFirst({
    where: and(eq(schema.sources.id, sourceId), eq(schema.sources.userId, userId))
  });

  if (!source) return null;

  const albums = await authDb.query.sourceAlbums.findMany({
    where: eq(schema.sourceAlbums.sourceId, sourceId),
    orderBy: [asc(schema.sourceAlbums.rowOrder)]
  });

  return mapLoadedSource(source, albums);
}

export async function createPrivateSource(args: {
  userId: string;
  name: string;
  albums: ParsedAlbumInput[];
  kind?: 'csv';
}): Promise<PrivateSourceSummary> {
  if (args.albums.length === 0) {
    throw new Error('No valid rows found. The CSV must include Artist and Title columns.');
  }

  const now = new Date();

  return authDb.transaction(async (tx) => {
    const [source] = await tx
      .insert(schema.sources)
      .values({
        userId: args.userId,
        kind: args.kind ?? 'csv',
        name: args.name,
        visibility: 'private',
        syncStatus: 'ready',
        albumCount: args.albums.length,
        lastSyncedAt: now,
        updatedAt: now
      })
      .returning();

    await tx.insert(schema.sourceAlbums).values(
      args.albums.map((album, index) => ({
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
        updatedAt: now
      }))
    );

    return mapSourceSummary(source);
  });
}

export async function replaceCsvSource(args: {
  userId: string;
  sourceId: string;
  name: string;
  albums: ParsedAlbumInput[];
}): Promise<LoadedPrivateSource | null> {
  if (args.albums.length === 0) {
    throw new Error('No valid rows found. The CSV must include Artist and Title columns.');
  }

  const now = new Date();

  return authDb.transaction(async (tx) => {
    const source = await tx.query.sources.findFirst({
      where: and(eq(schema.sources.id, args.sourceId), eq(schema.sources.userId, args.userId))
    });

    if (!source) return null;
    if (source.kind !== 'csv') {
      throw new Error('Only CSV stashes can be replaced from Source.');
    }

    const [updatedSource] = await tx
      .update(schema.sources)
      .set({
        name: args.name,
        albumCount: args.albums.length,
        syncStatus: 'ready',
        lastSyncedAt: now,
        updatedAt: now
      })
      .where(eq(schema.sources.id, args.sourceId))
      .returning();

    await tx.delete(schema.sourceAlbums).where(eq(schema.sourceAlbums.sourceId, args.sourceId));

    await tx.insert(schema.sourceAlbums).values(
      args.albums.map((album, index) => ({
        sourceId: args.sourceId,
        rowOrder: index,
        artist: album.artist,
        title: album.title,
        year: album.year,
        genre: album.genre,
        label: album.label,
        format: album.format,
        discogsId: album.discogsId,
        notes: album.notes,
        coverImageUrl: album.coverImageUrl ?? null,
        updatedAt: now
      }))
    );

    const albums = await tx.query.sourceAlbums.findMany({
      where: eq(schema.sourceAlbums.sourceId, args.sourceId),
      orderBy: [asc(schema.sourceAlbums.rowOrder)]
    });

    return mapLoadedSource(updatedSource, albums);
  });
}

export async function renameUserSource(args: {
  userId: string;
  sourceId: string;
  name: string;
}): Promise<PrivateSourceSummary | null> {
  const now = new Date();

  const [updated] = await authDb
    .update(schema.sources)
    .set({
      name: args.name,
      updatedAt: now
    })
    .where(and(eq(schema.sources.id, args.sourceId), eq(schema.sources.userId, args.userId)))
    .returning();

  return updated ? mapSourceSummary(updated) : null;
}

export async function updateUserSourceVisibility(args: {
  userId: string;
  sourceId: string;
  visibility: 'private' | 'shared';
}): Promise<PrivateSourceSummary | null> {
  const now = new Date();

  const [updated] = await authDb
    .update(schema.sources)
    .set({
      visibility: args.visibility,
      updatedAt: now
    })
    .where(and(eq(schema.sources.id, args.sourceId), eq(schema.sources.userId, args.userId)))
    .returning();

  return updated ? mapSourceSummary(updated) : null;
}

export async function deleteUserSource(args: {
  userId: string;
  sourceId: string;
}): Promise<boolean> {
  const deleted = await authDb
    .delete(schema.sources)
    .where(and(eq(schema.sources.id, args.sourceId), eq(schema.sources.userId, args.userId)))
    .returning({ id: schema.sources.id });

  return deleted.length > 0;
}

export async function getSharedSource(sourceId: string): Promise<LoadedSharedSource | null> {
  const source = await authDb.query.sources.findFirst({
    where: and(eq(schema.sources.id, sourceId), eq(schema.sources.visibility, 'shared')),
    with: {
      user: true
    }
  });

  if (!source?.user) return null;

  const albums = await authDb.query.sourceAlbums.findMany({
    where: eq(schema.sourceAlbums.sourceId, sourceId),
    orderBy: [asc(schema.sourceAlbums.rowOrder)]
  });

  return {
    ...mapLoadedSource(source, albums),
    owner: buildSharedOwnerProfile(source.user),
    visibility: 'shared'
  };
}

export async function getSharedOverlapCollection(args: {
  userId: string;
  mineSourceId: string;
  sharedSourceId: string;
}): Promise<SharedOverlapCollection | null> {
  const [mineSource, sharedSource] = await Promise.all([
    getUserSource(args.userId, args.mineSourceId),
    getSharedSource(args.sharedSourceId)
  ]);

  if (!mineSource || !sharedSource) return null;

  const mineByKey = new Map<string, Album>();
  for (const album of mineSource.albums) {
    mineByKey.set(overlapKey(album), album);
  }

  const overlapAlbums = sharedSource.albums
    .filter((album) => mineByKey.has(overlapKey(album)))
    .map((album) => {
      const mineAlbum = mineByKey.get(overlapKey(album));
      return {
        ...album,
        coverImageUrl: album.coverImageUrl ?? mineAlbum?.coverImageUrl,
        notes: album.notes ?? mineAlbum?.notes,
        label: album.label ?? mineAlbum?.label,
        format: album.format ?? mineAlbum?.format
      };
    });

  return {
    id: `${mineSource.id}:${sharedSource.id}`,
    name: `${mineSource.name} × ${sharedSource.name}`,
    albumCount: overlapAlbums.length,
    mineSourceId: mineSource.id,
    mineSourceName: mineSource.name,
    sharedSourceId: sharedSource.id,
    sharedSourceName: sharedSource.name,
    sharedOwner: sharedSource.owner,
    albums: overlapAlbums
  };
}

export async function getSharedOverlapCount(args: {
  userId: string;
  mineSourceId: string;
  sharedSourceId: string;
}): Promise<number | null> {
  const overlap = await getSharedOverlapCollection(args);
  return overlap ? overlap.albumCount : null;
}
