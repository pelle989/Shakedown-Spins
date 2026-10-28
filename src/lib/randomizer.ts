import type { Album } from '$lib/types';
import { albumKey } from './listening-state';

export type RandomizerState = {
  remainingIds: string[];
  lastPickedId: string | null;
  recentHistory: Album[];
  pickedKeys: string[];
};

export function createRandomizerState(): RandomizerState {
  return { remainingIds: [], lastPickedId: null, recentHistory: [], pickedKeys: [] };
}

export function nextPick(albums: Album[], state: RandomizerState): { pick: Album; state: RandomizerState } | null {
  if (!albums.length) return null;
  const picked = new Set(state.pickedKeys);
  let candidates = albums.filter((album) => !picked.has(albumKey(album)));
  if (!candidates.length) {
    // Exhaustion only resets the eligible albums, preserving picks outside the filters.
    for (const album of albums) picked.delete(albumKey(album));
    candidates = albums;
  }
  if (candidates.length > 1) {
    const last = state.recentHistory[0];
    const alternatives = candidates.filter((album) => last ? albumKey(album) !== albumKey(last) : album.id !== state.lastPickedId);
    if (alternatives.length) candidates = alternatives;
  }
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  picked.add(albumKey(pick));
  return { pick, state: {
    remainingIds: albums.filter((album) => !picked.has(albumKey(album))).map((album) => album.id),
    lastPickedId: pick.id,
    recentHistory: [pick, ...state.recentHistory].slice(0, 6),
    pickedKeys: [...picked]
  } };
}
