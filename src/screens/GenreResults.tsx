// GenreResults - daftar judul per genre.
// Route: /genre/movie/:genre (kind="movie") - /genre/anime/:slug (kind="anime")

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Layers, Loader2, RotateCcw } from 'lucide-react';
import { animeApi, animeToTitle, movieApi, movieToTitle } from '../lib/api';
import type { Title } from '../lib/types';
import { useAsync } from '../lib/hooks';
import TopBar from '../components/TopBar';
import TitleCard from '../components/TitleCard';
import { SkeletonGrid } from '../components/Skeleton';

/** Anggap masih ada halaman berikutnya selama halaman terakhir mengembalikan minimal N item. */
const PAGE_MIN = 10;

/** slug -> nama tampilan; API tidak menyediakan nama genre untuk endpoint ini. */
function prettyGenre(slug: string): string {
  let s = slug;
  try {
    s = decodeURIComponent(slug);
  } catch {
    /* slug bukan URI-encoded */
  }
  const special: Record<string, string> = {
    'sci-fi': 'Sci-Fi',
    'slice-of-life': 'Slice of Life',
    'sci-fi-fantasy': 'Sci-Fi Fantasy',
  };
  if (special[s]) return special[s];
  return s
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function GenreResults({ kind }: { kind: 'movie' | 'anime' }) {
  const params = useParams<{ genre?: string; slug?: string }>();
  const key = (kind === 'movie' ? params.genre : params.slug) || '';

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Title[]>([]);
  const [hasMore, setHasMore] = useState(false);

  // Reset saat genre/kind berubah (param berubah tanpa remount komponen)
  useEffect(() => {
    setPage(1);
    setItems([]);
    setHasMore(false);
  }, [kind, key]);

  const res = useAsync(async () => {
    if (!key) return { key, page, items: [] as Title[], hasMore: false };
    if (kind === 'movie') {
      const data = await movieApi.byGenre(key, page);
      return {
        key,
        page,
        items: data.items.map((m) => movieToTitle(m)),
        hasMore: data.items.length >= PAGE_MIN,
      };
    }
    const data = await animeApi.browse({ genre: key, page });
    return {
      key,
      page,
      items: data.map((a) => animeToTitle(a)),
      hasMore: data.length >= PAGE_MIN,
    };
  }, [kind, key, page]);

  useEffect(() => {
    const d = res.data;
    if (!d || d.key !== key || d.page !== page) return;
    setItems((prev) => (d.page === 1 ? d.items : [...prev, ...d.items]));
    setHasMore(d.hasMore);
  }, [res.data, key, page]);

  const initialLoading = res.loading && items.length === 0;
  const loadingMore = res.loading && items.length > 0;

  return (
    <div className="pt-[max(env(safe-area-inset-top),12px)]">
      <TopBar
        eyebrow={kind === 'movie' ? 'Genre film' : 'Genre anime'}
        title={key ? prettyGenre(key) : 'Genre'}
        back
      />

      <div className="mt-1 flex items-center justify-between px-4">
        <p className="text-[12px] text-fg-3">
          {kind === 'movie' ? 'Katalog film & series' : 'Katalog anime'}
        </p>
        {items.length > 0 && (
          <span className="text-[11.5px] text-fg-3">{items.length} judul</span>
        )}
      </div>

      <div className="mt-3">
        {initialLoading ? (
          <SkeletonGrid count={9} />
        ) : !key ? (
          <EmptyNote text="Genre tidak dikenal." />
        ) : res.error && items.length === 0 ? (
          <ErrorState message={res.error} onRetry={res.reload} />
        ) : items.length === 0 ? (
          <EmptyNote text="Belum ada judul di genre ini." />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 px-4">
              {items.map((t) => (
                <TitleCard key={`${t.kind}-${t.id}`} item={t} />
              ))}
            </div>

            <div className="mt-6 flex flex-col items-center gap-2 pb-6">
              {res.error ? (
                <>
                  <p className="text-[12px] text-danger">{res.error}</p>
                  <button
                    onClick={res.reload}
                    className="pressable text-[12.5px] font-bold text-accent"
                  >
                    Coba lagi
                  </button>
                </>
              ) : hasMore ? (
                <button
                  onClick={() => setPage((p) => p + 1)}
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

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="mx-4 flex flex-col items-center gap-2.5 rounded-[20px] bg-card p-8 text-center ring-1 ring-line">
      <Layers size={26} className="text-accent" />
      <p className="text-[13px] leading-relaxed text-fg-3">{text}</p>
    </div>
  );
}
