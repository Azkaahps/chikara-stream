// AnimeWatch - anime episode player.
// Resolves kuramadrive MP4 sources through the shared player lib, resumes from
// saved progress, persists progress while playing, and advances to the next episode.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  History,
  ListVideo,
  RotateCcw,
  Star,
} from 'lucide-react';
import { animeApi, ApiError } from '../lib/api';
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

export default function AnimeWatch() {
  const { id = '', slug = '', ep: epParam = '1' } = useParams();
  const episode = Math.max(1, Number.parseInt(epParam, 10) || 1);
  const navigate = useNavigate();

  const detail = useAsync(() => animeApi.detail(id, slug), [id, slug]);
  // Full episode list for prev/next navigation (server-side paginated + cached).
  const fullEps = useAsync(() => animeApi.episodes(id, slug), [id, slug]);
  const stream = useAsync(
    async () => {
      try {
        const info = await resolvePlayback({ kind: 'anime', id, slug, episode });
        return { episode, info };
      } catch (err) {
        // useAsync shows ApiError messages verbatim; wrap so resolve failures stay readable.
        throw err instanceof ApiError
          ? err
          : new ApiError((err as Error).message || 'Gagal memuat stream');
      }
    },
    [id, slug, episode],
  );

  const title = detail.data?.title || 'Anime';
  const poster = detail.data?.poster || '';
  const progressKey = `anime:${id}:${slug}`;

  // ---------- resume ----------
  // The store keeps one entry per title, tagged with its last episode; only
  // resume when that entry belongs to the episode being watched.
  const resumeAt = useMemo(() => {
    const saved = getProgress(progressKey);
    return saved && saved.episode === episode && saved.position > 10 ? saved.position : 0;
  }, [progressKey, episode]);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  useEffect(() => setResumeDismissed(false), [episode]);

  // ---------- progress persistence ----------
  const posRef = useRef({ pos: 0, dur: 0 });
  const lastSavedRef = useRef(0);

  // Route params change without remount - drop the previous episode's buffer.
  useEffect(() => {
    posRef.current = { pos: 0, dur: 0 };
    lastSavedRef.current = 0;
  }, [id, slug, episode]);

  const persist = (pos: number, dur: number) => {
    if (!dur || dur < 30 || pos < 5) return;
    if (pos >= dur - 10) {
      removeProgress(progressKey); // finished - drop from "Lanjutkan"
      return;
    }
    saveProgress({
      key: progressKey,
      titleId: id,
      slug,
      kind: 'anime',
      title,
      poster,
      episode,
      episodeLabel: `Episode ${episode}`,
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

  const fresh = stream.data && stream.data.episode === episode ? stream.data.info : null;
  const playback = useVideoPlayback(stream.error ? null : fresh, {
    startAt: resumeAt,
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

  // ---------- episode navigation ----------
  const episodes = useMemo(() => {
    const nums = [
      ...(detail.data?.episodes || []).map((e) => e.episode),
      ...(fullEps.data?.episodes || []).map((e) => e.episode),
    ].filter((n) => Number.isFinite(n) && n > 0);
    if (nums.length) return [...new Set(nums)].sort((a, b) => a - b);
    const total = Number.parseInt(detail.data?.episodesTotal || '', 10);
    if (Number.isFinite(total) && total > 0) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    return [episode];
  }, [detail.data, fullEps.data, episode]);

  const idx = episodes.indexOf(episode);
  const prevEp = idx > 0 ? episodes[idx - 1] : null;
  const nextEp = idx >= 0 && idx < episodes.length - 1 ? episodes[idx + 1] : null;
  // Episode numbers are not always 1-based (One Piece starts at 989), so the
  // "current / total" label uses the highest episode number, not the count.
  const maxEp = episodes.length ? Math.max(...episodes) : 0;

  const goToEpisode = (n: number) => {
    if (n === episode) return;
    flush();
    navigate(`/watch/anime/${id}/${slug}/${n}`);
  };

  // Auto-advance when an episode finishes.
  useEffect(() => {
    const video = playback.videoRef.current;
    if (!video || !playback.ready || nextEp == null) return;
    const onEnded = () => goToEpisode(nextEp);
    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback.ready, playback.videoRef, nextEp, episode, id, slug]);

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

  const epTitle = detail.data?.episodes?.find((e) => e.episode === episode)?.title;
  const showResume = resumeAt > 0 && !resumeDismissed;
  const hasNav = prevEp != null || nextEp != null;

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
        <p className="eyebrow">Episode {episode}</p>
        <p className="truncate text-[14px] font-semibold text-fg">{title}</p>
      </div>
    </div>
  );

  return (
    <div className="pb-10">
      {header}

      {stream.error ? (
        <StreamError message={stream.error} onRetry={stream.reload} />
      ) : fresh ? (
        <VideoPlayer
          info={fresh}
          handle={playback}
          title={`Episode ${episode} - ${title}`}
          poster={poster}
          autoPlay
        />
      ) : (
        <div className="shimmer aspect-video w-full" />
      )}

      {/* episode controls */}
      {(hasNav || showResume) && (
        <section className="px-4 pt-4">
          {hasNav && (
            <div className="flex items-center gap-2">
              {prevEp != null && (
                <button
                  onClick={() => goToEpisode(prevEp)}
                  className="pressable flex items-center gap-1 rounded-full bg-card px-4 py-2 text-[12.5px] font-semibold text-fg-2 ring-1 ring-line"
                >
                  <ChevronLeft size={15} /> Sebelumnya
                </button>
              )}
              {nextEp != null && (
                <button
                  onClick={() => goToEpisode(nextEp)}
                  className="pressable ml-auto flex items-center gap-1 rounded-full bg-accent px-4 py-2 text-[12.5px] font-bold text-black"
                >
                  Episode {nextEp} <ChevronRight size={15} />
                </button>
              )}
            </div>
          )}
          {showResume && (
            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-fg-3">
              <History size={13} className="text-accent" />
              Lanjut dari {formatTime(resumeAt)}
              <button onClick={restart} className="pressable font-semibold text-accent">
                - Mulai dari awal
              </button>
            </p>
          )}
        </section>
      )}

      {/* episode picker */}
      {episodes.length > 1 && (
        <section className="mt-5 px-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-fg">
              <ListVideo size={16} className="text-accent" /> Episode
            </h2>
            <span className="text-[11.5px] text-fg-3">{episodes.length} episode</span>
          </div>
          <div className="no-scrollbar mt-3 grid max-h-[228px] grid-cols-6 gap-2 overflow-y-auto overscroll-contain">
            {episodes.map((n) => (
              <button
                key={n}
                onClick={() => goToEpisode(n)}
                className={`pressable rounded-xl py-2.5 text-[12.5px] font-bold ring-1 ${
                  n === episode ? 'bg-accent text-black ring-accent' : 'bg-card text-fg-2 ring-line'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* about */}
      <section className="mt-6 px-4">
        {detail.data && (
          <h1 className="text-[18px] font-bold leading-snug text-fg">{title}</h1>
        )}
        {epTitle && (
          <p className="mt-0.5 text-[12.5px] text-fg-3">
            Ep {episode} - {epTitle}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fg-3">
          {detail.data?.type && (
            <span className="rounded-md bg-card-2 px-1.5 py-0.5 text-[10.5px] font-bold text-fg-2">
              {detail.data.type}
            </span>
          )}
          {maxEp > 1 && (
            <span>
              {episode} / {maxEp}
            </span>
          )}
          {detail.data?.status && <span>{detail.data.status}</span>}
          {detail.data?.score && (
            <span className="flex items-center gap-1 font-semibold text-fg-2">
              <Star size={13} className="fill-accent text-accent" />
              {detail.data.score}
            </span>
          )}
        </div>
        {detail.data?.genres?.length ? (
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
        {detail.data?.synopsis && (
          <p className="clamp-3 mt-3 text-[12.5px] leading-relaxed text-fg-2">{detail.data.synopsis}</p>
        )}
        {detail.error && !detail.data && (
          <p className="mt-3 text-[12px] text-fg-3">
            Info anime tidak bisa dimuat - pemutaran tetap berjalan.
          </p>
        )}
      </section>
    </div>
  );
}
