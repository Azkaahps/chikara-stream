// ============================================================
// MovieDetail - film detail page (LK21 provider)
// Hero poster + title/rating meta, synopsis, cast, and the
// primary "Tonton" action -> /watch/movie/:slug.
// ============================================================

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, BookmarkCheck, Calendar, Clock, Play, RotateCw, Star } from 'lucide-react';
import { movieApi, resolvePoster } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { isInWatchlist, toggleWatchlist } from '../lib/store';
import TopBar from '../components/TopBar';

export default function MovieDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data: movie, loading, error, reload } = useAsync(() => movieApi.detail(slug), [slug]);
  const [inWatchlist, setInWatchlist] = useState(() => isInWatchlist(`movie:${slug}`));

  const poster = resolvePoster(movie?.poster);

  function handleWatchlistToggle() {
    if (!movie) return;
    setInWatchlist(
      toggleWatchlist({
        key: `movie:${slug}`,
        id: slug,
        slug,
        kind: 'movie',
        title: movie.title,
        poster,
        rating: movie.rating ?? undefined,
        year: movie.year ?? undefined,
      }),
    );
  }

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="fade-in">
        <div className="shimmer h-[380px] w-full" />
        <div className="px-4">
          <div className="shimmer mt-3 h-4 w-16 rounded" />
          <div className="shimmer mt-3 h-7 w-4/5 rounded-lg" />
          <div className="shimmer mt-3 h-3.5 w-1/2 rounded" />
          <div className="shimmer mt-5 h-12 w-full rounded-2xl" />
          <div className="shimmer mt-6 h-3.5 w-24 rounded" />
          <div className="shimmer mt-3 h-3 w-full rounded" />
          <div className="shimmer mt-2 h-3 w-11/12 rounded" />
          <div className="shimmer mt-2 h-3 w-2/3 rounded" />
        </div>
      </div>
    );
  }

  // ---------- Error ----------
  if (error || !movie) {
    return (
      <div className="fade-in">
        <TopBar back title="Detail film" />
        <div className="mt-24 flex flex-col items-center px-8 text-center">
          <p className="text-[15px] font-semibold text-fg">Gagal memuat film</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-fg-3">
            {error || 'Film tidak ditemukan.'}
          </p>
          <button
            onClick={reload}
            className="pressable mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13px] font-bold text-black"
          >
            <RotateCw size={15} /> Coba lagi
          </button>
        </div>
      </div>
    );
  }

  const kindLabel = movie.type?.toLowerCase().includes('series') ? 'Series' : 'Film';

  return (
    <div className="fade-in pb-[max(env(safe-area-inset-bottom),28px)]">
      {/* Hero poster */}
      <div className="relative">
        <div className="relative h-[420px] overflow-hidden bg-card">
          {poster ? (
            <img
              src={poster}
              alt={movie.title}
              className="h-full w-full object-cover object-top"
              onError={(e) => {
                e.currentTarget.style.opacity = '0';
              }}
            />
          ) : (
            <div className="h-full w-full bg-card-2" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
        </div>
        <TopBar floating back title={movie.title} />
      </div>

      {/* Body, pulled up over the hero fade */}
      <div className="relative -mt-36 px-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
            {kindLabel}
          </span>
          {movie.quality && (
            <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ring-1 ring-white/15">
              {movie.quality}
            </span>
          )}
        </div>

        <h1 className="mt-2 text-[27px] font-black leading-tight tracking-tight text-fg">
          {movie.title}
        </h1>

        {/* Rating + meta */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-fg-2">
          {movie.rating != null && movie.rating > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star size={14} className="fill-accent text-accent" />
              <span className="font-bold text-fg">{movie.rating.toFixed(1)}</span>
              {movie.votes && <span className="text-fg-3">({movie.votes})</span>}
            </span>
          )}
          {movie.year != null && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={13} /> {movie.year}
            </span>
          )}
          {movie.duration && (
            <span className="inline-flex items-center gap-1">
              <Clock size={13} /> {movie.duration}
            </span>
          )}
        </div>

        {/* Genres (dedupe case-insensitive: upstream sends both "Action" and "ACTION") */}
        {movie.genres && movie.genres.length > 0 && (
          <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
            {movie.genres
              .filter(
                (g, i, arr) => arr.findIndex((x) => x.toLowerCase() === g.toLowerCase()) === i,
              )
              .map((g) => (
                <Link
                  key={g}
                  to={`/genre/movie/${encodeURIComponent(g)}`}
                  className="pressable shrink-0 rounded-full bg-card px-3 py-1 text-[11.5px] font-medium text-fg-2 ring-1 ring-line"
                >
                  {g}
                </Link>
              ))}
          </div>
        )}

        {/* Primary action */}
        <div className="mt-4 flex items-stretch gap-2.5">
          <Link
            to={`/watch/movie/${slug}`}
            state={{ title: movie.title, poster }}
            className="pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-black text-black"
          >
            <Play size={19} className="fill-black" />
            Tonton
          </Link>
          <button
            onClick={handleWatchlistToggle}
            aria-label={inWatchlist ? 'Hapus dari daftar tonton' : 'Simpan ke daftar tonton'}
            className={`pressable grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 ${
              inWatchlist
                ? 'bg-accent/15 text-accent ring-accent/40'
                : 'bg-card text-fg-2 ring-line'
            }`}
          >
            {inWatchlist ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
          </button>
        </div>

        {/* Synopsis */}
        {movie.synopsis && (
          <section className="mt-6">
            <h2 className="text-[15px] font-bold text-fg">Sinopsis</h2>
            <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-fg-2">
              {movie.synopsis}
            </p>
          </section>
        )}

        {/* Cast */}
        {movie.cast && movie.cast.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[15px] font-bold text-fg">Pemain</h2>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {movie.cast.map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-card px-3 py-1.5 text-[12.5px] font-medium text-fg-2 ring-1 ring-line"
                >
                  {name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Crew / origin info */}
        {(movie.directors?.length || movie.countries?.length || movie.release) && (
          <section className="mt-6 rounded-2xl bg-card p-4 ring-1 ring-line">
            <dl className="space-y-2 text-[13px]">
              {movie.directors && movie.directors.length > 0 && (
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0 text-fg-3">Sutradara</dt>
                  <dd className="text-fg-2">{movie.directors.join(', ')}</dd>
                </div>
              )}
              {movie.countries && movie.countries.length > 0 && (
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0 text-fg-3">Negara</dt>
                  <dd className="text-fg-2">{movie.countries.join(', ')}</dd>
                </div>
              )}
              {movie.release && (
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0 text-fg-3">Rilis</dt>
                  <dd className="text-fg-2">{movie.release}</dd>
                </div>
              )}
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}
