import { cn } from "@/lib/utils";

/**
 * The Radiocom mark: a red source dot, two grey signal arcs sweeping over it,
 * and a dark base arc. Drawn inline so it stays sharp at any size and so the
 * base arc can follow the text colour in dark mode.
 *
 * To swap in the official artwork, replace `public/radiocom-logo.svg` and
 * point this component at it — the geometry below is a faithful rebuild, not
 * the original vector file.
 */
export function RadiocomMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 128"
      className={cn("h-7 w-7", className)}
      role="img"
      aria-label="Radiocom"
      fill="none"
    >
      {/* Dark base arc — follows text colour so it inverts in dark mode. */}
      <path
        d="M 8.03 64.25 A 50 50 0 0 0 83.00 109.30 L 68.50 84.19 A 21 21 0 0 1 37.01 65.27 Z"
        fill="currentColor"
      />
      {/* Signal arcs. */}
      <path
        d="M 8.19 61.64 A 50 50 0 0 1 107.24 57.32"
        stroke="#b0b0b0"
        strokeWidth="11"
        strokeLinecap="butt"
      />
      <path
        d="M 26.12 63.21 A 32 32 0 0 1 89.51 60.44"
        stroke="#b0b0b0"
        strokeWidth="11"
        strokeLinecap="butt"
      />
      {/* Source. */}
      <circle cx="58" cy="66" r="16" fill="#e30613" />
    </svg>
  );
}

export function RadiocomWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-[1.3rem] font-extrabold italic leading-none tracking-[-0.03em]",
        className,
      )}
    >
      RADIOCOM
    </span>
  );
}

export function RadiocomLogo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <RadiocomMark className="h-8 w-8 shrink-0" />
      <RadiocomWordmark />
    </span>
  );
}
