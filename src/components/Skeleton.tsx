// Skeleton loaders - shimmer placeholders matching layout shapes.

export function SkeletonCard({ variant = 'grid' }: { variant?: 'rail' | 'grid' }) {
  return (
    <div className={variant === 'rail' ? 'w-[124px] shrink-0' : 'w-full'}>
      <div className="shimmer aspect-[2/3] rounded-[14px]" />
      <div className="shimmer mt-1.5 h-3 w-4/5 rounded" />
      <div className="shimmer mt-1 h-2.5 w-1/2 rounded" />
    </div>
  );
}

export function SkeletonRail({ count = 5 }: { count?: number }) {
  return (
    <section className="mt-6">
      <div className="px-4">
        <div className="shimmer h-3 w-24 rounded" />
        <div className="shimmer mt-2 h-5 w-40 rounded" />
      </div>
      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} variant="rail" />
        ))}
      </div>
    </section>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="px-4">
      <div className="shimmer h-[210px] w-full rounded-[20px]" />
      <div className="mt-3 flex gap-2">
        <div className="shimmer h-3 w-3 rounded-full" />
        <div className="shimmer h-3 w-8 rounded-full" />
        <div className="shimmer h-3 w-3 rounded-full" />
      </div>
    </div>
  );
}
