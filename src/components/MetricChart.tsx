import type { MetricSeries } from "@/lib/types";

/**
 * Range-anchored metric chart (SVG).
 *
 *  ┌─ HbA1c ─────────────────────── 5.9 % · 🔴 high ──┐
 *  │                                                  │
 *  │   LOW    ░░░ healthy ░░░    HIGH                │
 *  │   ┌─────┬───────────────┬─────────┐              │
 *  │   │     │░░░░░░░░░░░░░░░│       ● │  ← you      │
 *  │   └─────┴───────────────┴─────────┘              │
 *  │  2.8   4.0             5.7      7.0              │
 *  └──────────────────────────────────────────────────┘
 *
 *  If 2+ readings exist, a small trend sparkline appears below.
 */
export default function MetricChart({ series }: { series: MetricSeries }) {
  if (series.points.length === 0) return <EmptyMetric series={series} />;

  const last = series.points[series.points.length - 1]!;
  const lastValue = last.value;

  const [healthyLo, healthyHi] = series.healthyRange ?? [
    Math.min(...series.points.map((p) => p.value)),
    Math.max(...series.points.map((p) => p.value)),
  ];
  const allValues = series.points.map((p) => p.value);
  const bandSpan = healthyHi - healthyLo || 1;
  const pad = bandSpan * 0.45;
  const scaleMin = Math.min(healthyLo - pad, Math.min(...allValues) - bandSpan * 0.1);
  const scaleMax = Math.max(healthyHi + pad, Math.max(...allValues) + bandSpan * 0.1);
  const scaleSpan = scaleMax - scaleMin || 1;

  const inRange = lastValue >= healthyLo && lastValue <= healthyHi;
  const above = lastValue > healthyHi;
  const flag = inRange ? "in range" : above ? "high" : "low";
  const flagColor = inRange
    ? "var(--color-ok)"
    : above
      ? "var(--color-alert)"
      : "var(--color-warn)";
  const flagBg = inRange
    ? "var(--color-ok-soft)"
    : above
      ? "var(--color-alert-soft)"
      : "var(--color-warn-soft)";

  // SVG geometry
  const W = 320;
  const H = 100;
  const padX = 16;
  const trackY = 50;
  const trackH = 20;
  const x = (v: number) =>
    padX + ((v - scaleMin) / scaleSpan) * (W - padX * 2);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-[var(--color-fg-dim)]">{series.label}</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold">{fmt(lastValue)}</span>
            <span className="text-xs text-[var(--color-fg-muted)]">{series.unit}</span>
          </div>
          <div className="mt-0.5 text-xs text-[var(--color-fg-dim)]">
            {new Date(last.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ color: flagColor, backgroundColor: flagBg }}
        >
          {flag}
        </span>
      </div>

      {/* The chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
        {/* Zone labels above the track */}
        <text
          x={x(scaleMin) + 4}
          y={trackY - 8}
          fontSize={9}
          fill="var(--color-warn)"
          fontWeight={500}
        >
          LOW
        </text>
        <text
          x={(x(healthyLo) + x(healthyHi)) / 2}
          y={trackY - 8}
          fontSize={9}
          fill="var(--color-ok)"
          fontWeight={500}
          textAnchor="middle"
        >
          NORMAL
        </text>
        <text
          x={x(scaleMax) - 4}
          y={trackY - 8}
          fontSize={9}
          fill="var(--color-alert)"
          fontWeight={500}
          textAnchor="end"
        >
          HIGH
        </text>

        {/* Track baseline (full width) */}
        <rect
          x={padX}
          y={trackY}
          width={W - padX * 2}
          height={trackH}
          rx={4}
          fill="var(--color-surface-2)"
          stroke="var(--color-border)"
        />
        {/* Healthy band */}
        <rect
          x={x(healthyLo)}
          y={trackY}
          width={x(healthyHi) - x(healthyLo)}
          height={trackH}
          rx={4}
          fill="var(--color-brand-soft)"
        />

        {/* Boundary tick lines */}
        <line
          x1={x(healthyLo)}
          y1={trackY - 2}
          x2={x(healthyLo)}
          y2={trackY + trackH + 2}
          stroke="var(--color-brand)"
          strokeWidth={1.5}
        />
        <line
          x1={x(healthyHi)}
          y1={trackY - 2}
          x2={x(healthyHi)}
          y2={trackY + trackH + 2}
          stroke="var(--color-brand)"
          strokeWidth={1.5}
        />

        {/* Axis labels */}
        <text
          x={x(scaleMin)}
          y={trackY + trackH + 14}
          fontSize={10}
          fill="var(--color-fg-dim)"
          textAnchor="middle"
        >
          {fmt(scaleMin)}
        </text>
        <text
          x={x(healthyLo)}
          y={trackY + trackH + 14}
          fontSize={10}
          fill="var(--color-brand)"
          fontWeight={500}
          textAnchor="middle"
        >
          {fmt(healthyLo)}
        </text>
        <text
          x={x(healthyHi)}
          y={trackY + trackH + 14}
          fontSize={10}
          fill="var(--color-brand)"
          fontWeight={500}
          textAnchor="middle"
        >
          {fmt(healthyHi)}
        </text>
        <text
          x={x(scaleMax)}
          y={trackY + trackH + 14}
          fontSize={10}
          fill="var(--color-fg-dim)"
          textAnchor="middle"
        >
          {fmt(scaleMax)}
        </text>

        {/* Latest value marker */}
        <g>
          {/* Drop line */}
          <line
            x1={x(lastValue)}
            y1={trackY - 6}
            x2={x(lastValue)}
            y2={trackY + trackH + 6}
            stroke={flagColor}
            strokeWidth={2}
          />
          {/* Dot */}
          <circle
            cx={x(lastValue)}
            cy={trackY + trackH / 2}
            r={6}
            fill={flagColor}
            stroke="white"
            strokeWidth={2}
          />
          {/* Value label below */}
          <text
            x={x(lastValue)}
            y={H - 4}
            fontSize={11}
            fill={flagColor}
            fontWeight={600}
            textAnchor="middle"
          >
            you · {fmt(lastValue)}
          </text>
        </g>
      </svg>

      {series.points.length > 1 && (
        <Sparkline series={series} healthyLo={healthyLo} healthyHi={healthyHi} />
      )}
    </div>
  );
}

function Sparkline({
  series,
  healthyLo,
  healthyHi,
}: {
  series: MetricSeries;
  healthyLo: number;
  healthyHi: number;
}) {
  const w = 320;
  const h = 38;
  const pad = 4;
  const values = series.points.map((p) => p.value);
  const sMin = Math.min(...values, healthyLo);
  const sMax = Math.max(...values, healthyHi);
  const range = sMax - sMin || 1;
  const x = (i: number) =>
    pad + (i * (w - pad * 2)) / Math.max(series.points.length - 1, 1);
  const y = (v: number) => h - pad - ((v - sMin) / range) * (h - pad * 2);
  const path = series.points
    .map((p, i) =>
      `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`,
    )
    .join(" ");
  return (
    <div className="mt-4 border-t border-[var(--color-border)] pt-2">
      <div className="mb-0.5 text-[10px] uppercase tracking-wider text-[var(--color-fg-dim)]">
        Trend · {series.points.length} readings
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full">
        <rect
          x={0}
          y={y(healthyHi)}
          width={w}
          height={Math.max(y(healthyLo) - y(healthyHi), 0)}
          fill="var(--color-brand-soft)"
        />
        <path
          d={path}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {series.points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={2} fill="var(--color-brand)" />
        ))}
      </svg>
    </div>
  );
}

function EmptyMetric({ series }: { series: MetricSeries }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="text-xs text-[var(--color-fg-dim)]">{series.label}</div>
      <div className="mt-1 text-sm text-[var(--color-fg-muted)]">No readings yet</div>
      {series.healthyRange && (
        <div className="mt-2 text-xs text-[var(--color-fg-dim)]">
          Healthy: {fmt(series.healthyRange[0])}–{fmt(series.healthyRange[1])} {series.unit}
        </div>
      )}
    </div>
  );
}

function fmt(v: number): string {
  if (Number.isInteger(v)) return v.toString();
  return v < 1 ? v.toFixed(2) : v.toFixed(1);
}
