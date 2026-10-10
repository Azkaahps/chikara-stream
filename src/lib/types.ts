// ============================================================
// Chikara Stream — Unified types for anime + movie API
// API: https://api.azkahps.online/api/v1
// Envelope: { ok, category, provider, cached, timestamp, data }
// ============================================================

export type MediaKind = 'anime' | 'movie' | 'series';

/** Normalized title card used across all rails/grids. */
export interface Title {
  /** stable id: anime -> numeric id, movie -> slug */
  id: string;
  slug: string;
  title: string;
  poster: string;
  kind: MediaKind;
  rating?: number;
  year?: number;
  quality?: string;
  episodeInfo?: string; // e.g. "Ep 2 / 13"
  genreText?: string;   // e.g. "Action, Adventure"
  typeText?: string;    // e.g. "TV", "Movie", "Special"
}

// ---------- RAW API shapes (subset) ----------

export interface AnimeListItemRaw {
  id: string;
  slug: string;
  title: string;
  type?: string | null;
  currentEpisode?: string | null;
  episodeInfo?: string | null; // sometimes score
  poster?: string | null;
  href?: string;
  endpoint?: string;
}

export interface AnimeDetailRaw {
  id: string;
  slug: string;
  title: string;
  synonyms?: string;
  poster?: string;
  synopsis?: string;
  type?: string;
  episodesTotal?: string;
  status?: string;
  aired?: string;
  season?: string;
  duration?: string;
  quality?: string;
  genres?: string[];
  studio?: string;
  score?: string;
  rating?: string;
  episodes?: { episode: number; title?: string; href?: string; streamEndpoint?: string }[];
}

export interface AnimeStreamSource {
  quality: string;
  url: string;
  type: string; // video/mp4
}

export interface AnimeStreamData {
  status: string;
  animeId: string;
  slug: string;
  episode: number;
  server?: string;
  stream: { hasDirectStream: boolean; sources: AnimeStreamSource[] };
  downloads?: unknown;
}

export interface MovieListItemRaw {
  title: string;
  slug: string;
  rating?: number | null;
  year?: number | null;
  quality?: string | null;
  duration?: string | null;
  episode?: string | null;
  genre?: string | null;
  poster?: string | null;
  type?: string;
  url?: string;
}

export interface MoviePlayer {
  name: string;
  server: string; // p2p | cast | hydrax
  id: string;
  embedUrl?: string;
  recommended?: boolean;
}

export interface MovieDetailRaw {
  title: string;
  slug: string;
  type?: string;
  rating?: number | null;
  votes?: string;
  synopsis?: string;
  poster?: string;
  genres?: string[];
  countries?: string[];
  directors?: string[];
  cast?: string[];
  release?: string | null;
  duration?: string | null;
  quality?: string | null;
  year?: number | null;
  players?: MoviePlayer[];
  downloadUrl?: string;
}

export interface MovieHomeData {
  latestMovies: MovieListItemRaw[];
  featuredSeries: MovieListItemRaw[];
  seriesUpdates: MovieListItemRaw[];
  topOfMonth: MovieListItemRaw[];
  recommended: MovieListItemRaw[];
  drakor: MovieListItemRaw[];
  action: MovieListItemRaw[];
  horror: MovieListItemRaw[];
}

export interface GenreItem {
  slug: string;
  name: string;
}

export interface ScheduleItemRaw extends AnimeListItemRaw {
  day?: string;
  airtime?: string;
  nextEpisode?: number;
}

// ---------- API envelope ----------

export interface ApiEnvelope<T> {
  ok: boolean;
  category: string;
  provider: string;
  cached?: boolean;
  timestamp?: string;
  data: T;
  error?: string;
  message?: string;
}

// ---------- Local store ----------

export interface WatchProgress {
  /** key: `anime:{id}:{slug}` or `movie:{slug}` */
  key: string;
  titleId: string;
  slug: string;
  kind: MediaKind;
  title: string;
  poster: string;
  /** for anime */
  episode?: number;
  episodeLabel?: string;
  /** seconds */
  position: number;
  duration: number;
  updatedAt: number;
}

export interface WatchlistEntry {
  key: string;
  id: string;
  slug: string;
  kind: MediaKind;
  title: string;
  poster: string;
  rating?: number;
  year?: number;
  addedAt: number;
}
