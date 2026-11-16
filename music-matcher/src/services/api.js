import { FEATURE_DIMS } from '../utils/similarity.js';

export { FEATURE_DIMS };

const env = import.meta.env ?? {};

const API_BASE = (env.VITE_MUSICIWANT_API_BASE || 'https://musiciwant.com').replace(
  /\/+$/,
  '',
);

const API_KEY = env.VITE_MUSICIWANT_API_KEY?.trim() || '';

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Error thrown for non-2xx musiciwant responses and network/timeout failures.
 */
export class MusicApiError extends Error {
  constructor(message, { status = 0, code = 'MUSICIWANT_ERROR' } = {}) {
    super(message);
    this.name = 'MusicApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * @typedef {Record<string, number>} FeatureVector
 * Normalised 0–1 sensory fingerprint keyed by FEATURE_DIMS.
 */

/**
 * @typedef {Object} SongFeatures
 * @property {string} title
 * @property {string} artist
 * @property {string} slug
 * @property {number|null} tempo        Beats per minute.
 * @property {number|null} energy       0–1.
 * @property {number|null} valence      0–1, or null (not exposed by musiciwant).
 * @property {number|null} danceability 0–1, or null (not exposed by musiciwant).
 * @property {FeatureVector|null} vector 8-dim sensory fingerprint, or null.
 * @property {number[]|null} vectorArray The same values in FEATURE_DIMS order.
 * @property {string[]} dims            Dimension names matching vectorArray.
 */

function buildUrl(path, params) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function request(path, params = {}) {
  const url = buildUrl(path, params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
      },
      signal: controller.signal,
    });

    if (response.status === 404) return null;

    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.json();
        detail = body?.error || body?.message || '';
      } catch {
        // Non-JSON error body; fall back to the status text.
      }

      const code =
        response.status === 401 || response.status === 403
          ? 'INVALID_API_KEY'
          : response.status === 429
            ? 'RATE_LIMITED'
            : 'MUSICIWANT_ERROR';

      const friendly =
        code === 'INVALID_API_KEY'
          ? 'The musiciwant API key was rejected. Check VITE_MUSICIWANT_API_KEY in .env.'
          : code === 'RATE_LIMITED'
            ? 'musiciwant rate limit reached. Add a free API key or try again tomorrow.'
            : `musiciwant request failed (${response.status} ${response.statusText}).`;

      throw new MusicApiError(detail ? `${friendly} ${detail}` : friendly, {
        status: response.status,
        code,
      });
    }

    return await response.json();
  } catch (error) {
    if (error instanceof MusicApiError) throw error;
    if (error.name === 'AbortError') {
      throw new MusicApiError('musiciwant request timed out.', { code: 'TIMEOUT' });
    }
    throw new MusicApiError(
      'Could not reach musiciwant. Check your network connection.',
      { code: 'NETWORK_ERROR' },
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Splits "Title - Artist", "Title — Artist" or "Title by Artist". */
function splitQuery(query) {
  const match = query.match(/^(.+?)\s+(?:-|–|—|by)\s+(.+)$/i);
  return match ? { title: match[1].trim(), artist: match[2].trim() } : null;
}

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Resolves a free-text song name to a full musiciwant song record.
 * Exact lookups first, then a search whose best title match is used.
 */
async function findSong(songName) {
  const exact = splitQuery(songName);
  if (exact) {
    const direct = await request('/api/v1/song', exact);
    if (direct?.found && direct.song) return direct.song;
  }

  const byTitle = await request('/api/v1/song', { title: songName });
  if (byTitle?.found && byTitle.song) return byTitle.song;

  const search = await request('/api/v1/search', { q: songName });
  const matches = Array.isArray(search)
    ? search
    : Array.isArray(search?.results)
      ? search.results
      : [];

  const wanted = normalize(songName);
  const best =
    matches.find((item) => normalize(item?.title) === wanted) ??
    matches.find((item) => item?.slug);

  if (!best?.slug) return null;

  const full = await request('/api/v1/song', { slug: best.slug });
  return full?.found && full.song ? full.song : null;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

/**
 * Looks up a song's audio features and its 8-dimension sensory fingerprint.
 *
 * musiciwant does not publish Spotify-style valence or danceability, so those
 * two fields are returned as null instead of being guessed. `energy` is the
 * catalog's 0–100 sensory-intensity score normalised to 0–1, and `vector` is
 * the fingerprint used for similarity.
 *
 * @param {string} songName
 * @returns {Promise<SongFeatures>}
 * @throws {MusicApiError} on network errors, bad keys, rate limits, or timeouts.
 */
export async function getSongFeatures(songName) {
  const query = typeof songName === 'string' ? songName.trim() : '';
  if (!query) {
    throw new MusicApiError('A song name is required.', { code: 'INVALID_INPUT' });
  }

  const song = await findSong(query);
  if (!song) {
    throw new MusicApiError(`No musiciwant entry found for “${query}”.`, {
      status: 404,
      code: 'NOT_FOUND',
    });
  }

  const fingerprint = song.slug
    ? await request('/api/v1/fingerprint', { slug: song.slug })
    : null;

  const vector =
    fingerprint?.found && fingerprint.vector ? fingerprint.vector : null;
  const vectorArray =
    fingerprint?.found && Array.isArray(fingerprint.vector_array)
      ? fingerprint.vector_array
      : null;

  const energy = Number.isFinite(vector?.intensity)
    ? clamp01(vector.intensity)
    : Number.isFinite(song.intensity)
      ? clamp01(song.intensity / 100)
      : null;

  return {
    title: song.title ?? query,
    artist: song.artist ?? '',
    slug: song.slug ?? '',
    tempo: Number.isFinite(song.bpm) ? song.bpm : null,
    energy,
    valence: null,
    danceability: null,
    vector,
    vectorArray,
    dims: vector ? [...FEATURE_DIMS] : [],
  };
}
