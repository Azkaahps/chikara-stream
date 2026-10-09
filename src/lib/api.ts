// ============================================================
// AZKAHPS Play — API client
// Wraps https://api.azkahps.online/api/v1
// ============================================================
import type {
  ApiEnvelope,
  AnimeDetailRaw,
  AnimeListItemRaw,
  AnimeStreamData,
  GenreItem,
  MovieDetailRaw,
  MovieHomeData,
  MovieListItemRaw,
  ScheduleItemRaw,
  Title,
  MediaKind,
} from './types';

export const API_BASE = 'https://api.azkahps.online/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public endpoint?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const TIMEOUT_MS = 20_000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(init?.headers || {}) },
    });
    const json = (await res.json()) as ApiEnvelope<T>;
    if (!json.ok) {
      throw new ApiError(json.message || json.error || `API error`, res.status, path);
    }
    return json.data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new ApiError('Koneksi timeout — cek internet kamu', undefined, path);
    }
    throw new ApiError((err as Error).message || 'Network error', undefined, path);
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Normalizers ----------

export function animeToTitle(a: AnimeListItemRaw): Title {
  const score = a.episodeInfo && /^\d+(\.\d+)?$/.test(a.episodeInfo) ? Number(a.episodeInfo) : undefined;
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    poster: a.poster || '',
    kind: 'anime',
    rating: score,
    episodeInfo: a.currentEpisode ? `Ep ${a.currentEpisode}` : undefined,
    typeText: a.type || undefined,
  };
}

export function movieToTitle(m: MovieListItemRaw, kind: MediaKind = 'movie'): Title {
  return {
    id: m.slug,
    slug: m.slug,
    title: m.title,
    poster: m.poster || '',
    kind,
    rating: m.rating ?? undefined,
    year: m.year ?? undefined,
    quality: m.quality || undefined,
    genreText: m.genre || undefined,
    typeText: m.episode ? `S${m.episode}` : kind === 'movie' ? 'Film' : 'Series',
  };
}

// ---------- Anime ----------

export const animeApi = {
  home: () => request<AnimeListItemRaw[]>('/anime/home'),
  ongoing: () => request<AnimeListItemRaw[]>('/anime/ongoing'),
  movies: () => request<AnimeListItemRaw[]>('/anime/movies'),
  schedule: () => request<ScheduleItemRaw[]>('/anime/schedule'),
  genres: () => request<GenreItem[]>('/anime/genres'),
  browse: (opts: { genre?: string; page?: number; orderBy?: string } = {}) => {
    const p = new URLSearchParams();
    if (opts.genre) p.set('genre', opts.genre);
    if (opts.page) p.set('page', String(opts.page));
    if (opts.orderBy) p.set('orderBy', opts.orderBy);
    const qs = p.toString();
    return request<AnimeListItemRaw[]>(`/anime/browse${qs ? `?${qs}` : ''}`);
  },
  search: (q: string, page = 1) =>
    request<AnimeListItemRaw[]>(`/anime/search?q=${encodeURIComponent(q)}&page=${page}`),
  detail: (id: string, slug: string) => request<AnimeDetailRaw>(`/anime/detail/${id}/${slug}`),
  stream: (id: string, slug: string, ep: number | string) =>
    request<AnimeStreamData>(`/anime/stream/${id}/${slug}/${ep}`),
};

// ---------- Movie (LK21) ----------

export const movieApi = {
  home: () => request<MovieHomeData>('/movie/home'),
  movies: (page = 1) => request<{ items: MovieListItemRaw[] }>(`/movie/movies?page=${page}`),
  series: (page = 1) => request<{ items: MovieListItemRaw[] }>(`/movie/series?page=${page}`),
  byGenre: (genre: string, page = 1) =>
    request<{ items: MovieListItemRaw[] }>(`/movie/genre/${encodeURIComponent(genre)}?page=${page}`),
  search: (q: string, page = 1) =>
    request<{ items: MovieListItemRaw[] }>(`/movie/search?q=${encodeURIComponent(q)}&page=${page}`),
  detail: (slug: string) => request<MovieDetailRaw>(`/movie/detail/${slug}`),
  stream: (server: string, playerId: string) =>
    request<MovieStreamData>(`/movie/stream/${encodeURIComponent(server)}/${encodeURIComponent(playerId)}`),
};

export interface MovieStreamData {
  server: string;
  id: string;
  provider: string;
  streamType: 'hls' | 'mp4' | 'embed';
  title?: string;
  poster?: string;
  fileUrl?: string;
  streamProxy?: string;
  embedUrl?: string;
  note?: string;
  sources?: {
    label?: string | null;
    quality?: string | null;
    height?: number | null;
    size?: number | null;
    resId?: number | null;
    url?: string;
  }[];
}

// ---------- Proxy helpers ----------

export const proxy = {
  stream: (url: string) => `${API_BASE}/proxy/stream?url=${encodeURIComponent(url)}`,
  image: (url: string) => `${API_BASE}/proxy/image?url=${encodeURIComponent(url)}`,
  hls: (url: string) => `${API_BASE}/proxy/hls?url=${encodeURIComponent(url)}`,
  embed: (server: string, id: string) => `${API_BASE}/api/embed/${server}/${id}`,
};

export function resolvePoster(url?: string | null): string {
  if (!url) return '';
  // posters.assetsy.de allows hotlinking; keep direct URL (faster, cacheable).
  return url;
}
