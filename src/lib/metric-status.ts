import type { MetricSeries } from "./types";

export type MetricStatus = "none" | "in" | "low" | "high";

export function latestValue(s: MetricSeries): number | null {
  return s.points.length ? s.points[s.points.length - 1]!.value : null;
}

export function metricStatus(s: MetricSeries): MetricStatus {
  const v = latestValue(s);
  if (v === null || !s.healthyRange) return "none";
  const [lo, hi] = s.healthyRange;
  if (v < lo) return "low";
  if (v > hi) return "high";
  return "in";
}

export function isAttention(s: MetricSeries): boolean {
  const st = metricStatus(s);
  return st === "low" || st === "high";
}

export const STATUS_LABEL: Record<MetricStatus, string> = {
  none: "No data",
  in: "In range",
  low: "Low",
  high: "High",
};

export const STATUS_COLOR: Record<MetricStatus, string> = {
  none: "var(--color-fg-dim)",
  in: "var(--color-ok)",
  low: "var(--color-warn)",
  high: "var(--color-alert)",
};

export const STATUS_SOFT: Record<MetricStatus, string> = {
  none: "var(--color-surface-2)",
  in: "var(--color-ok-soft)",
  low: "var(--color-warn-soft)",
  high: "var(--color-alert-soft)",
};
