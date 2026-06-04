import { SectionTitle } from "@/components/Card";
import MetricChart from "@/components/MetricChart";
import LogMetricForm from "@/components/LogMetricForm";
import { listMetrics } from "@/lib/db";
import { isAttention, latestValue } from "@/lib/metric-status";
import type { MetricCategory, MetricSeries } from "@/lib/types";
import { TriangleAlert } from "lucide-react";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER: MetricCategory[] = [
  "Vitals",
  "Cholesterol",
  "Liver",
  "Kidney",
  "Thyroid",
  "Vitamins",
];

export default async function Metrics() {
  const metrics = await listMetrics();

  const withData = metrics.filter((m) => latestValue(m) !== null);
  const attention = withData.filter(isAttention);

  // Everything that has data, grouped by category (attention items still
  // appear in their category too — the top section is a shortcut, not a move).
  const byCategory = new Map<MetricCategory, MetricSeries[]>();
  for (const m of metrics) {
    const arr = byCategory.get(m.category) ?? [];
    arr.push(m);
    byCategory.set(m.category, arr);
  }

  const hasAny = withData.length > 0;

  return (
    <div className="space-y-10">
      <SectionTitle eyebrow="Trends" title="Health metrics" action={<LogMetricForm />} />

      {!hasAny && (
        <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] p-10 text-center text-[var(--color-fg-muted)]">
          No readings yet. Upload a lab report or log a reading to start tracking.
        </div>
      )}

      {attention.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <TriangleAlert size={16} className="text-[var(--color-alert)]" />
            <h2 className="font-display text-xl">Needs attention</h2>
            <span className="rounded-full bg-[var(--color-alert-soft)] px-2 py-0.5 text-xs font-medium text-[var(--color-alert)]">
              {attention.length}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {attention.map((m) => (
              <MetricChart key={`att-${m.key}`} series={m} />
            ))}
          </div>
        </section>
      )}

      {CATEGORY_ORDER.map((cat) => {
        const items = byCategory.get(cat);
        if (!items || items.length === 0) return null;
        // Skip categories where nothing has data AND it's not Vitals (keep
        // Vitals visible as the place to log BP/weight/etc).
        const anyData = items.some((m) => latestValue(m) !== null);
        if (!anyData && cat !== "Vitals") return null;
        return (
          <section key={cat}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)]">
              {cat}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => (
                <MetricChart key={m.key} series={m} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
