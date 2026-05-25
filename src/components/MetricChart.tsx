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

  const areaPath = `${path} L ${x(series.points.length - 1).toFixed(1)} ${h - pad} L ${pad} ${h - pad} Z`;
  const gradId = `area-${series.key}`;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_1px_2px_rgba(15,23,32,0.03),0_1px_3px_rgba(15,23,32,0.04)]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-[var(--color-fg-dim)]">{series.label}</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="font-display text-3xl">{last}</span>
            <span className="text-xs text-[var(--color-fg-muted)]">
              {series.unit}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              inRange
                ? "bg-[var(--color-ok-soft)] text-[var(--color-ok)]"
                : "bg-[var(--color-warn-soft)] text-[var(--color-warn)]"
            }`}
          >
            {inRange ? "✓ in range" : "⚠ out of range"}
          </div>
          <div className="mt-1 text-xs text-[var(--color-fg-dim)]">
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)} since Dec
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {series.healthyRange && (
          <rect
            x={0}
            y={y(series.healthyRange[1])}
            width={w}
            height={Math.max(y(series.healthyRange[0]) - y(series.healthyRange[1]), 0)}
            fill="var(--color-brand-tint)"
          />
        )}
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={path}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="draw-line"
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
