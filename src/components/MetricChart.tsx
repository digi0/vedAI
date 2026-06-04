"use client";

import { useEffect, useState } from "react";
import type { MetricSeries } from "@/lib/types";
import {
  latestValue,
  metricStatus,
  STATUS_LABEL,
  STATUS_COLOR,
  STATUS_SOFT,
} from "@/lib/metric-status";

/**
 * Minimal metric card: value + a one-word status chip, and a slim bar with
 * the healthy zone softly tinted and a single dot for where you sit. No
 * LOW/NORMAL/HIGH labels, no axis numbers — calm and glanceable.
 */
export default function MetricChart({ series }: { series: MetricSeries }) {
  const v = latestValue(series);
  const animated = useCountUp(v ?? 0); // hook stays unconditional

  if (v === null) return <EmptyMetric series={series} />;

  const status = metricStatus(series);
  const color = STATUS_COLOR[status];
  const [lo, hi] = series.healthyRange ?? [v, v];

  // Position scale: pad around the healthy band, always include the value.
  const span = hi - lo || Math.abs(v) || 1;
  const pad = span * 0.5;
  const min = Math.min(lo - pad, v - span * 0.15);
  const max = Math.max(hi + pad, v + span * 0.15);
  const pct = (x: number) =>
    Math.max(0, Math.min(100, ((x - min) / (max - min || 1)) * 100));

  const trend =
    series.points.length > 1 ? v - series.points[0]!.value : null;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm text-[var(--color-fg-muted)]">
            {series.label}
          </div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="font-display text-2xl tabular-nums">{fmt(animated)}</span>
            <span className="text-xs text-[var(--color-fg-muted)]">{series.unit}</span>
          </div>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ color, backgroundColor: STATUS_SOFT[status] }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Slim range bar: track · healthy zone · your dot */}
      <div className="relative mt-3.5 h-1.5 rounded-full bg-[var(--color-surface-2)]">
        {series.healthyRange && (
          <div
            className="absolute inset-y-0 rounded-full bg-[var(--color-ok-soft)]"
            style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
          />
        )}
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--color-surface)]"
          style={{ left: `${pct(v)}%`, backgroundColor: color }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-fg-dim)]">
        <span>
          {series.healthyRange ? `Normal ${fmt(lo)}–${fmt(hi)}` : " "}
        </span>
        {trend !== null && Math.abs(trend) > 1e-9 && (
          <span title="change since first reading">
            {trend > 0 ? "↑" : "↓"} {fmt(Math.abs(trend))}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyMetric({ series }: { series: MetricSeries }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="text-sm text-[var(--color-fg-muted)]">{series.label}</div>
      <div className="mt-0.5 font-display text-2xl text-[var(--color-fg-dim)]">—</div>
      <div className="mt-3 h-1.5 rounded-full bg-[var(--color-surface-2)]" />
      <div className="mt-2 text-xs text-[var(--color-fg-dim)]">
        {series.healthyRange
          ? `Normal ${fmt(series.healthyRange[0])}–${fmt(series.healthyRange[1])} ${series.unit}`
          : "No readings yet"}
      </div>
    </div>
  );
}

function useCountUp(target: number, ms = 700): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    let t0 = 0;
    const ease = (k: number) => 1 - Math.pow(1 - k, 3);
    const tick = (t: number) => {
      if (!t0) t0 = t;
      const k = Math.min(1, (t - t0) / ms);
      setV(target * ease(k));
      if (k < 1) raf = requestAnimationFrame(tick);
      else setV(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function fmt(v: number): string {
  if (Number.isInteger(v)) return v.toString();
  return v < 1 ? v.toFixed(2) : v.toFixed(1);
}
