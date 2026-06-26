import { ReactNode } from "react";

export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 ${
        interactive ? "card-interactive cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">
            {eyebrow}
          </div>
        )}
        <h2 className="font-display text-2xl sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

type BadgeTone = "neutral" | "ok" | "warn" | "alert" | "brand";

export function Badge({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const map: Record<BadgeTone, string> = {
    neutral: "bg-[var(--color-surface-2)] text-[var(--color-fg-muted)]",
    ok: "bg-[var(--color-ok-soft)] text-[var(--color-ok)]",
    warn: "bg-[var(--color-warn-soft)] text-[var(--color-warn)]",
    alert: "bg-[var(--color-alert-soft)] text-[var(--color-alert)]",
    brand: "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${map[tone]}`}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {children}
    </span>
  );
}
