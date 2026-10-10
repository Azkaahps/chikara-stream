// Search - pencarian gabungan anime + film, dengan riwayat pencarian lokal.

import { useMemo, useState } from 'react';
import { AlertTriangle, History, RotateCcw, Search as SearchIcon, SearchX, X } from 'lucide-react';
import { animeApi, animeToTitle, movieApi, movieToTitle } from '../lib/api';
import type { Title } from '../lib/types';
import { useAsync, useDebounced } from '../lib/hooks';
import TopBar from '../components/TopBar';
import TitleCard from '../components/TitleCard';
import { SkeletonGrid } from '../components/Skeleton';

type Filter = 'all' | 'anime' | 'movie';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'anime', label: 'Anime' },
  { key: 'movie', label: 'Film' },
];

const RECENT_KEY = 'chikara:searches:v1';
const MAX_RECENT = 8;
const MIN_QUERY = 2;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export default function Search() {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 400);
  const [filter, setFilter] = useState<Filter>('all');
  const [recent, setRecent] = useState<string[]>(() => readRecent());

  const q = debounced.trim();
  const rawQ = query.trim();
  /** true saat debounce belum selesai - tahan tampilan hasil lama */
  const pending = rawQ !== q;

  const res = useAsync(async () => {
    if (q.length < MIN_QUERY) return { anime: [] as Title[], movies: [] as Title[] };
    const [animeRes, movieRes] = await Promise.allSettled([
      animeApi.search(q, 1),
      movieApi.search(q, 1),
    ]);
    if (animeRes.status === 'rejected' && movieRes.status === 'rejected') {
      throw animeRes.reason;
    }
    return {
      anime: animeRes.status === 'fulfilled' ? animeRes.value.map((a) => animeToTitle(a)) : [],
      movies: movieRes.status === 'fulfilled' ? movieRes.value.items.map((m) => movieToTitle(m)) : [],
    };
  }, [q]);

  const filtered = useMemo(() => {
    const all = [...(res.data?.anime || []), ...(res.data?.movies || [])];
    if (filter === 'anime') return all.filter((t) => t.kind === 'anime');
    if (filter === 'movie') return all.filter((t) => t.kind !== 'anime');
    return all;
  }, [res.data, filter]);

  const saveSearch = (term: string) => {
    const t = term.trim();
    if (t.length < MIN_QUERY) return;
    const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(
      0,
      MAX_RECENT,
    );
    setRecent(next);
    writeRecent(next);
  };

  const removeRecent = (term: string) => {
    const next = recent.filter((r) => r !== term);
    setRecent(next);
    writeRecent(next);
  };

  const clearRecent = () => {
    setRecent([]);
    writeRecent([]);
  };

  return (
    <div className="pt-[max(env(safe-area-inset-top),12px)]">
      <TopBar eyebrow="Cari tontonan" title="Pencarian" />

      {/* Input */}
      <form
        className="mt-3 px-4"
        onSubmit={(e) => {
          e.preventDefault();
          saveSearch(query);
        }}
      >
        <div className="flex items-center gap-2 rounded-2xl bg-card px-3.5 py-2.5 ring-1 ring-line">
          <SearchIcon size={17} className="shrink-0 text-fg-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari anime atau film..."
            type="search"
            enterKeyHint="search"
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-3"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Hapus pencarian"
              className="pressable grid h-6 w-6 shrink-0 place-items-center rounded-full bg-card-2 text-fg-3"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </form>

      {rawQ.length === 0 ? (
        /* Riwayat pencarian */
        <section className="mt-5 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={14} className="text-accent" />
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-fg-2">
                Terakhir dicari
              </h2>
            </div>
            {recent.length > 0 && (
              <button
                onClick={clearRecent}
                className="pressable text-[12px] font-semibold text-fg-3"
              >
                Hapus semua
              </button>
            )}
          </div>

          {recent.length === 0 ? (
            <p className="mt-4 rounded-[20px] bg-card px-4 py-8 text-center text-[12.5px] leading-relaxed text-fg-3 ring-1 ring-line">
              Cari judul anime atau film - hasil muncul otomatis saat kamu mengetik.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {recent.map((term) => (
                <div
                  key={term}
                  className="flex items-center gap-2 rounded-2xl bg-card ring-1 ring-line"
                >
                  <button
                    onClick={() => {
                      setQuery(term);
                      saveSearch(term);
                    }}
                    className="pressable flex min-w-0 flex-1 items-center gap-2.5 px-3.5 py-3 text-left"
                  >
                    <History size={15} className="shrink-0 text-fg-3" />
                    <span className="truncate text-[13px] font-medium text-fg">{term}</span>
                  </button>
                  <button
                    onClick={() => removeRecent(term)}
                    aria-label={`Hapus ${term}`}
                    className="pressable mr-2 grid h-7 w-7 shrink-0 place-items-center rounded-full text-fg-3"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : rawQ.length < MIN_QUERY ? (
        <p className="px-4 py-10 text-center text-[13px] text-fg-3">
          Ketik minimal {MIN_QUERY} huruf untuk mulai mencari.
        </p>
      ) : (
        <>
          {/* Filter + jumlah hasil */}
          <div className="mt-4 flex items-center justify-between gap-3 px-4">
            <div className="flex gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`pressable rounded-full px-3.5 py-1.5 text-[12px] font-bold ring-1 ${
                    filter === f.key
                      ? 'bg-accent text-black ring-accent'
                      : 'bg-card text-fg-2 ring-line'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {!res.loading && !pending && filtered.length > 0 && (
              <span className="shrink-0 text-[11.5px] text-fg-3">{filtered.length} hasil</span>
            )}
          </div>

          {/* Hasil */}
          <div className="mt-4">
            {res.loading || pending ? (
              <SkeletonGrid count={6} />
            ) : res.error ? (
              <ErrorState message={res.error} onRetry={res.reload} />
            ) : filtered.length === 0 ? (
              <div className="mx-4 flex flex-col items-center gap-2.5 rounded-[20px] bg-card p-8 text-center ring-1 ring-line">
                <SearchX size={26} className="text-accent" />
                <p className="text-[14px] font-semibold text-fg">Tidak ditemukan</p>
                <p className="text-[12.5px] leading-relaxed text-fg-3">
                  Tidak ada hasil untuk "{q}". Coba kata kunci lain.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 px-4">
                {filtered.map((t) => (
                  <div key={`${t.kind}-${t.id}`} onClick={() => saveSearch(q)}>
                    <TitleCard item={t} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-4 flex flex-col items-center gap-3 rounded-[20px] bg-card p-6 text-center ring-1 ring-line">
      <AlertTriangle size={26} className="text-accent" />
      <p className="text-[13px] font-medium leading-relaxed text-fg-2">{message}</p>
      <button
        onClick={onRetry}
        className="pressable flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-[13px] font-bold text-black"
      >
        <RotateCcw size={15} /> Coba lagi
      </button>
    </div>
  );
}
