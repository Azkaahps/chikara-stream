// Movies - tab Film: katalog film & series (LK21) + shortcut genre + pagination.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Film, Loader2, RotateCcw, Tv } from 'lucide-react';
import { movieApi, movieToTitle } from '../lib/api';
import type { MovieListItemRaw } from '../lib/types';
import { useAsync } from '../lib/hooks';
import TopBar from '../components/TopBar';
import TitleCard from '../components/TitleCard';
import { SkeletonGrid } from '../components/Skeleton';

type Tab = 'movie' | 'series';

const TABS: { key: Tab; label: string }[] = [
  { key: 'movie', label: 'Film' },
  { key: 'series', label: 'Series' },
];

/** Genre populer - slug mengikuti pola URL /genre/{slug} di API movie. */
const MOVIE_GENRES: { slug: string; label: string }[] = [
  { slug: 'action', label: 'Action' },
  { slug: 'adventure', label: 'Adventure' },
  { slug: 'animation', label: 'Animasi' },
  { slug: 'comedy', label: 'Komedi' },
  { slug: 'crime', label: 'Crime' },
  { slug: 'documentary', label: 'Dokumenter' },
  { slug: 'drama', label: 'Drama' },
  { slug: 'family', label: 'Family' },
  { slug: 'fantasy', label: 'Fantasi' },
  { slug: 'history', label: 'History' },
  { slug: 'horror', label: 'Horor' },
  { slug: 'music', label: 'Musik' },
  { slug: 'mystery', label: 'Mystery' },
  { slug: 'romance', label: 'Romantis' },
  { slug: 'sci-fi', label: 'Sci-Fi' },
  { slug: 'thriller', label: 'Thriller' },
  { slug: 'war', label: 'War' },
];

/** Anggap masih ada halaman berikutnya selama halaman terakhir mengembalikan minimal N item. */
const PAGE_MIN = 10;

export default function Movies() {
  const [tab, setTab] = useState<Tab>('movie');
  const [cursor, setCursor] = useState<{ tab: Tab; page: number }>({ tab: 'movie', page: 1 });
  const [items, setItems] = useState<MovieListItemRaw[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const res = useAsync(async () => {
    const data =
      cursor.tab === 'movie' ? await movieApi.movies(cursor.page) : await movieApi.series(cursor.page);
    return {
      tab: cursor.tab,
      page: cursor.page,
      items: data.items,
      hasMore: data.items.length >= PAGE_MIN,
    };
  }, [cursor.tab, cursor.page]);

  useEffect(() => {
    const d = res.data;
    if (!d || d.tab !== cursor.tab || d.page !== cursor.page) return;
    setItems((prev) => (d.page === 1 ? d.items : [...prev, ...d.items]));
    setHasMore(d.hasMore);
  }, [res.data, cursor.tab, cursor.page]);

  const switchTab = (next: Tab) => {
    if (next === tab) return;
    setTab(next);
    setCursor({ tab: next, page: 1 });
    setItems([]);
    setHasMore(false);
  };

  const isSeries = tab === 'series';
  const initialLoading = res.loading && items.length === 0;
  const loadingMore = res.loading && items.length > 0;

  return (
    <div className="pt-[max(env(safe-area-inset-top),12px)]">
      <TopBar eyebrow="Katalog LK21" title="Film & Series" />

      {/* Film / Series switch */}
      <div className="mt-3 px-4">
        <div className="flex rounded-2xl bg-card p-1 ring-1 ring-line">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`pressable flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-bold ${
                tab === t.key ? 'bg-accent text-black' : 'text-fg-2'
              }`}
            >
              {t.key === 'movie' ? <Film size={15} /> : <Tv size={15} />}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Genre shortcuts */}
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {MOVIE_GENRES.map((g) => (
          <Link
            key={g.slug}
            to={`/genre/movie/${g.slug}`}
            className="pressable shrink-0 rounded-full bg-card px-3.5 py-1.5 text-[12px] font-semibold text-fg-2 ring-1 ring-line"
          >
            {g.label}
          </Link>
        ))}
      </div>

      {/* Catalog */}
      <div className="mt-4">
        {initialLoading ? (
          <SkeletonGrid count={9} />
        ) : res.error && items.length === 0 ? (
          <ErrorState message={res.error} onRetry={res.reload} />
        ) : items.length === 0 ? (
          <EmptyState isSeries={isSeries} />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 px-4">
              {items.map((m) => (
                <TitleCard key={m.slug} item={movieToTitle(m, isSeries ? 'series' : 'movie')} />
              ))}
            </div>

            <div className="mt-6 flex flex-col items-center gap-2 pb-4">
              {res.error ? (
                <>
                  <p className="text-[12px] text-danger">{res.error}</p>
                  <button onClick={res.reload} className="pressable text-[12.5px] font-bold text-accent">
                    Coba lagi
                  </button>
                </>
              ) : hasMore ? (
                <button
                  onClick={() => setCursor((c) => ({ ...c, page: c.page + 1 }))}
                  disabled={loadingMore}
                  className="pressable flex items-center gap-2 rounded-full bg-card px-6 py-2.5 text-[13px] font-bold text-accent ring-1 ring-line-2 disabled:opacity-60"
                >
                  {loadingMore && <Loader2 size={15} className="animate-spin" />}
                  {loadingMore ? 'Memuat...' : 'Muat lebih banyak'}
                </button>
              ) : (
                <p className="text-[12px] text-fg-3">Semua sudah dimuat</p>
              )}
            </div>
          </>
        )}
      </div>
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

function EmptyState({ isSeries }: { isSeries: boolean }) {
  return (
    <div className="mx-4 flex flex-col items-center gap-2.5 rounded-[20px] bg-card p-8 text-center ring-1 ring-line">
      {isSeries ? <Tv size={26} className="text-accent" /> : <Film size={26} className="text-accent" />}
      <p className="text-[14px] font-semibold text-fg">Belum ada {isSeries ? 'series' : 'film'}</p>
      <p className="text-[12.5px] leading-relaxed text-fg-3">
        Coba muat ulang atau pilih genre lain di atas.
      </p>
    </div>
  );
}
