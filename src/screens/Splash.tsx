// Splash — brand gate, mirrors AniBiPlay splash (yellow glow logo on black)

import { useEffect } from 'react';

export default function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <div className="glow-pulse grid h-24 w-24 place-items-center rounded-[28px] bg-accent">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 3 3 21h5l4-9 4 9h5L12 3z" fill="#000" />
        </svg>
      </div>
      <h1 className="mt-6 text-[28px] font-black uppercase tracking-[0.18em] text-accent">
        Azkahps
      </h1>
      <p className="mt-1 text-[13px] font-medium tracking-[0.32em] text-fg-3 uppercase">Play</p>
      <div className="mt-10 h-1 w-36 overflow-hidden rounded-full bg-card">
        <div
          className="h-full w-1/2 rounded-full bg-accent"
          style={{ animation: 'splash-bar 1.4s ease-in-out infinite' }}
        />
      </div>
      <style>{`@keyframes splash-bar { 0% { transform: translateX(-120%);} 100% { transform: translateX(240%);} }`}</style>
    </div>
  );
}
