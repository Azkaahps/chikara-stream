// Splash - brand loading gate for Chikara Stream.
// Prefetches the home feeds while showing real progress, then hands off
// to the app shell (feeds are cached, so Home paints instantly).

import { useEffect, useRef, useState } from 'react';
import { prefetch } from '../lib/api';
import { LogoMark } from '../components/Logo';

const MIN_SHOW_MS = 1900;
const HARD_CAP_MS = 6000;

export default function Splash({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    let alive = true;
    doneRef.current = false;
    const startedAt = Date.now();

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      const wait = Math.max(0, MIN_SHOW_MS - (Date.now() - startedAt));
      window.setTimeout(() => {
        if (alive) onDone();
      }, wait);
    };

    // never trap the user on the splash, even on a dead connection
    const cap = window.setTimeout(finish, HARD_CAP_MS);

    const tasks = [prefetch.home(), prefetch.movieHome(), prefetch.animeMovies()];
    let settled = 0;

    Promise.allSettled(
      tasks.map((p) =>
        p.finally(() => {
          settled += 1;
          if (alive) setProgress(Math.round((settled / tasks.length) * 100));
        }),
      ),
    ).then(() => {
      window.clearTimeout(cap);
      finish();
    });

    return () => {
      alive = false;
      window.clearTimeout(cap);
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <div className="glow-pulse grid h-24 w-24 place-items-center rounded-[30px] bg-accent text-black">
        <LogoMark size={54} />
      </div>

      <h1 className="mt-7 text-[30px] font-black uppercase leading-none tracking-[0.14em] text-accent">
        Chikara
      </h1>
      <p className="mt-2 text-[12.5px] font-semibold uppercase tracking-[0.44em] text-fg-3">
        Stream
      </p>

      <div className="mt-10 h-1.5 w-44 overflow-hidden rounded-full bg-card">
        <div
          className="h-full w-full origin-left rounded-full bg-accent transition-transform duration-300 ease-out"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>
      <p className="mt-3 text-[11px] tracking-wide text-fg-3">
        {progress < 100 ? 'Menyiapkan tontonan...' : 'Siap!'}
      </p>
    </div>
  );
}
