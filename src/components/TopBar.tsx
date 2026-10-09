// TopBar — screen header. Optional back button; large title + eyebrow.

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface Props {
  eyebrow?: string;
  title: string;
  back?: boolean;
  right?: React.ReactNode;
  /** sticky translucent header (for detail screens) */
  floating?: boolean;
}

export default function TopBar({ eyebrow, title, back, right, floating }: Props) {
  const navigate = useNavigate();

  if (floating) {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
        {back ? (
          <button
            onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))}
            className="pressable pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-black/60 ring-1 ring-white/15 backdrop-blur-md"
            aria-label="Kembali"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <span />
        )}
        {right && <div className="pointer-events-auto">{right}</div>}
      </div>
    );
  }

  return (
    <header className="flex items-center justify-between px-4 pt-3">
      <div className="flex min-w-0 items-center gap-3">
        {back && (
          <button
            onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))}
            className="pressable grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card ring-1 ring-line"
            aria-label="Kembali"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="truncate text-[26px] font-bold tracking-tight text-fg">{title}</h1>
        </div>
      </div>
      {right}
    </header>
  );
}
