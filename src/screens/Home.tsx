// Home — "Untuk Kamu": featured hero carousel + rails (anime + film united).

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Play } from 'lucide-react';
import { animeApi, movieApi, animeToTitle, movieToTitle } from '../lib/api';
import { useAsync } from '../lib/hooks';
import type { Title } from '../lib/types';
import Rail from '../components/Rail';
import TitleCard from '../components/TitleCard';
import { SkeletonHero, SkeletonRail } from '../components/Skeleton';
import { getAllProgress } from '../lib/store';

export default function Home() {
  const animeHome = useAsync(() => animeApi.home(), []);
  const animeMovies = useAsync(() => animeApi.movies(), []);
  const movieHome = useAsync(() => movieApi.home(), []);
  const [heroIdx, setHeroIdx] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  const featured: Title[] = useMemo(() => {
    const anime = (animeHome.data || []).slice(0, 6).map(animeToTitle);
    const movies = (movieHome.data?.topOfMonth || []).slice(0, 6).map((m) => movieToTitle(m));
    // interleave anime + movie for a united feed
    const merged: Title[] = [];
    for (let i = 0; i < Math.max(anime.length, movies.length); i++) {
      if (anime[i]) merged.push(anime[i]);
      if (movies[i]) merged.push(movies[i]);
    }
    return merged.slice(0, 8);
  }, [animeHome.data, movieHome.data]);

  const continueWatching = useMemo(() => getAllProgress().slice(0, 8), []);

  const loading = animeHome.loading && movieHome.loading;

  return (
    <div className="pt-[max(env(safe-area-inset-top),12px)]">
      {/* Brand header */}
      <header className="flex items-center justify-between px-4">
        <div>
          <p className="eyebrow">Tontonan malam ini</p>
          <h1 className="mt-0.5 text-[28px] font-black uppercase tracking-tight text-accent">
            Azkahps Play
          </h1>
          <p className="mt-0.5 text-[12.5px] text-fg-3">
            Anime & film streaming — satu tempat.
          </p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 3 3 21h5l4-9 4 9h5L12 3z" fill="#000" />
          </svg>
        </div>
      </header>

      {/* Continue watching */}
      {continueWatching.length > 0 && (
        <Rail eyebrow="Lanjutkan" title="Lanjut nonton">
          {continueWatching.map((p) => (
            <Link
              key={p.key}
              to={
                p.kind === 'anime'
                  ? `/watch/anime/${p.titleId}/${p.slug}/${p.episode || 1}`
                  : `/watch/movie/${p.slug}`
              }
              className="pressable w-[190px] shrink-0"
            >
              <div className="relative aspect-video overflow-hidden rounded-[14px] bg-card ring-1 ring-line">
                {p.poster && (
                  <img src={p.poster} alt={p.title} className="h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 grid place-items-center bg-black/35">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-accent">
                    <Play size={18} className="ml-0.5 fill-black text-black" />
                  </div>
                </div>
                {/* progress bar */}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
                  <div
                    className="h-full bg-accent"
                    style={{
                      width: `${Math.min(100, Math.round((p.position / Math.max(p.duration, 1)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
              <p className="clamp-2 mt-1.5 text-[12.5px] font-semibold text-fg">{p.title}</p>
              {p.episodeLabel && <p className="text-[11px] text-accent">{p.episodeLabel}</p>}
            </Link>
          ))}
        </Rail>
      )}

      {/* Featured hero */}
      {loading ? (
        <div className="mt-6">
          <SkeletonHero />
        </div>
      ) : (
        featured.length > 0 && (
          <section className="mt-5">
            <div
              ref={railRef}
              className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4"
              onScroll={(e) => {
                const el = e.currentTarget;
                const idx = Math.round(el.scrollLeft / (el.clientWidth - 32));
                setHeroIdx(Math.max(0, Math.min(featured.length - 1, idx)));
              }}
            >
              {featured.map((t) => (
                <Link
                  key={`${t.kind}-${t.id}`}
                  to={
                    t.kind === 'anime' ? `/anime/${t.id}/${t.slug}` : `/movie/${t.slug}`
                  }
                  className="pressable relative w-[calc(100%-32px)] shrink-0 snap-center overflow-hidden rounded-[20px] bg-card ring-1 ring-line"
                >
                  <div className="relative aspect-[16/10]">
                    {t.poster ? (
                      <img
                        src={t.poster}
                        alt={t.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.opacity = '0';
                        }}
                      />
                    ) : (
                      <div className="h-full w-full bg-card-2" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        t.kind === 'anime' ? 'bg-accent text-black' : 'bg-white/90 text-black'
                      }`}
                    >
                      {t.kind === 'anime' ? 'Anime' : 'Film'}
                    </span>
                    <h3 className="clamp-2 mt-2 text-[19px] font-bold leading-snug text-white">
                      {t.title}
                    </h3>
                    <div className="mt-1.5 flex items-center gap-2 text-[12px] text-fg-2">
                      {t.rating != null && t.rating > 0 && (
                        <>
                          <Star size={13} className="fill-accent text-accent" />
                          <span className="font-semibold text-white">{t.rating.toFixed(1)}</span>
                        </>
                      )}
                      {t.episodeInfo && <span>{t.episodeInfo}</span>}
                      {t.quality && <span>{t.quality}</span>}
                    </div>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13px] font-bold text-black">
                      <Play size={15} className="fill-black" /> Tonton sekarang
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {/* dots */}
            <div className="mt-3 flex justify-center gap-1.5">
              {featured.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === heroIdx ? 'w-5 bg-accent' : 'w-1.5 bg-line-2'
                  }`}
                />
              ))}
            </div>
          </section>
        )
      )}

      {/* Rails */}
      {animeHome.loading && movieHome.loading ? (
        <>
          <SkeletonRail />
          <SkeletonRail />
        </>
      ) : (
        <>
          {animeHome.data && animeHome.data.length > 0 && (
            <Rail eyebrow="Sedang tayang" title="Anime update" more="/anime">
              {animeHome.data.slice(0, 12).map((a) => (
                <TitleCard key={a.id} item={animeToTitle(a)} variant="rail" />
              ))}
            </Rail>
          )}

          {movieHome.data?.latestMovies && (
            <Rail eyebrow="Baru rilis" title="Film terbaru" more="/movies">
              {movieHome.data.latestMovies.slice(0, 12).map((m) => (
                <TitleCard key={m.slug} item={movieToTitle(m)} variant="rail" />
              ))}
            </Rail>
          )}

          {movieHome.data?.topOfMonth && (
            <Rail eyebrow="Paling rame" title="Top bulan ini">
              {movieHome.data.topOfMonth.slice(0, 12).map((m) => (
                <TitleCard key={m.slug} item={movieToTitle(m)} variant="rail" />
              ))}
            </Rail>
          )}

          {animeMovies.data && animeMovies.data.length > 0 && (
            <Rail eyebrow="Movie anime" title="Anime movie" more="/anime">
              {animeMovies.data.slice(0, 12).map((a) => (
                <TitleCard key={`m-${a.id}`} item={animeToTitle(a)} variant="rail" />
              ))}
            </Rail>
          )}

          {movieHome.data?.drakor && (
            <Rail eyebrow="Drakor" title="Series Korea">
              {movieHome.data.drakor.slice(0, 12).map((m) => (
                <TitleCard key={m.slug} item={movieToTitle(m, 'series')} variant="rail" />
              ))}
            </Rail>
          )}
        </>
      )}

      <footer className="mt-10 px-4 pb-6 text-center text-[11px] text-fg-3">
        AZKAHPS Play · data dari api.azkahps.online
      </footer>
    </div>
  );
}
