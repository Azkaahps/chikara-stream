// MovieWatch — movie player.
// Loads the movie detail (server list), resolves a playable source with
// failover, resumes and persists progress, and allows switching servers.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Clock,
  History,
  RotateCcw,
  Server,
  Star,
} from 'lucide-react';
import { movieApi, ApiError } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { resolvePlayback, useVideoPlayback } from '../lib/player';
import { getProgress, removeProgress, saveProgress } from '../lib/store';
import VideoPlayer from '../components/VideoPlayer';

const SAVE_EVERY_MS = 5_000;

function formatTime(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

function StreamError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid aspect-video w-full place-items-center bg-surface px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <AlertTriangle size={28} className="text-accent" />
        <p className="text-[13px] font-medium leading-relaxed text-fg-2">{message}</p>
        <button
          onClick={onRetry}
          className="pressable flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-[13px] font-bold text-black"
        >
          <RotateCcw size={15} /> Coba lagi
        </button>
      </div>
    </div>
  );
}

export default function MovieWatch() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();

  const detail = useAsync(() => movieApi.detail(slug), [slug]);
  const [preferred, setPreferred] = useState<string | undefined>(undefined);

  const stream = useAsync(
    async () => {
      const players = detail.data?.players ?? [];
      if (!players.length) return null; // detail still loading (or no servers) — UI handles it
      try {
        const info = await resolvePlayback({
          kind: 'movie',
          slug,
          players,
          preferredServer: preferred,
        });
        return { server: preferred ?? 'auto', info };
      } catch (err) {
        // useAsync shows ApiError messages verbatim; wrap so failover details stay readable.
        throw err instanceof ApiError
          ? err
          : new ApiError((err as Error).message || 'Gagal memuat stream');
      }
    },
    [slug, preferred, detail.data],
  );

  const title = detail.data?.title || 'Film';
  const poster = detail.data?.poster || '';
  const progressKey = `movie:${slug}`;

  // ---------- resume ----------
  const readResume = useCallback(() => {
    const saved = getProgress(progressKey);
    return saved && saved.position > 10 ? saved.position : 0;
  }, [progressKey]);

  // startAt tracks where the CURRENT stream should open: it starts from saved
  // progress and follows the live position when switching servers.
  const [startAt, setStartAt] = useState(readResume);
  const [resumeDismissed, setResumeDismissed] = useState(false);

  // ---------- progress persistence ----------
  const posRef = useRef({ pos: 0, dur: 0 });
  const lastSavedRef = useRef(0);

  // Route params change without remount — re-read resume + drop stale buffers.
  useEffect(() => {
    posRef.current = { pos: 0, dur: 0 };
    lastSavedRef.current = 0;
    setStartAt(readResume());
    setResumeDismissed(false);
    setPreferred(undefined);
  }, [readResume]);

  const persist = (pos: number, dur: number) => {
    if (!dur || dur < 30 || pos < 5) return;
    if (pos >= dur - 10) {
      removeProgress(progressKey); // finished — drop from "Lanjutkan"
      return;
    }
    saveProgress({
      key: progressKey,
      titleId: slug,
      slug,
      kind: 'movie',
      title,
      poster,
      position: pos,
      duration: dur,
    });
  };
  const persistRef = useRef(persist);
  persistRef.current = persist;

  const flush = () => {
    const { pos, dur } = posRef.current;
    persistRef.current(pos, dur);
  };

  const fresh = stream.data && stream.data.server === (preferred ?? 'auto') ? stream.data.info : null;
  const playback = useVideoPlayback(stream.error ? null : fresh, {
    startAt,
    autoPlay: true,
    onProgress: (pos, dur) => {
      posRef.current = { pos, dur };
      const now = Date.now();
      if (now - lastSavedRef.current < SAVE_EVERY_MS) return;
      lastSavedRef.current = now;
      persist(pos, dur);
    },
  });

  // Persist the final position when leaving the screen.
  useEffect(() => () => flush(), []);

  // ---------- server switcher ----------
  const servers = useMemo(() => {
    const seen = new Map<string, { server: string; label: string }>();
    for (const p of detail.data?.players ?? []) {
      if (seen.has(p.server)) continue;
      seen.set(p.server, { server: p.server, label: p.name || p.server });
    }
    return [...seen.values()];
  }, [detail.data]);

  const switchServer = (server?: string) => {
    if (server === preferred) return;
    flush();
    const { pos, dur } = posRef.current;
    setStartAt(dur > 0 ? pos : startAt); // continue where we are on the new server
    setPreferred(server);
  };

  const back = () => (history.length > 1 ? navigate(-1) : navigate('/'));

  const restart = () => {
    posRef.current = { pos: 0, dur: posRef.current.dur };
    removeProgress(progressKey);
    setResumeDismissed(true);
    const video = playback.videoRef.current;
    if (video) {
      try {
        video.currentTime = 0;
        video.play().catch(() => undefined);
      } catch {
        /* ignore */
      }
    }
  };

  const showResume = startAt > 0 && !resumeDismissed;

  const header = (
    <div className="flex items-center gap-3 px-4 pb-2.5 pt-[max(env(safe-area-inset-top),10px)]">
      <button
        onClick={back}
        aria-label="Kembali"
        className="pressable grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card ring-1 ring-line"
      >
        <ArrowLeft size={18} />
      </button>
      <div className="min-w-0">
        <p className="eyebrow">{detail.data?.type || 'Film'}</p>
        <p className="truncate text-[14px] font-semibold text-fg">{title}</p>
      </div>
    </div>
  );

  const playerArea = !detail.data ? (
    detail.error ? (
      <StreamError message={detail.error} onRetry={detail.reload} />
    ) : (
      <div className="shimmer aspect-video w-full" />
    )
  ) : !detail.data.players?.length ? (
    <StreamError message="Server tidak tersedia untuk film ini." onRetry={detail.reload} />
  ) : stream.error ? (
    <StreamError message={stream.error} onRetry={stream.reload} />
  ) : fresh ? (
    <VideoPlayer info={fresh} handle={playback} title={title} poster={poster} autoPlay />
  ) : (
    <div className="shimmer aspect-video w-full" />
  );

  return (
    <div className="pb-10">
      {header}
      {playerArea}

      {showResume && (
        <p className="flex flex-wrap items-center gap-1.5 px-4 pt-3 text-[12px] text-fg-3">
          <History size={13} className="text-accent" />
          Lanjut dari {formatTime(startAt)}
          <button onClick={restart} className="pressable font-semibold text-accent">
            · Mulai dari awal
          </button>
        </p>
      )}

      {servers.length > 0 && (
        <section className="mt-5 px-4">
          <div className="flex items-center gap-2">
            <Server size={15} className="text-accent" />
            <h2 className="text-[14px] font-bold text-fg">Server</h2>
          </div>
          <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => switchServer(undefined)}
              className={`pressable shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold ring-1 ${
                preferred === undefined
                  ? 'bg-accent text-black ring-accent'
                  : 'bg-card text-fg-2 ring-line'
              }`}
            >
              Auto
            </button>
            {servers.map((s) => (
              <button
                key={s.server}
                onClick={() => switchServer(s.server)}
                className={`pressable shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold ring-1 ${
                  preferred === s.server
                    ? 'bg-accent text-black ring-accent'
                    : 'bg-card text-fg-2 ring-line'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] text-fg-3">
            Video tersendat? Coba server lain — posisi tontonan tetap tersimpan.
          </p>
        </section>
      )}

      {detail.data && (
        <section className="mt-6 px-4">
          <h1 className="text-[19px] font-bold leading-snug text-fg">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fg-3">
            {detail.data.year != null && (
              <span className="flex items-center gap-1">
                <CalendarDays size={13} /> {detail.data.year}
              </span>
            )}
            {detail.data.duration && (
              <span className="flex items-center gap-1">
                <Clock size={13} /> {detail.data.duration}
              </span>
            )}
            {detail.data.quality && (
              <span className="rounded-md bg-card-2 px-1.5 py-0.5 text-[10.5px] font-bold text-fg-2">
                {detail.data.quality}
              </span>
            )}
            {detail.data.rating != null && detail.data.rating > 0 && (
              <span className="flex items-center gap-1 font-semibold text-fg-2">
                <Star size={13} className="fill-accent text-accent" /> {detail.data.rating.toFixed(1)}
              </span>
            )}
          </div>
          {detail.data.genres?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {detail.data.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-fg-2 ring-1 ring-line"
                >
                  {g}
                </span>
              ))}
            </div>
          ) : null}
          {detail.data.synopsis && (
            <p className="clamp-3 mt-3 text-[12.5px] leading-relaxed text-fg-2">
              {detail.data.synopsis}
            </p>
          )}
          {detail.data.directors?.length ? (
            <p className="mt-3 text-[12px] text-fg-3">
              <span className="font-semibold text-fg-2">Sutradara:</span>{' '}
              {detail.data.directors.join(', ')}
            </p>
          ) : null}
          {detail.data.cast?.length ? (
            <p className="mt-1 text-[12px] text-fg-3">
              <span className="font-semibold text-fg-2">Pemain:</span> {detail.data.cast.join(', ')}
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}
