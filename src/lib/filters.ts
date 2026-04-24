import type { Album, FilterState } from '$lib/types';

export type FilterOptions = {
  genre: string[];
  decade: string[];
  label: string[];
  format: string[];
};

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function decadeLabel(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}

export function buildFilterOptions(albums: Album[]): FilterOptions {
  const genres: string[] = [];
  const decades: string[] = [];
  const labels: string[] = [];
  const formats: string[] = [];

  for (const album of albums) {
    genres.push(...(album.genre ?? []));
    if (album.year) decades.push(decadeLabel(album.year));
    if (album.label) labels.push(album.label);
    if (album.format) formats.push(album.format);
  }

  const options = {
    genre: uniqueSorted(genres),
    decade: uniqueSorted(decades),
    label: uniqueSorted(labels),
    format: uniqueSorted(formats)
  };

  return {
    genre: options.genre.length >= 2 ? options.genre : [],
    decade: options.decade.length >= 2 ? options.decade : [],
    label: options.label.length >= 2 ? options.label : [],
    format: options.format.length >= 2 ? options.format : []
  };
}

export function filterAlbums(albums: Album[], filters: FilterState): Album[] {
  return albums.filter((album) => {
    if (filters.genre.length > 0) {
      const genres = album.genre ?? [];
      if (!filters.genre.some((value) => genres.includes(value))) return false;
    }

    if (filters.decade.length > 0) {
      if (!album.year) return false;
      if (!filters.decade.includes(decadeLabel(album.year))) return false;
    }

    if (filters.label.length > 0 && (!album.label || !filters.label.includes(album.label))) {
      return false;
    }

    if (filters.format.length > 0 && (!album.format || !filters.format.includes(album.format))) {
      return false;
    }

    return true;
  });
}

export function emptyFilters(): FilterState {
  return {
    genre: [],
    decade: [],
    label: [],
    format: []
  };
}
