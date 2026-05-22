import type { MetricSeries } from "@/lib/types";

export default function MetricChart({ series }: { series: MetricSeries }) {
  const w = 320;
  const h = 80;
  const pad = 6;

  const values = series.points.map((p) => p.value);
  const min = Math.min(...values, series.healthyRange?.[0] ?? Infinity);
  const max = Math.max(...values, series.healthyRange?.[1] ?? -Infinity);
  const range = max - min || 1;

  const x = (i: number) =>
    pad + (i * (w - pad * 2)) / Math.max(series.points.length - 1, 1);
  const y = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);

  const path = series.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(" ");

  const last = values[values.length - 1];
  const first = values[0];
  const delta = last - first;
  const inRange =
    series.healthyRange &&
    last >= series.healthyRange[0] &&
    last <= series.healthyRange[1];

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-[var(--color-fg-dim)]">{series.label}</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold">{last}</span>
            <span className="text-xs text-[var(--color-fg-muted)]">
              {series.unit}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`text-xs font-medium ${
              inRange
                ? "text-[var(--color-ok)]"
                : "text-[var(--color-warn)]"
            }`}
          >
            {inRange ? "in range" : "out of range"}
          </div>
          <div className="text-xs text-[var(--color-fg-dim)]">
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)} since Dec
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full">
        {series.healthyRange && (
          <rect
            x={0}
            y={y(series.healthyRange[1])}
            width={w}
            height={Math.max(y(series.healthyRange[0]) - y(series.healthyRange[1]), 0)}
            fill="var(--color-brand-soft)"
          />
        )}
        <path
          d={path}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {series.points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={2.5}
            fill="var(--color-brand)"
          />
        ))}
      </svg>
    </div>
  );
}
