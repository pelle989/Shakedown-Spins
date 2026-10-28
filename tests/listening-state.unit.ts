import { test, expect } from '@playwright/test';
import { albumKey, sourceKey, emptyListeningState, mergeListeningState, pickedKeys, parseListeningState } from '../src/lib/listening-state';
import { createRandomizerState, nextPick } from '../src/lib/randomizer';
import { ListeningSession } from '../src/lib/listening-session';
import type { Album } from '../src/lib/types';

const albums: Album[] = [
  { id: 'a', artist: 'Artist', title: 'A', year: 1970 },
  { id: 'b', artist: 'Artist', title: 'B', year: 1980 },
  { id: 'c', artist: 'Other', title: 'C', discogsId: '123' }
];
const source = { kind: 'private' as const, id: 'source-a', label: 'My records' };
const stash = sourceKey(source);
const snapshot = { source, currentKey: null, recentKeys: [], filters: { genre: [], decade: [], label: [], format: [] } };

test('stable identities survive reimports and preserve distinct releases', () => {
  expect(albumKey({ ...albums[0], id: 'replacement', artist: ' Artist  ' })).toBe(albumKey(albums[0]));
  expect(albumKey({ ...albums[2], title: 'Corrected title', id: 'replacement' })).toBe(albumKey(albums[2]));
  expect(albumKey({ ...albums[2], discogsId: '456' })).not.toBe(albumKey(albums[2]));
});

test('merge keeps picks from both devices and the latest active state and preference', () => {
  const a = { ...emptyListeningState(), active: snapshot, activeAt: 20,
    histories: { [stash]: { resetAt: 0, entries: { a: { at: 10, picked: true } } } } };
  const b = { ...emptyListeningState(), activeAt: 30, remember: false, preferenceAt: 25,
    histories: { [stash]: { resetAt: 0, entries: { b: { at: 11, picked: true } } } } };
  const merged = mergeListeningState(a, b);
  expect(pickedKeys(merged.histories[stash])).toEqual(['a', 'b']);
  expect(merged.active).toBeNull();
  expect(merged.remember).toBe(false);
  expect(mergeListeningState(b, a)).toEqual(merged);
});

test('reset tombstone prevents an offline device from resurrecting old history', () => {
  const old = { ...emptyListeningState(), histories: { [stash]: { resetAt: 0, entries: { a: { at: 10, picked: true } } } } };
  const reset = { ...emptyListeningState(), histories: { [stash]: { resetAt: 20, entries: { b: { at: 21, picked: true } } } } };
  expect(pickedKeys(mergeListeningState(old, reset).histories[stash])).toEqual(['b']);
});

test('shuffle avoids repeats, survives reconstruction, and resets only exhausted filter matches', () => {
  let state = createRandomizerState();
  const selected = new Set<string>();
  for (let i = 0; i < albums.length; i++) {
    const result = nextPick(albums, state)!;
    expect(selected.has(result.pick.id)).toBe(false);
    selected.add(result.pick.id);
    state = result.state;
  }
  const last = state.lastPickedId;
  const next = nextPick(albums, state)!;
  expect(next.pick.id).not.toBe(last);
  const filtered = nextPick([albums[0]], { ...state, pickedKeys: albums.map(albumKey) })!;
  expect(filtered.pick.id).toBe('a');
  expect(filtered.state.pickedKeys).toEqual(expect.arrayContaining(albums.map(albumKey)));
  const rebuilt = { ...createRandomizerState(), pickedKeys: [albumKey(albums[0]), albumKey(albums[1])] };
  expect(nextPick(albums.map((a) => ({ ...a, id: `new-${a.id}` })), rebuilt)!.pick.discogsId).toBe('123');
});

test('empty, single-album and duplicate-key pools remain usable', () => {
  expect(nextPick([], createRandomizerState())).toBeNull();
  let state = nextPick([albums[0]], createRandomizerState())!.state;
  expect(nextPick([albums[0]], state)!.pick.id).toBe('a');
  expect(nextPick([albums[0], { ...albums[0], id: 'copy' }], state)!.pick).toBeDefined();
});

test('malformed and excessive future-dated state is rejected', () => {
  expect(() => parseListeningState({ ...emptyListeningState(), activeAt: Date.now() + 900000 })).toThrow();
  expect(() => parseListeningState({ ...emptyListeningState(), active: { source } })).toThrow();
  expect(parseListeningState(emptyListeningState()).remember).toBe(true);
});

let savedFetch: typeof fetch;
let storage: Map<string, string>;
test.beforeEach(() => {
  savedFetch = globalThis.fetch;
  storage = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); }
  } });
});
test.afterEach(() => { globalThis.fetch = savedFetch; });

test('guest selection, preference and shuffle history survive a new session; clear preserves history', () => {
  const first = new ListeningSession(null, () => {}, () => {});
  first.setActive(snapshot);
  first.recordPick(stash, albums, albums, albums[0]);
  first.setRemember(false);
  first.setActive(null);
  first.dispose();
  const restored = new ListeningSession(null, () => {}, () => {});
  expect(restored.state.active).toBeNull();
  expect(restored.state.remember).toBe(false);
  expect(pickedKeys(restored.state.histories[stash])).toEqual([albumKey(albums[0])]);
  restored.recordPick(stash, albums, albums, albums[1]);
  expect(pickedKeys(restored.state.histories[stash])).not.toContain(albumKey(albums[1]));
  const other = new ListeningSession('another-account', () => {}, () => {});
  expect(other.state).toEqual(emptyListeningState());
  restored.dispose(); other.dispose();
});

test('collection changes keep valid picks, remove old picks and admit new albums', () => {
  const session = new ListeningSession(null, () => {}, () => {});
  session.recordPick(stash, albums, albums, albums[0]);
  session.recordPick(stash, albums, albums, albums[1]);
  session.recordPick(stash, [albums[1], albums[2]], [albums[1], albums[2]], albums[2]);
  expect(pickedKeys(session.state.histories[stash])).toEqual([albumKey(albums[1]), albumKey(albums[2])]);
  session.resetHistory(stash);
  expect(pickedKeys(session.state.histories[stash])).toEqual([]);
  session.dispose();
});

test('failed account saves keep local progress and succeed on retry', async () => {
  const errors: Array<string | null> = [];
  const session = new ListeningSession('listener', () => {}, (error) => errors.push(error));
  globalThis.fetch = async () => { throw new Error('offline'); };
  session.setActive(snapshot);
  session.recordPick(stash, albums, albums, albums[0]);
  await session.sync();
  expect(errors.at(-1)).toContain('Could not save');
  expect(JSON.parse(storage.get(session.storageKey)!).active.source.id).toBe(source.id);
  globalThis.fetch = async (_url, init) => new Response(JSON.stringify({ state: JSON.parse(init!.body as string) }));
  await session.sync(true);
  expect(errors.at(-1)).toBeNull();
  expect(pickedKeys(session.state.histories[stash])).toContain(albumKey(albums[0]));
  session.dispose();
});

test('edits during an in-flight save are retained and sent in a subsequent save', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const sent: string[] = [];
  globalThis.fetch = async (_url, init) => {
    sent.push(init!.body as string);
    if (sent.length === 1) await gate;
    return new Response(JSON.stringify({ state: JSON.parse(init!.body as string) }));
  };
  const session = new ListeningSession('listener', () => {}, () => {});
  session.recordPick(stash, albums, albums, albums[0]);
  const saving = session.sync();
  session.recordPick(stash, albums, albums, albums[1]);
  release(); await saving;
  expect(sent).toHaveLength(2);
  expect(pickedKeys(JSON.parse(sent[1]).histories[stash])).toHaveLength(2);
  session.dispose();
});


test('equal-time conflicts resolve consistently in both merge directions', () => {
  const a = { ...emptyListeningState(), activeAt: 100, active: snapshot, preferenceAt: 100 };
  const b = { ...emptyListeningState(), activeAt: 100, active: null, preferenceAt: 100, remember: false };
  expect(mergeListeningState(a, b)).toEqual(mergeListeningState(b, a));
});

test('identical storage updates do not write back and cause cross-tab feedback', () => {
  const session = new ListeningSession(null, () => {}, () => {});
  session.setActive(snapshot);
  const serialized = storage.get(session.storageKey)!;
  let writes = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: () => { writes++; }
  } });
  session.receiveStorage(serialized);
  expect(writes).toBe(0);
  session.dispose();
});
