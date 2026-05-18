import type { AlbumContext, ContextBlurb } from '$lib/types';

const WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/w/api.php';
const THEAUDIODB_API_BASE = 'https://www.theaudiodb.com/api/v1/json';
const THEAUDIODB_API_KEY = '123';
const USER_AGENT = 'ShakedownSpins/1.0 +https://joekirchner.com';

function trimSummary(value?: string | null) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  const truncated = normalized.length > 320;
  return {
    text: truncated ? `${normalized.slice(0, 317).trimEnd()}...` : normalized,
    truncated
  };
}

async function wikipediaSearch(query: string) {
  const url = new URL(WIKIPEDIA_API_BASE);
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'search');
  url.searchParams.set('srsearch', query);
  url.searchParams.set('srlimit', '1');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    query?: { search?: Array<{ title?: string }> };
  };

  return payload.query?.search?.[0]?.title ?? null;
}

async function wikipediaSummary(query: string): Promise<ContextBlurb | null> {
  const title = await wikipediaSearch(query);
  if (!title) return null;

  const url = new URL(WIKIPEDIA_API_BASE);
  url.searchParams.set('action', 'query');
  url.searchParams.set('prop', 'extracts');
  url.searchParams.set('exintro', '1');
  url.searchParams.set('explaintext', '1');
  url.searchParams.set('redirects', '1');
  url.searchParams.set('titles', title);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    query?: {
      pages?: Record<string, { extract?: string }>;
    };
  };

  const extract = Object.values(payload.query?.pages ?? {})[0]?.extract;
  const summary = trimSummary(extract);
  return summary
    ? {
        text: summary.text,
        source: 'Wikipedia',
        sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`,
        truncated: summary.truncated
      }
    : null;
}

async function theAudioDbAlbumSummary(args: {
  artist: string;
  album: string;
}): Promise<ContextBlurb | null> {
  const url = new URL(`${THEAUDIODB_API_BASE}/${THEAUDIODB_API_KEY}/searchalbum.php`);
  url.searchParams.set('s', args.artist);
  url.searchParams.set('a', args.album);

  const response = await fetch(url);
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    album?: Array<{ idAlbum?: string; strDescriptionEN?: string }>;
  };

  const entry = payload.album?.[0];
  const summary = trimSummary(entry?.strDescriptionEN);
  return summary && entry?.idAlbum
    ? {
        text: summary.text,
        source: 'TheAudioDB',
        sourceUrl: `https://www.theaudiodb.com/album/${encodeURIComponent(entry.idAlbum)}`,
        truncated: summary.truncated
      }
    : summary
      ? {
          text: summary.text,
          source: 'TheAudioDB',
          sourceUrl: 'https://www.theaudiodb.com/',
          truncated: summary.truncated
        }
      : null;
}

async function theAudioDbArtistSummary(artist: string): Promise<ContextBlurb | null> {
  const url = new URL(`${THEAUDIODB_API_BASE}/${THEAUDIODB_API_KEY}/search.php`);
  url.searchParams.set('s', artist);

  const response = await fetch(url);
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    artists?: Array<{ idArtist?: string; strBiographyEN?: string }>;
  };

  const entry = payload.artists?.[0];
  const summary = trimSummary(entry?.strBiographyEN);
  return summary && entry?.idArtist
    ? {
        text: summary.text,
        source: 'TheAudioDB',
        sourceUrl: `https://www.theaudiodb.com/artist/${encodeURIComponent(entry.idArtist)}`,
        truncated: summary.truncated
      }
    : summary
      ? {
          text: summary.text,
          source: 'TheAudioDB',
          sourceUrl: 'https://www.theaudiodb.com/',
          truncated: summary.truncated
        }
      : null;
}

export async function getAlbumContext(args: {
  artist: string;
  album: string;
}): Promise<AlbumContext | null> {
  if (!args.artist.trim() || !args.album.trim()) return null;

  const [wikipediaAlbumSummary, wikipediaArtistSummary] = await Promise.all([
    (async () => {
      return (
        (await wikipediaSummary(`"${args.album}" "${args.artist}" album`)) ??
        (await wikipediaSummary(`"${args.album}" "${args.artist}"`))
      );
    })(),
    (async () => {
      return (
        (await wikipediaSummary(`"${args.artist}" musician`)) ??
        (await wikipediaSummary(`"${args.artist}" band`)) ??
        (await wikipediaSummary(args.artist))
      );
    })()
  ]);

  if (wikipediaAlbumSummary || wikipediaArtistSummary) {
    return {
      albumSummary: wikipediaAlbumSummary,
      artistSummary: wikipediaArtistSummary
    };
  }

  const [audioDbAlbumSummary, audioDbArtistSummary] = await Promise.all([
    theAudioDbAlbumSummary(args),
    theAudioDbArtistSummary(args.artist)
  ]);

  if (!audioDbAlbumSummary && !audioDbArtistSummary) {
    return null;
  }

  return {
    albumSummary: audioDbAlbumSummary,
    artistSummary: audioDbArtistSummary
  };
}
