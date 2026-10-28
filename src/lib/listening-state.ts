import type { Album, AlbumSource, FilterState } from './types';

export type PickEvent = { at: number; picked: boolean };
export type ShuffleHistory = { resetAt: number; entries: Record<string, PickEvent> };
export type ListeningSnapshot = {
  source: AlbumSource;
  currentKey: string | null;
  recentKeys: string[];
  filters: FilterState;
};
export type ListeningState = {
  version: 1;
  active: ListeningSnapshot | null;
  activeAt: number;
  remember: boolean;
  preferenceAt: number;
  histories: Record<string, ShuffleHistory>;
};

export function emptyListeningState(): ListeningState {
  return { version: 1, active: null, activeAt: 0, remember: true, preferenceAt: 0, histories: {} };
}

const normalize = (value: string) => value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');

// Import row UUIDs change on replacement. Release IDs and metadata survive those changes.
export function albumKey(album: Album): string {
  if (album.discogsId?.trim()) return `discogs:${album.discogsId.trim()}`;
  return `album:${JSON.stringify([normalize(album.artist), normalize(album.title), album.year ?? null,
    normalize(album.label ?? ''), normalize(album.format ?? '')])}`;
}

export function sourceKey(source: AlbumSource): string {
  return source.kind === 'shared-overlap'
    ? `shared-overlap:${source.sharedSourceId}:${source.mineSourceId}`
    : `${source.kind}:${source.id}`;
}

export function pickedKeys(history?: ShuffleHistory): string[] {
  return Object.entries(history?.entries ?? {})
    .filter(([, event]) => event.picked && event.at > (history?.resetAt ?? 0))
    .map(([key]) => key);
}

export function mergeListeningState(a: ListeningState, b: ListeningState): ListeningState {
  const histories: ListeningState['histories'] = {};
  for (const key of new Set([...Object.keys(a.histories), ...Object.keys(b.histories)])) {
    const left = a.histories[key];
    const right = b.histories[key];
    const resetAt = Math.max(left?.resetAt ?? 0, right?.resetAt ?? 0);
    const entries: ShuffleHistory['entries'] = {};
    for (const id of new Set([...Object.keys(left?.entries ?? {}), ...Object.keys(right?.entries ?? {})])) {
      const x = left?.entries[id];
      const y = right?.entries[id];
      const event = !x ? y : !y ? x : x.at > y.at ? x : y.at > x.at ? y : { at: x.at, picked: x.picked || y.picked };
      if (event && event.at > resetAt) entries[id] = event;
    }
    histories[key] = { resetAt, entries };
  }
  const active = b.activeAt > a.activeAt || (b.activeAt === a.activeAt && JSON.stringify(b.active) > JSON.stringify(a.active)) ? b : a;
  const preference = b.preferenceAt > a.preferenceAt || (b.preferenceAt === a.preferenceAt && !b.remember) ? b : a;
  return { version: 1, active: active.active, activeAt: active.activeAt,
    remember: preference.remember, preferenceAt: preference.preferenceAt, histories };
}

// All storage and network payloads pass through the same bounded validator.
export function parseListeningState(value: unknown): ListeningState {
  if (!value || typeof value !== 'object') throw new Error('Invalid listening state.');
  const v = value as ListeningState;
  const stamp = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= Date.now() + 300000;
  const str = (s: unknown): s is string => typeof s === 'string' && s.length > 0 && s.length <= 2048;
  if (v.version !== 1 || !stamp(v.activeAt) || !stamp(v.preferenceAt) || typeof v.remember !== 'boolean') throw new Error('Invalid listening state.');
  if (v.active !== null) {
    const s = v.active?.source;
    if (!s || !['top10', 'private', 'shared', 'shared-overlap'].includes(s.kind) || !str(s.id) || !str(s.label) ||
      (s.kind === 'shared-overlap' && (!str(s.sharedSourceId) || !str(s.mineSourceId))) ||
      (v.active.currentKey !== null && !str(v.active.currentKey)) ||
      !Array.isArray(v.active.recentKeys) || v.active.recentKeys.length > 6 || !v.active.recentKeys.every(str) ||
      !v.active.filters || !['genre', 'decade', 'label', 'format'].every((k) => {
        const list = v.active!.filters[k as keyof FilterState];
        return Array.isArray(list) && list.length <= 200 && list.every(str);
      })) throw new Error('Invalid listening snapshot.');
  }
  if (!v.histories || typeof v.histories !== 'object' || Array.isArray(v.histories) || Object.keys(v.histories).length > 500) throw new Error('Invalid shuffle histories.');
  let count = 0;
  for (const [key, h] of Object.entries(v.histories)) {
    if (!str(key) || !h || !stamp(h.resetAt) || !h.entries || typeof h.entries !== 'object' || Array.isArray(h.entries)) throw new Error('Invalid shuffle history.');
    for (const [id, event] of Object.entries(h.entries)) {
      if (++count > 100000 || !str(id) || !event || !stamp(event.at) || typeof event.picked !== 'boolean') throw new Error('Invalid pick event.');
    }
  }
  // Strip unknown properties and prototype-sensitive keys from persisted data.
  return JSON.parse(JSON.stringify({ version: 1, active: v.active, activeAt: v.activeAt,
    remember: v.remember, preferenceAt: v.preferenceAt, histories: v.histories }, (key, entry) =>
    ['__proto__', 'constructor', 'prototype'].includes(key) ? undefined : entry));
}
