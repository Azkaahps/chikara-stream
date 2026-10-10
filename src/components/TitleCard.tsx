// TitleCard - poster-first card used in grids and rails (AniBiPlay style)

import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { Title } from '../lib/types';

interface Props {
  item: Title;
  /** 'rail' = fixed-width card for horizontal rails; 'grid' = fills parent */
  variant?: 'rail' | 'grid';
  /** override link target (default: detail by kind) */
  to?: string;
}

export default function TitleCard({ item, variant = 'grid', to }: Props) {
  const href =
    to || (item.kind === 'anime' ? `/anime/${item.id}/${item.slug}` : `/movie/${item.slug}`);

  return (
    <Link
      to={href}
      className={`pressable group block ${variant === 'rail' ? 'w-[124px] shrink-0' : 'w-full'}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-[14px] bg-card ring-1 ring-line">
        {item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-fg-3 text-xs px-2 text-center">
            {item.title}
          </div>
        )}

        {/* top-left kind chip */}
        <div className="absolute left-1.5 top-1.5 flex gap-1">
          <span
            className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${
              item.kind === 'anime'
                ? 'bg-accent text-black'
                : item.kind === 'series'
                  ? 'bg-white/85 text-black'
                  : 'bg-black/70 text-accent ring-1 ring-accent/40'
            }`}
          >
            {item.kind === 'anime' ? 'Anime' : item.kind === 'series' ? 'Series' : 'Film'}
          </span>
        </div>

        {/* rating badge */}
        {item.rating != null && item.rating > 0 && (
          <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-md bg-black/75 px-1.5 py-0.5">
            <Star size={10} className="fill-accent text-accent" />
            <span className="text-[10.5px] font-semibold text-white">
              {item.rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* bottom meta strip */}
        {(item.episodeInfo || item.quality || item.year) && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pb-1.5 pt-5">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-fg-2">
              {item.episodeInfo && <span className="text-accent">{item.episodeInfo}</span>}
              {item.quality && <span>{item.quality}</span>}
              {item.year && <span>{item.year}</span>}
            </div>
          </div>
        )}
      </div>

      <p className="clamp-2 mt-1.5 text-[12.5px] font-semibold leading-snug text-fg">
        {item.title}
      </p>
    </Link>
  );
}
