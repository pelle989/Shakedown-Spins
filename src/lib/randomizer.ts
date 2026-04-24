import type { Album } from '$lib/types';

export type RandomizerState = {
  remainingIds: string[];
  lastPickedId: string | null;
  recentHistory: Album[];
};

export function createRandomizerState(): RandomizerState {
  return {
    remainingIds: [],
    lastPickedId: null,
    recentHistory: []
  };
}

function randomIndex(max: number): number {
  return Math.floor(Math.random() * max);
}

export function nextPick(albums: Album[], state: RandomizerState): { pick: Album; state: RandomizerState } | null {
  if (albums.length === 0) return null;

  let remainingIds = state.remainingIds.filter((id) => albums.some((album) => album.id === id));
  if (remainingIds.length === 0) {
    remainingIds = albums.map((album) => album.id);
    if (state.lastPickedId && remainingIds.length > 1) {
      remainingIds = remainingIds.filter((id) => id !== state.lastPickedId);
    }
  }

  const id = remainingIds[randomIndex(remainingIds.length)];
  const pick = albums.find((album) => album.id === id);
  if (!pick) return null;

  const nextRemainingIds = remainingIds.filter((remainingId) => remainingId !== id);
  const recentHistory = [pick, ...state.recentHistory].slice(0, 6);

  return {
    pick,
    state: {
      remainingIds: nextRemainingIds,
      lastPickedId: pick.id,
      recentHistory
    }
  };
}
