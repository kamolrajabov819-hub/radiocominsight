import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A hairline-framed content block. The frame is the only chrome. */
export function Panel({
  children,
  className,
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section className={cn("border border-border bg-surface", !flush && "p-4 sm:p-5", className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  hint,
  actions,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-[0.9375rem] font-bold leading-tight">{title}</h2>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Page-level heading with the red rule that runs through the whole product. */
export function SectionRule({ label, note }: { label: string; note?: string }) {
  return (
    <div className="mb-4 mt-8 flex items-baseline gap-3 border-b border-rule pb-2 first:mt-0">
      <span className="h-2.5 w-2.5 shrink-0 bg-primary" aria-hidden />
      <span className="eyebrow text-foreground">{label}</span>
      {note && <span className="truncate text-xs text-muted-foreground">{note}</span>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="hatched grid min-h-32 place-items-center border border-dashed border-border p-6">
      <p className="max-w-sm bg-surface px-3 py-1.5 text-center text-xs text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 border-l-2 border-rule pl-2.5 text-[0.6875rem] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}
