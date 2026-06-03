import Link from "next/link";
import { FileText, Activity, TriangleAlert, ChevronRight } from "lucide-react";
import ProgressRing from "@/components/ProgressRing";

/**
 * Overview hero: a health-ring summarizing how many tracked markers sit in
 * their healthy range, plus glanceable, tappable stat rows.
 */
export default function HealthSummary({
  inRange,
  tracked,
  records,
  alerts,
}: {
  inRange: number;
  tracked: number;
  records: number;
  alerts: number;
}) {
  const pct = tracked > 0 ? inRange / tracked : 0;
  const pctLabel = tracked > 0 ? Math.round(pct * 100) : 0;

  return (
    <section className="fade-up overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
        <Link href="/metrics" className="shrink-0" aria-label="View metrics">
          <ProgressRing value={pct} size={148} stroke={14}>
            <span className="font-display text-4xl leading-none">{pctLabel}%</span>
            <span className="mt-1 text-[11px] uppercase tracking-wider text-[var(--color-fg-dim)]">
              in range
            </span>
          </ProgressRing>
        </Link>

        <div className="w-full flex-1">
          <h2 className="font-display text-xl">
            {tracked === 0
              ? "No readings yet"
              : pct >= 0.8
                ? "Looking healthy"
                : pct >= 0.5
                  ? "A few things to watch"
                  : "Needs attention"}
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-fg-muted)]">
            {tracked === 0
              ? "Upload a lab report to start tracking your markers."
              : `${inRange} of ${tracked} tracked markers are in a healthy range.`}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2">
            <StatRow
              href="/metrics"
              icon={<Activity size={18} />}
              label="Markers in range"
              value={`${inRange}/${tracked}`}
              tone="brand"
            />
            <StatRow
              href="/records"
              icon={<FileText size={18} />}
              label="Records on file"
              value={String(records)}
            />
            <StatRow
              href="/insights"
              icon={<TriangleAlert size={18} />}
              label={alerts === 1 ? "Insight to review" : "Insights to review"}
              value={String(alerts)}
              tone={alerts > 0 ? "alert" : undefined}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatRow({
  href,
  icon,
  label,
  value,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "brand" | "alert";
}) {
  const accent =
    tone === "brand"
      ? "text-[var(--color-brand)]"
      : tone === "alert"
        ? "text-[var(--color-alert)]"
        : "text-[var(--color-fg-muted)]";
  return (
    <Link
      href={href}
      className="card-interactive flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3"
    >
      <span className={accent}>{icon}</span>
      <span className="flex-1 text-sm text-[var(--color-fg)]">{label}</span>
      <span className="font-display text-lg">{value}</span>
      <ChevronRight size={16} className="text-[var(--color-fg-dim)]" />
    </Link>
  );
}
