// ============================================================
// Player bridge - HLS + MP4 playback, resume, progress saving
// Strategy (verified against live API 2026-10):
//  - Anime: kuramadrive MP4 -> play via /proxy/stream (CORS safe)
//  - Movie: cast -> HLS (proxy/hls), hydrax -> MP4 (proxy/hydrax/stream),
//           p2p -> HLS (proxy/hls). Failover across servers.
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import type HlsType from 'hls.js';
import { animeApi, movieApi, proxy } from '../lib/api';
import type { MovieStreamData } from '../lib/api';
import type { AnimeStreamData } from '../lib/types';

// hls.js is heavy (~500 KB) and only needed for movie HLS servers, so it is
// lazy-loaded on demand. `hls.js/light` drops the subtitle/alt-audio parsers
// we do not use - cheaper to download, parse and keep in memory on slow phones.
type HlsCtor = typeof import('hls.js').default;
let hlsCtorPromise: Promise<HlsCtor> | null = null;

function loadHls(): Promise<HlsCtor> {
  if (!hlsCtorPromise) {
    hlsCtorPromise = import('hls.js/light')
      .then((mod) => mod.default as HlsCtor)
      .catch((err) => {
        hlsCtorPromise = null; // allow retry on a flaky network
        throw err;
      });
  }
  return hlsCtorPromise;
}

export interface PlaySource {
  /** proxied URL ready for <video> */
  url: string;
  type: 'hls' | 'mp4';
  label?: string;
}

export interface PlaybackInfo {
  sources: PlaySource[];
  poster?: string;
  /** additional server options for failover (movie only) */
  servers: { server: string; id: string; label: string }[];
}

interface AnimePlayArgs {
  kind: 'anime';
  id: string;
  slug: string;
  episode: number;
}

interface MoviePlayArgs {
  kind: 'movie';
  slug: string;
  /** player list from detail payload */
  players: { server: string; id: string; name?: string; recommended?: boolean }[];
  /** user-selected server (optional) */
  preferredServer?: string;
}

export type PlayArgs = AnimePlayArgs | MoviePlayArgs;

/** Resolve all playable sources for a title (handles failover internally). */
export async function resolvePlayback(args: PlayArgs): Promise<PlaybackInfo> {
  if (args.kind === 'anime') {
    const data: AnimeStreamData = await animeApi.stream(args.id, args.slug, args.episode);
    const sources = (data.stream?.sources || [])
      .filter((s) => s.url)
      .sort((a, b) => qualityRank(b.quality) - qualityRank(a.quality))
      .map((s) => ({
        url: proxy.stream(s.url),
        type: 'mp4' as const,
        label: s.quality,
      }));
    if (!sources.length) throw new Error('Stream anime tidak tersedia untuk episode ini');
    return { sources, servers: [] };
  }

  // Movie: try servers in order (preferred first, then rest)
  const ordered = [...args.players].sort((a, b) => {
    if (a.server === args.preferredServer) return -1;
    if (b.server === args.preferredServer) return 1;
    return Number(b.recommended || 0) - Number(a.recommended || 0);
  });

  const errors: string[] = [];
  for (const p of ordered) {
    try {
      const data: MovieStreamData = await movieApi.stream(p.server, p.id);
      const sources: PlaySource[] = [];
      const base = data.streamProxy || data.fileUrl;

      if (data.streamType === 'hls' && base) {
        sources.push({ url: proxy.hls(absolutize(base)), type: 'hls', label: 'HLS' });
      } else if (data.streamType === 'mp4' && base) {
        sources.push({ url: absolutize(base), type: 'mp4', label: 'MP4' });
      }

      if (sources.length) {
        return {
          sources,
          poster: data.poster,
          servers: ordered.map((x) => ({ server: x.server, id: x.id, label: x.server })),
        };
      }
      errors.push(`${p.server}: tidak ada sumber`);
    } catch (err) {
      errors.push(`${p.server}: ${(err as Error).message.slice(0, 60)}`);
    }
  }
  throw new Error(`Semua server gagal - ${errors.join(' | ')}`);
}

function absolutize(url: string): string {
  if (url.startsWith('http')) return url;
  return `https://api.azkahps.online${url}`;
}

function qualityRank(q?: string): number {
  const n = parseInt(q || '0', 10);
  return Number.isFinite(n) ? n : 0;
}

// ============================================================
// useVideoPlayback - wires <video> element to sources + HLS
// ============================================================

export interface PlaybackHandle {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  ready: boolean;
  error: string | null;
  /** currently active source label (quality) */
  activeQuality: string;
  qualities: PlaySource[];
  switchQuality: (label: string) => void;
  retry: () => void;
}

export function useVideoPlayback(
  info: PlaybackInfo | null,
  opts: {
    startAt?: number;
    onProgress?: (pos: number, dur: number) => void;
    autoPlay?: boolean;
  } = {},
): PlaybackHandle {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<HlsType | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qualityIdx, setQualityIdx] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const startAppliedRef = useRef(false);
  const onProgressRef = useRef(opts.onProgress);
  onProgressRef.current = opts.onProgress;

  const qualities = info?.sources || [];
  const active = qualities[qualityIdx] || qualities[0];

  const switchQuality = useCallback(
    (label: string) => {
      const idx = qualities.findIndex((q) => q.label === label);
      if (idx >= 0) setQualityIdx(idx);
    },
    [qualities],
  );

  useEffect(() => {
    startAppliedRef.current = false;
    setReady(false);
    setError(null);
    setQualityIdx(0);
  }, [info]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active?.url) return;

    let destroyed = false;

    const onLoaded = () => {
      if (destroyed) return;
      setReady(true);
      if (!startAppliedRef.current && opts.startAt && opts.startAt > 10) {
        try {
          video.currentTime = opts.startAt;
        } catch {
          /* ignore */
        }
      }
      startAppliedRef.current = true;
      if (opts.autoPlay) {
        video.play().catch(() => {
          /* autoplay blocked -> user gesture needed */
        });
      }
    };

    const onTime = () => {
      if (video.duration > 0) onProgressRef.current?.(video.currentTime, video.duration);
    };

    const onErr = () => {
      if (!destroyed) setError('Stream gagal dimuat - coba server/kualitas lain');
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('error', onErr);

    if (active.type === 'hls') {
      loadHls()
        .then((Hls) => {
          if (destroyed) return;
          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              abrEwmaDefaultEstimate: 2_500_000,
              capLevelToPlayerSize: false,
              // bounded buffers - keep memory low on potato phones
              backBufferLength: 30,
              maxBufferLength: 20,
              maxMaxBufferLength: 40,
            });
            hlsRef.current = hls;
            hls.loadSource(active.url);
            hls.attachMedia(video);
            hls.on(Hls.Events.ERROR, (_evt, data) => {
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    hls.recoverMediaError();
                    break;
                  default:
                    setError('Stream bermasalah - coba server lain');
                    break;
                }
              }
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = active.url;
          } else {
            setError('Perangkat tidak mendukung HLS');
          }
        })
        .catch(() => {
          if (!destroyed) setError('Gagal memuat pemutar - coba lagi');
        });
    } else {
      video.src = active.url;
    }

    return () => {
      destroyed = true;
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('error', onErr);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeAttribute('src');
      try {
        video.load();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.url, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setReady(false);
    setAttempt((a) => a + 1);
  }, []);

  return {
    videoRef,
    ready,
    error,
    activeQuality: active?.label || '',
    qualities,
    switchQuality,
    retry,
  };
}
