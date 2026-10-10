// Anime - tab Anime: update, ongoing, movie, dan jadwal rilis + shortcut genre.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarDays, RotateCcw } from 'lucide-react';
import { animeApi, animeToTitle } from '../lib/api';
import type { AnimeListItemRaw, ScheduleItemRaw } from '../lib/types';
import { useAsync } from '../lib/hooks';
import TopBar from '../components/TopBar';
import TitleCard from '../components/TitleCard';
import { SkeletonGrid } from '../components/Skeleton';

type Tab = 'update' | 'ongoing' | 'movie' | 'schedule';

const TABS: { key: Tab; label: string }[] = [
  { key: 'update', label: 'Update' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'movie', label: 'Movie' },
  { key: 'schedule', label: 'Jadwal' },
];

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** 0 = Senin, mengikuti DAY_ORDER. */
function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

/** Urutkan hari dengan hari ini di depan; kembalikan urutan API jika format tak dikenal. */
function sortDays(days: string[]): string[] {
  if (days.some((d) => !DAY_ORDER.includes(d))) return days;
  const today = todayIndex();
  return [...days].sort(
    (a, b) =>
      ((DAY_ORDER.indexOf(a) - today + 7) % 7) - ((DAY_ORDER.indexOf(b) - today + 7) % 7),
  );
}

function dayLabel(day: string): string {
  const idx = DAY_ORDER.indexOf(day);
  if (idx < 0) return day;
  const today = todayIndex();
  if (idx === today) return `${day} - Hari ini`;
  if (idx === (today + 1) % 7) return `${day} - Besok`;
  return day;
}

export default function Anime() {
  const [tab, setTab] = useState<Tab>('update');

  const res = useAsync<AnimeListItemRaw[]>(() => {
    if (tab === 'update') return animeApi.home();
    if (tab === 'ongoing') return animeApi.ongoing();
    if (tab === 'movie') return animeApi.movies();
    return animeApi.schedule();
  }, [tab]);

  const genres = useAsync(() => animeApi.genres(), []);

  const scheduleGroups = useMemo(() => {
    if (tab !== 'schedule' || !res.data) return [];
    const map = new Map<string, ScheduleItemRaw[]>();
    for (const item of res.data as ScheduleItemRaw[]) {
      const day = item.day || 'Lainnya';
      const bucket = map.get(day);
      if (bucket) bucket.push(item);
      else map.set(day, [item]);
    }
    return sortDays([...map.keys()]).map((day) => ({ day, items: map.get(day) || [] }));
  }, [tab, res.data]);

  return (
    <div className="pt-[max(env(safe-area-inset-top),12px)]">
      <TopBar eyebrow="Katalog" title="Anime" />

      {/* Segments */}
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pressable shrink-0 rounded-full px-4 py-2 text-[13px] font-bold ring-1 ${
              tab === t.key ? 'bg-accent text-black ring-accent' : 'bg-card text-fg-2 ring-line'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Genre chips (dari API anime) */}
      {(genres.data || []).length > 0 && (
        <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto px-4 pb-1">
          {(genres.data || []).slice(0, 18).map((g) => (
            <Link
              key={g.slug}
              to={`/genre/anime/${g.slug}`}
              className="pressable shrink-0 rounded-full bg-card-2 px-3 py-1.5 text-[11.5px] font-medium text-fg-2 ring-1 ring-line"
            >
              {g.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4">
        {res.loading ? (
          <SkeletonGrid count={9} />
        ) : res.error ? (
          <ErrorState message={res.error} onRetry={res.reload} />
        ) : tab === 'schedule' ? (
          scheduleGroups.length === 0 ? (
            <EmptyNote text="Jadwal rilis belum tersedia." />
          ) : (
            <div className="space-y-5 px-4">
              {scheduleGroups.map((group) => (
                <section key={group.day}>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={14} className="text-accent" />
                    <h2 className="text-[13px] font-bold uppercase tracking-wider text-fg-2">
                      {dayLabel(group.day)}
                    </h2>
                    <span className="text-[11px] text-fg-3">{group.items.length}</span>
                  </div>
                  <div className="mt-2.5 space-y-2">
                    {group.items.map((a) => (
                      <Link
                        key={`${group.day}-${a.id}`}
                        to={`/anime/${a.id}/${a.slug}`}
                        className="pressable flex items-center gap-3 rounded-2xl bg-card p-2.5 ring-1 ring-line"
                      >
                        <div className="h-[62px] w-[45px] shrink-0 overflow-hidden rounded-[10px] bg-card-2">
                          {a.poster && (
                            <img
                              src={a.poster}
                              alt={a.title}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="clamp-2 text-[13px] font-semibold leading-snug text-fg">
                            {a.title}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-fg-3">
                            {a.airtime && <span className="font-bold text-accent">{a.airtime}</span>}
                            {a.nextEpisode != null && <span>Ep {a.nextEpisode}</span>}
                            {a.type && <span>{a.type}</span>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        ) : (res.data || []).length === 0 ? (
          <EmptyNote text="Belum ada anime di kategori ini." />
        ) : (
          <div className="grid grid-cols-3 gap-3 px-4">
            {(res.data || []).map((a) => (
              <TitleCard key={a.id} item={animeToTitle(a)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-4 flex flex-col items-center gap-3 rounded-[20px] bg-card p-6 text-center ring-1 ring-line">
      <AlertTriangle size={26} className="text-accent" />
      <p className="text-[13px] font-medium leading-relaxed text-fg-2">{message}</p>
      <button
        onClick={onRetry}
        className="pressable flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-[13px] font-bold text-black"
      >
        <RotateCcw size={15} /> Coba lagi
      </button>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="px-4 py-10 text-center text-[13px] text-fg-3">{text}</p>;
}
