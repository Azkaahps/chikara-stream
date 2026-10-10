// Floating pill bottom navigation (AniBiPlay style)

import { NavLink } from 'react-router-dom';
import { Home, Clapperboard, Tv, Search, Bookmark } from 'lucide-react';

const TABS = [
  { to: '/', label: 'Beranda', icon: Home },
  { to: '/movies', label: 'Film', icon: Clapperboard },
  { to: '/anime', label: 'Anime', icon: Tv },
  { to: '/search', label: 'Cari', icon: Search },
  { to: '/library', label: 'Simpan', icon: Bookmark },
];

export default function TabBar() {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="pointer-events-auto mx-4 flex w-full max-w-[480px] items-center justify-around rounded-[26px] bg-[#0a0a0b] px-2 py-2 ring-1 ring-line">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `pressable flex w-[62px] flex-col items-center gap-1 rounded-2xl py-1.5 ${
                isActive ? 'text-accent' : 'text-[#8a8a8a]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8} />
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
