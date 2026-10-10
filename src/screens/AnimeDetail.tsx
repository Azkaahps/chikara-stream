// AnimeDetail - hero poster, meta chips, sinopsis, daftar episode.
// Route: /anime/:id/:slug - tapping an episode opens /watch/anime/:id/:slug/:ep

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, BookmarkCheck, ChevronRight, Play, Search, Star, X } from 'lucide-react';
import { animeApi, ApiError, resolvePoster } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { getProgress, isInWatchlist, toggleWatchlist } from '../lib/store';
import type { AnimeDetailRaw } from '../lib/types';
import TopBar from '../components/TopBar';

export default function AnimeDetail() {
  const { id, slug } = useParams<{ id: string; slug: string }>();

  const state = useAsync<AnimeDetailRaw>(
    async () => {
      if (!id || !slug) throw new ApiError('Data anime tidak lengkap');
      return animeApi.detail(id, slug);
    },
    [id, slug],
  );

  // Full episode list: the server walks the upstream pagination and caches it.
  // Runs in parallel with the detail fetch; the detail batch renders meanwhile.
  const fullState = useAsync(() => {
    if (!id || !slug) throw new ApiError('Data anime tidak lengkap');
    return animeApi.episodes(id, slug);
  }, [id, slug]);

  const detail = state.data;
  const progressKey = id && slug ? `anime:${id}:${slug}` : '';

  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [newestFirst, setNewestFirst] = useState(false);
  const [epQuery, setEpQuery] = useState('');

  // keep watchlist state in sync when the route params change
  useEffect(() => {
    setSaved(progressKey ? isInWatchlist(progressKey) : false);
  }, [progressKey]);

  // reset the episode search when navigating to another title
  useEffect(() => {
    setEpQuery('');
  }, [id, slug]);

  const progress = useMemo(
    () => (progressKey ? getProgress(progressKey) : undefined),
    [progressKey],
  );

  // Merge the detail batch with the full list (full entries win - they carry
  // real hrefs); dedupe by episode number so nothing shows twice.
  const episodes = useMemo(() => {
    const map = new Map<number, { episode: number; title?: string; href?: string; streamEndpoint?: string }>();
    for (const e of detail?.episodes ?? []) {
      if (Number.isFinite(e.episode)) map.set(e.episode, e);
    }
    for (const e of fullState.data?.episodes ?? []) {
      if (Number.isFinite(e.episode)) map.set(e.episode, e);
    }
    const list = [...map.values()];
    list.sort((a, b) => (newestFirst ? b.episode - a.episode : a.episode - b.episode));
    return list;
  }, [detail, fullState.data, newestFirst]);

  const visibleEpisodes = useMemo(() => {
    const q = epQuery.trim();
    if (!q) return episodes;
    return episodes.filter((e) => String(e.episode).includes(q));
  }, [episodes, epQuery]);

  // Bring the "continue here" row into view once the list settles.
  const epListRef = useRef<HTMLDivElement>(null);
  const currentEpRef = useRef<HTMLAnchorElement>(null);
  const autoScrolledKey = useRef('');
  useEffect(() => {
    const current = progress?.episode;
    if (!current) return;
    const key = `${id}:${episodes.length}:${current}`;
    if (autoScrolledKey.current === key) return;
    const box = epListRef.current;
    const el = currentEpRef.current;
    if (!box || !el) return;
    autoScrolledKey.current = key;
    box.scrollTop = Math.max(0, el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2);
  }, [id, episodes.length, progress?.episode]);

  const firstEpisode = episodes.length ? Math.min(...episodes.map((e) => e.episode)) : 1;
  const startEp = progress?.episode ?? firstEpisode;

  // ---------- loading ----------
  if (state.loading) {
    return (
      <div className="fade-in relative">
        <div className="shimmer h-[250px] w-full" />
        <div className="absolute inset-x-0 top-0 z-20 mt-[env(safe-area-inset-top,0px)]">
          <TopBar floating back title="" />
        </div>
        <div className="-mt-24 px-4">
          <div className="flex items-end gap-4">
            <div className="shimmer aspect-[2/3] w-[104px] shrink-0 rounded-[16px]" />
            <div className="flex-1 pb-0.5">
              <div className="shimmer h-5 w-4/5 rounded" />
              <div className="shimmer mt-2 h-3.5 w-3/5 rounded" />
            </div>
          </div>
          <div className="shimmer mt-4 h-12 w-full rounded-[14px]" />
          <div className="mt-3.5 flex gap-1.5">
            <div className="shimmer h-6 w-16 rounded-[10px]" />
            <div className="shimmer h-6 w-20 rounded-[10px]" />
            <div className="shimmer h-6 w-14 rounded-[10px]" />
          </div>
          <div className="mt-7 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shimmer h-[58px] w-full rounded-[14px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------- error / empty ----------
  if (state.error || !detail) {
    return (
      <div className="fade-in pt-[max(env(safe-area-inset-top),12px)]">
        <TopBar back title="Detail anime" />
        <div className="mt-20 flex flex-col items-center px-6 text-center">
          <p className="text-[15px] font-semibold text-fg">Gagal memuat detail</p>
          <p className="mt-1 text-[12.5px] text-fg-3">{state.error || 'Data tidak ditemukan'}</p>
          <button
            onClick={state.reload}
            className="pressable mt-5 rounded-full bg-accent px-5 py-2.5 text-[13px] font-bold text-black"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  // ---------- derived ----------
  const poster = resolvePoster(detail.poster);

  const score = Number(detail.score);
  const ratingFallback = Number(detail.rating);
  const scoreText =
    Number.isFinite(score) && score > 0
      ? score.toFixed(1)
      : Number.isFinite(ratingFallback) && ratingFallback > 0
        ? ratingFallback.toFixed(1)
        : '';

  const year = detail.aired?.match(/(19|20)\d{2}/)?.[0];

  const totalRaw = detail.episodesTotal?.trim();
  const totalNum = totalRaw && /^\d+$/.test(totalRaw) ? Number(totalRaw) : undefined;
  const epCount = episodes.length;
  const fullLoaded = Boolean(fullState.data?.episodes?.length);
  const countLabel = fullLoaded
    ? `${epCount} Episode`
    : totalNum
      ? `${totalNum} Episode`
      : epCount
        ? `${epCount} Episode terbaru`
        : 'Episode';

  const chips = [
    fullLoaded ? `${epCount} eps` : totalNum ? `${totalNum} eps` : epCount ? `${epCount} eps terbaru` : '',
    detail.duration || '',
    detail.season || '',
    detail.quality || '',
    detail.studio || '',
    detail.aired || '',
  ].filter(Boolean);

  const genres = (detail.genres ?? []).map((g) => g.trim()).filter(Boolean);

  const ctaLabel = progress ? `Lanjut Ep ${progress.episode ?? 1}` : 'Tonton sekarang';

  const handleToggleSave = () => {
    const nowSaved = toggleWatchlist({
      key: `anime:${detail.id}:${detail.slug}`,
      id: detail.id,
      slug: detail.slug,
      kind: 'anime',
      title: detail.title,
      poster,
      rating: Number.isFinite(score) && score > 0 ? score : undefined,
      year: year ? Number(year) : undefined,
    });
    setSaved(nowSaved);
  };

  return (
    <div className="fade-in relative">
      {/* hero backdrop */}
      <div className="relative h-[250px]">
        {poster ? (
          <img
            src={poster}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = '0';
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-card" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-bg/5" />
      </div>

      {/* floating back button, clear of the status bar */}
      <div className="absolute inset-x-0 top-0 z-20 mt-[env(safe-area-inset-top,0px)]">
        <TopBar floating back title="" />
      </div>

      <div className="-mt-24 px-4 pb-12">
        {/* poster + title */}
        <div className="flex items-end gap-4">
          <div className="aspect-[2/3] w-[104px] shrink-0 overflow-hidden rounded-[16px] bg-card ring-1 ring-line">
            {poster ? (
              <img src={poster} alt={detail.title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-card-2 p-2 text-center text-[11px] text-fg-3">
                {detail.title}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pb-0.5">
            <h1 className="clamp-2 text-[21px] font-bold leading-tight text-fg">
              {detail.title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-fg-2">
              {scoreText && (
                <span className="flex items-center gap-1">
                  <Star size={13} className="fill-accent text-accent" />
                  <span className="font-semibold text-fg">{scoreText}</span>
                </span>
              )}
              {year && <span>{year}</span>}
              {detail.type && <span>{detail.type}</span>}
              {detail.status && <span className="text-accent">{detail.status}</span>}
            </div>
          </div>
        </div>

        {/* actions */}
        <div className="mt-4 flex gap-2">
          <Link
            to={`/watch/anime/${detail.id}/${detail.slug}/${startEp}`}
            className="pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-accent text-[14px] font-bold text-black"
          >
            <Play size={17} className="fill-black" />
            {ctaLabel}
          </Link>
          <button
            onClick={handleToggleSave}
            aria-label={saved ? 'Hapus dari daftar simpan' : 'Simpan ke daftar'}
            className="pressable grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-card ring-1 ring-line"
          >
            {saved ? (
              <BookmarkCheck size={19} className="text-accent" />
            ) : (
              <Bookmark size={19} className="text-fg" />
            )}
          </button>
        </div>

        {/* meta chips */}
        {chips.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <span
                key={`${i}-${c}`}
                className="rounded-[10px] bg-card px-2.5 py-1 text-[11.5px] font-medium text-fg-2 ring-1 ring-line"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* genres */}
        {genres.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {genres.map((g) => (
              <Link
                key={g}
                to={`/genre/anime/${encodeURIComponent(g)}`}
                className="pressable rounded-[10px] bg-accent/10 px-2.5 py-1 text-[11.5px] font-semibold text-accent ring-1 ring-accent/25"
              >
                {g}
              </Link>
            ))}
          </div>
        )}

        {/* synopsis */}
        {detail.synopsis && (
          <section className="mt-5">
            <p className="eyebrow">Sinopsis</p>
            <p
              className={`mt-1.5 text-[13px] leading-relaxed text-fg-2 ${
                expanded ? '' : 'clamp-3'
              }`}
            >
              {detail.synopsis}
            </p>
            {detail.synopsis.length > 150 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="pressable mt-1 text-[12px] font-semibold text-accent"
              >
                {expanded ? 'Tutup' : 'Selengkapnya'}
              </button>
            )}
          </section>
        )}

        {/* episodes */}
        <section className="mt-7">
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">Daftar episode</p>
              <h2 className="mt-0.5 text-[18px] font-bold tracking-tight text-fg">
                {countLabel}
              </h2>
            </div>
            {episodes.length > 1 && (
              <button
                onClick={() => setNewestFirst((v) => !v)}
                aria-label="Ubah urutan episode"
                className="pressable rounded-full bg-card px-3 py-1.5 text-[11.5px] font-semibold text-fg-2 ring-1 ring-line"
              >
                {newestFirst ? 'Terbaru dulu' : 'Terlama dulu'}
              </button>
            )}
          </div>

          {/* full list still loading from the server */}
          {!fullLoaded && !fullState.error && episodes.length > 0 && (
            <p className="mt-2 flex items-center gap-2 text-[11.5px] text-fg-3">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-line-2 border-t-accent" />
              Memuat daftar episode lengkap...
            </p>
          )}

          {/* episode search */}
          {episodes.length > 6 && (
            <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-card px-3.5 py-2.5 ring-1 ring-line">
              <Search size={15} className="shrink-0 text-fg-3" />
              <input
                value={epQuery}
                onChange={(e) => setEpQuery(e.target.value)}
                inputMode="numeric"
                placeholder="Cari episode (nomor)..."
                aria-label="Cari episode"
                className="min-w-0 flex-1 bg-transparent text-[13.5px] text-fg outline-none placeholder:text-fg-3"
              />
              {epQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => setEpQuery('')}
                  aria-label="Hapus pencarian episode"
                  className="pressable grid h-6 w-6 shrink-0 place-items-center rounded-full bg-card-2 text-fg-3"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {episodes.length === 0 ? (
            <div className="mt-3 rounded-[14px] bg-card p-4 text-center text-[12.5px] text-fg-3 ring-1 ring-line">
              Belum ada episode untuk judul ini.
            </div>
          ) : (
            <>
              {epQuery.trim() && (
                <p className="mt-2 text-[11.5px] text-fg-3">
                  {visibleEpisodes.length
                    ? `${visibleEpisodes.length} episode cocok`
                    : 'Tidak ada episode dengan nomor itu.'}
                </p>
              )}
              <div
                ref={epListRef}
                className="no-scrollbar mt-3 max-h-[430px] space-y-2 overflow-y-auto overscroll-contain rounded-[16px] bg-card/40 p-2 ring-1 ring-line"
              >
                {visibleEpisodes.map((ep) => {
                  const isCurrent = progress?.episode === ep.episode;
                  return (
                    <Link
                      key={ep.episode}
                      ref={isCurrent ? currentEpRef : undefined}
                      to={`/watch/anime/${detail.id}/${detail.slug}/${ep.episode}`}
                      className={`pressable flex items-center gap-3 rounded-[14px] bg-card px-3 py-2.5 ring-1 ${
                        isCurrent ? 'ring-accent/60' : 'ring-line'
                      }`}
                    >
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[12.5px] font-bold ${
                          isCurrent ? 'bg-accent text-black' : 'bg-card-2 text-fg-2 ring-1 ring-line'
                        }`}
                      >
                        {ep.episode}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-fg">
                          {ep.title?.trim() || `Episode ${ep.episode}`}
                        </p>
                        {isCurrent && (
                          <p className="mt-0.5 text-[11px] font-semibold text-accent">
                            Lanjutkan di sini
                          </p>
                        )}
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-fg-3" />
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
