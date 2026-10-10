// Library — tab Simpan: lanjutkan menonton + daftar simpan (localStorage).

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, History, Inbox, Play, Trash2 } from 'lucide-react';
import { getAllProgress, getWatchlist, removeProgress, toggleWatchlist } from '../lib/store';
import type { WatchProgress, WatchlistEntry } from '../lib/types';
import TopBar from '../components/TopBar';
import TitleCard from '../components/TitleCard';

type Tab = 'progress' | 'watchlist';

export default function Library() {
  const [progress, setProgress] = useState<WatchProgress[]>(getAllProgress);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(getWatchlist);
  const [tab, setTab] = useState<Tab>(() =>
    getAllProgress().length > 0 ? 'progress' : 'watchlist',
  );

  const removeFromProgress = (key: string) => {
    removeProgress(key);
    setProgress((prev) => prev.filter((p) => p.key !== key));
  };

  const removeFromWatchlist = (entry: WatchlistEntry) => {
    toggleWatchlist(entry); // entry exists → dihapus dari daftar
    setWatchlist((prev) => prev.filter((e) => e.key !== entry.key));
  };

  const progressPct = (p: WatchProgress) =>
    Math.min(100, Math.round((p.position / Math.max(p.duration, 1)) * 100));

  return (
    <div className="pt-[max(env(safe-area-inset-top),12px)]">
      <TopBar eyebrow="Koleksi kamu" title="Simpanan" />

      {/* Tabs */}
      <div className="mt-3 px-4">
        <div className="flex rounded-2xl bg-card p-1 ring-1 ring-line">
          <button
            onClick={() => setTab('progress')}
            className={`pressable flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-bold ${
              tab === 'progress' ? 'bg-accent text-black' : 'text-fg-2'
            }`}
          >
            <History size={15} /> Lanjut nonton
            {progress.length > 0 && (
              <span
                className={`rounded-full px-1.5 text-[10.5px] ${
                  tab === 'progress' ? 'bg-black/15 text-black' : 'bg-card-2 text-fg-3'
                }`}
              >
                {progress.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('watchlist')}
            className={`pressable flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-bold ${
              tab === 'watchlist' ? 'bg-accent text-black' : 'text-fg-2'
            }`}
          >
            <Bookmark size={15} /> Daftar simpan
            {watchlist.length > 0 && (
              <span
                className={`rounded-full px-1.5 text-[10.5px] ${
                  tab === 'watchlist' ? 'bg-black/15 text-black' : 'bg-card-2 text-fg-3'
                }`}
              >
                {watchlist.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Lanjut nonton */}
      {tab === 'progress' &&
        (progress.length === 0 ? (
          <EmptyState
            icon={<Inbox size={26} className="text-accent" />}
            title="Belum ada tontonan"
            text="Judul yang kamu tonton akan muncul di sini untuk dilanjutkan."
            ctaTo="/"
            ctaLabel="Jelajahi beranda"
          />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 px-4">
            {progress.map((p) => {
              const pct = progressPct(p);
              return (
                <div key={p.key} className="relative">
                  <Link
                    to={
                      p.kind === 'anime'
                        ? `/watch/anime/${p.titleId}/${p.slug}/${p.episode || 1}`
                        : `/watch/movie/${p.slug}`
                    }
                    className="pressable block"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-[14px] bg-card ring-1 ring-line">
                      {p.poster && (
                        <img
                          src={p.poster}
                          alt={p.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 grid place-items-center bg-black/35">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-accent">
                          <Play size={18} className="ml-0.5 fill-black text-black" />
                        </div>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
                        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <p className="clamp-2 mt-1.5 text-[12.5px] font-semibold leading-snug text-fg">
                      {p.title}
                    </p>
                    <p className="text-[11px] text-fg-3">
                      {p.episodeLabel ? `${p.episodeLabel} · ` : ''}
                      {pct}% ditonton
                    </p>
                  </Link>
                  <button
                    onClick={() => removeFromProgress(p.key)}
                    aria-label={`Hapus ${p.title} dari lanjut nonton`}
                    className="pressable absolute right-1.5 top-1.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/80 text-fg-2 ring-1 ring-line-2"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        ))}

      {/* Daftar simpan */}
      {tab === 'watchlist' &&
        (watchlist.length === 0 ? (
          <EmptyState
            icon={<Bookmark size={26} className="text-accent" />}
            title="Daftar simpan kosong"
            text="Simpan anime atau film dari halaman detail agar mudah ditemukan lagi."
            ctaTo="/movies"
            ctaLabel="Jelajahi katalog"
          />
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-3 px-4 pb-4">
            {watchlist.map((e) => (
              <div key={e.key} className="relative">
                <TitleCard
                  item={{
                    id: e.id,
                    slug: e.slug,
                    title: e.title,
                    poster: e.poster,
                    kind: e.kind,
                    rating: e.rating,
                    year: e.year,
                  }}
                />
                <button
                  onClick={() => removeFromWatchlist(e)}
                  aria-label={`Hapus ${e.title} dari daftar simpan`}
                  className="pressable absolute -right-1.5 -top-1.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/85 text-fg-2 ring-1 ring-line-2"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  text,
  ctaTo,
  ctaLabel,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  ctaTo: string;
  ctaLabel: string;
}) {
  return (
    <div className="mx-4 mt-6 flex flex-col items-center gap-2.5 rounded-[20px] bg-card p-8 text-center ring-1 ring-line">
      {icon}
      <p className="text-[14px] font-semibold text-fg">{title}</p>
      <p className="text-[12.5px] leading-relaxed text-fg-3">{text}</p>
      <Link
        to={ctaTo}
        className="pressable mt-2 rounded-full bg-accent px-5 py-2.5 text-[13px] font-bold text-black"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
