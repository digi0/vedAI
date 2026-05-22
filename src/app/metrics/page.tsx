import { SectionTitle } from "@/components/Card";
import MetricChart from "@/components/MetricChart";
import { metrics } from "@/lib/mock";

export default function Metrics() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Trends"
        title="Health metrics"
        action={
          <button className="rounded-md border border-[var(--color-border-strong)] bg-white px-3 py-1.5 text-sm">
            Log new reading
          </button>
        }
      />
      <p className="max-w-2xl text-sm text-[var(--color-fg-muted)]">
        Logged readings over the last six months. Green band shows your healthy
        target range.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <MetricChart key={m.key} series={m} />
        ))}
      </div>
    </div>
  );
}
