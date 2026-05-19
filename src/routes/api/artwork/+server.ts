import { json, type RequestHandler } from '@sveltejs/kit';
import { fetchWithTimeout } from '$lib/server/http';

const MUSICBRAINZ_API_BASE = 'https://musicbrainz.org/ws/2';
const COVER_ART_ARCHIVE_BASE = 'https://coverartarchive.org';
const USER_AGENT = 'ShakedownSpins/1.0 +https://joekirchner.com';

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function normalizeArtistCredit(value: string) {
  return value.replace(/\s+\(\d+\)$/, '').trim().toLowerCase();
}

type MusicBrainzRelease = {
  id: string;
  title?: string;
  date?: string;
  'artist-credit'?: Array<{ name?: string }>;
};

function scoreRelease(release: MusicBrainzRelease, artist: string, title: string, year?: string | null) {
  let score = 0;

  if (normalize(release.title ?? '') === normalize(title)) score += 6;
  else if (normalize(release.title ?? '').includes(normalize(title))) score += 3;

  const artistMatch = (release['artist-credit'] ?? [])
    .map((entry) => normalizeArtistCredit(entry.name ?? ''))
    .some((value) => value === normalizeArtistCredit(artist) || value.includes(normalizeArtistCredit(artist)));

  if (artistMatch) score += 6;

  if (year && release.date?.startsWith(year)) score += 2;

  return score;
}

async function searchMusicBrainzRelease(args: { artist: string; title: string; year?: string | null }) {
  const url = new URL(`${MUSICBRAINZ_API_BASE}/release/`);
  const queryParts = [
    `release:"${args.title.replaceAll('"', '')}"`,
    `artist:"${args.artist.replaceAll('"', '')}"`
  ];
  if (args.year) {
    queryParts.push(`date:${args.year}`);
  }
  url.searchParams.set('query', queryParts.join(' AND '));
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('limit', '5');

  const response = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': USER_AGENT
    }
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { releases?: MusicBrainzRelease[] };
  const releases = payload.releases ?? [];
  if (releases.length === 0) return null;

  return releases
    .map((release) => ({
      release,
      score: scoreRelease(release, args.artist, args.title, args.year)
    }))
    .sort((a, b) => b.score - a.score)[0]?.release ?? null;
}

async function fetchCoverArtImages(releaseId: string) {
  const response = await fetchWithTimeout(
    `${COVER_ART_ARCHIVE_BASE}/release/${encodeURIComponent(releaseId)}`,
    {
      headers: {
        'User-Agent': USER_AGENT
      }
    }
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    images?: Array<{
      image?: string;
      front?: boolean;
      back?: boolean;
      types?: string[];
    }>;
  };

  return Array.from(
    new Set(
      (payload.images ?? [])
        .slice()
        .sort((a, b) => Number(Boolean(b.front)) - Number(Boolean(a.front)))
        .map((image) => image.image?.trim())
        .filter(Boolean) as string[]
    )
  );
}

export const GET: RequestHandler = async ({ url }) => {
  const artist = url.searchParams.get('artist')?.trim();
  const title = url.searchParams.get('title')?.trim();
  const year = url.searchParams.get('year')?.trim();

  if (!artist || !title) {
    return json({ message: 'Artist and title are required.' }, { status: 400 });
  }

  try {
    const release = await searchMusicBrainzRelease({ artist, title, year });
    if (!release) {
      return json({ imageUrls: [] });
    }

    const imageUrls = await fetchCoverArtImages(release.id);
    return json({ imageUrls });
  } catch {
    return json({ imageUrls: [] });
  }
};
