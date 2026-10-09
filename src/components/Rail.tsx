import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface Props {
  eyebrow?: string;
  title: string;
  /** optional "see all" target */
  more?: string;
  children: ReactNode;
}

/** Horizontal scrolling rail section (AniBiPlay rail pattern). */
export default function Rail({ eyebrow, title, more, children }: Props) {
  return (
    <section className="mt-6">
      <div className="flex items-end justify-between px-4">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 className="mt-0.5 text-[19px] font-bold tracking-tight text-fg">{title}</h2>
        </div>
        {more && (
          <Link
            to={more}
            className="pressable flex items-center gap-0.5 text-[12px] font-medium text-fg-3"
          >
            Semua <ChevronRight size={14} />
          </Link>
        )}
      </div>
      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">{children}</div>
    </section>
  );
}
