import { SectionTitle } from "@/components/Card";
import MetricChart from "@/components/MetricChart";
import LogMetricForm from "@/components/LogMetricForm";
import { listMetrics } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Metrics() {
  const metrics = await listMetrics();

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Trends"
        title="Health metrics"
        action={<LogMetricForm />}
      />
      <p className="max-w-2xl text-sm text-[var(--color-fg-muted)]">
        Logged readings over time. Green band shows your healthy target range.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <MetricChart key={m.key} series={m} />
        ))}
      </div>
    </div>
  );
}
