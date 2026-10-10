// Local storage: watchlist + watch progress (localStorage, no account needed)

import type { WatchlistEntry, WatchProgress } from './types';

const WATCHLIST_KEY = 'chikara:watchlist:v1';
const PROGRESS_KEY = 'chikara:progress:v1';
const MAX_PROGRESS = 60;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable */
  }
}

// ---------- Watchlist ----------

export function getWatchlist(): WatchlistEntry[] {
  return read<WatchlistEntry[]>(WATCHLIST_KEY, []);
}

export function isInWatchlist(key: string): boolean {
  return getWatchlist().some((e) => e.key === key);
}

export function toggleWatchlist(entry: Omit<WatchlistEntry, 'addedAt'>): boolean {
  const list = getWatchlist();
  const idx = list.findIndex((e) => e.key === entry.key);
  if (idx >= 0) {
    list.splice(idx, 1);
    write(WATCHLIST_KEY, list);
    return false;
  }
  list.unshift({ ...entry, addedAt: Date.now() });
  write(WATCHLIST_KEY, list);
  return true;
}

// ---------- Watch progress ----------

export function getProgress(key: string): WatchProgress | undefined {
  return read<WatchProgress[]>(PROGRESS_KEY, []).find((p) => p.key === key);
}

export function getAllProgress(): WatchProgress[] {
  return read<WatchProgress[]>(PROGRESS_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveProgress(p: Omit<WatchProgress, 'updatedAt'>) {
  if (p.duration < 30) return; // ignore trivial clips
  const list = read<WatchProgress[]>(PROGRESS_KEY, []).filter((x) => x.key !== p.key);
  list.unshift({ ...p, updatedAt: Date.now() });
  write(PROGRESS_KEY, list.slice(0, MAX_PROGRESS));
}

export function removeProgress(key: string) {
  const list = read<WatchProgress[]>(PROGRESS_KEY, []).filter((x) => x.key !== key);
  write(PROGRESS_KEY, list);
}
