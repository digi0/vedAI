import { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 ${className}`}
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
    <div className="mb-4 flex items-end justify-between gap-4">
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

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "ok" | "warn" | "alert" | "brand";
  children: ReactNode;
}) {
  const map: Record<string, string> = {
    neutral: "bg-[var(--color-surface-2)] text-[var(--color-fg-muted)]",
    ok: "bg-[var(--color-ok-soft)] text-[var(--color-ok)]",
    warn: "bg-[var(--color-warn-soft)] text-[var(--color-warn)]",
    alert: "bg-[var(--color-alert-soft)] text-[var(--color-alert)]",
    brand: "bg-[var(--color-brand-soft)] text-[var(--color-brand)]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}
