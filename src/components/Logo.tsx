// Chikara Stream - brand mark.
// Letter "C" drawn as a single SVG stroke arc (gap on the right).
// - LogoMark: bare C, inherits currentColor.
// - LogoBox:  C inside the yellow rounded tile used across the app.

interface MarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 24, className = '' }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M35.5 16a14 14 0 1 0 0 16"
        stroke="currentColor"
        strokeWidth="7.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoBox({ size = 44, className = '' }: MarkProps) {
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-2xl bg-accent text-black ${className}`}
      style={{ width: size, height: size }}
    >
      <LogoMark size={Math.round(size * 0.58)} />
    </div>
  );
}

export default LogoMark;
