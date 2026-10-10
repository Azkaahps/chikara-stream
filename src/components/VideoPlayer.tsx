// VideoPlayer - core playback surface.
// Native <video> controls (reliable on Android WebView) + quality chips +
// fullscreen toggle that forces landscape on phones.

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, AlertTriangle, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import type { PlaybackHandle, PlaybackInfo } from '../lib/player';
import { lockLandscape, unlockOrientation } from '../lib/native';

interface Props {
  info: PlaybackInfo | null;
  handle: PlaybackHandle;
  title: string;
  poster?: string;
  /** show a small header above the video */
  header?: React.ReactNode;
  autoPlay?: boolean;
}

export default function VideoPlayer({ info, handle, title, poster, header, autoPlay }: Props) {
  const { videoRef, ready, error, qualities, activeQuality, switchQuality, retry } = handle;
  const [showQuality, setShowQuality] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // apply autoplay once ready
  useEffect(() => {
    if (ready && autoPlay) {
      videoRef.current?.play().catch(() => undefined);
    }
  }, [ready, autoPlay, videoRef]);

  // Fullscreen -> force landscape. The native layer locks orientation when the
  // WebView shows a fullscreen video surface; this covers the JS path too.
  useEffect(() => {
    const onFsChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (active) {
        void lockLandscape();
      } else {
        void unlockOrientation();
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }
    if (typeof stage.requestFullscreen === 'function') {
      void stage.requestFullscreen().catch(() => undefined);
      return;
    }
    // very old WebView fallback: hand off to the native video fullscreen
    const video = videoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null;
    video?.webkitEnterFullscreen?.();
  };

  return (
    <div className="w-full">
      {header}
      <div ref={stageRef} className="video-stage relative w-full bg-black">
        {/* 16:9 stage */}
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="h-full w-full"
            controls
            playsInline
            preload="metadata"
            poster={poster || info?.poster || undefined}
          />

          {!ready && !error && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/60">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={30} className="animate-spin text-accent" />
                <p className="text-[12.5px] font-medium text-fg-2">Memuat stream...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/95 px-6 text-center">
              <AlertTriangle size={28} className="text-accent" />
              <p className="text-[13px] font-medium leading-relaxed text-fg-2">{error}</p>
              <button
                onClick={retry}
                className="pressable flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-[13px] font-bold text-black"
              >
                <RotateCcw size={15} /> Coba lagi
              </button>
            </div>
          )}
        </div>

        {/* control strip */}
        <div className="flex items-center justify-between gap-2 bg-surface px-4 py-2.5">
          <p className="clamp-2 min-w-0 flex-1 text-[12px] font-medium text-fg-2">{title}</p>
          {qualities.length > 1 && (
            <button
              onClick={() => setShowQuality((v) => !v)}
              className="pressable shrink-0 rounded-full bg-card px-3 py-1.5 text-[11.5px] font-bold text-accent ring-1 ring-line-2"
            >
              {activeQuality || 'Auto'}
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Keluar dari layar penuh' : 'Layar penuh'}
            className="pressable grid h-8 w-8 shrink-0 place-items-center rounded-full bg-card text-fg-2 ring-1 ring-line-2"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>

        {showQuality && qualities.length > 1 && (
          <div className="fade-in flex flex-wrap gap-2 bg-surface px-4 pb-3">
            {qualities.map((q) => (
              <button
                key={q.label + q.url}
                onClick={() => {
                  switchQuality(q.label || '');
                  setShowQuality(false);
                }}
                className={`pressable rounded-full px-3.5 py-1.5 text-[12px] font-semibold ring-1 ${
                  q.label === activeQuality
                    ? 'bg-accent text-black ring-accent'
                    : 'bg-card text-fg-2 ring-line-2'
                }`}
              >
                {q.label || 'Auto'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
