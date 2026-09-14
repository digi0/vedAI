import { describe, it, expect } from "vitest";
import type { MetricSeries } from "../types";
import { latestValue, metricStatus, isAttention } from "../metric-status";

const series = (
  points: { date: string; value: number }[],
  healthyRange?: [number, number],
): MetricSeries =>
  ({
    key: "ldl",
    label: "LDL Cholesterol",
    unit: "mg/dL",
    healthyRange,
    category: "Cholesterol",
    points,
  }) as MetricSeries;

const at = (date: string, value: number) => ({ date, value });

describe("latestValue", () => {
  it("returns null when nothing has been recorded", () => {
    expect(latestValue(series([]))).toBeNull();
  });

  it("returns the last point, which listMetrics orders oldest-first", () => {
    expect(
      latestValue(
        series([at("2025-01-01", 150), at("2025-06-01", 130), at("2025-11-01", 98)]),
      ),
    ).toBe(98);
  });
});

describe("metricStatus", () => {
  const range: [number, number] = [0, 100];

  it("is 'none' without data or without a healthy range", () => {
    expect(metricStatus(series([], range))).toBe("none");
    expect(metricStatus(series([at("2025-11-01", 98)]))).toBe("none");
  });

  it("is 'in' inside the range and on both boundaries", () => {
    expect(metricStatus(series([at("2025-11-01", 50)], range))).toBe("in");
    expect(metricStatus(series([at("2025-11-01", 0)], range))).toBe("in");
    expect(metricStatus(series([at("2025-11-01", 100)], range))).toBe("in");
  });

  it("flags values outside the range", () => {
    expect(metricStatus(series([at("2025-11-01", 138)], range))).toBe("high");
    expect(metricStatus(series([at("2025-11-01", -1)], range))).toBe("low");
  });

  it("judges the latest reading, not the worst one", () => {
    expect(
      metricStatus(series([at("2025-01-01", 180), at("2025-11-01", 90)], range)),
    ).toBe("in");
  });
});

describe("isAttention", () => {
  const range: [number, number] = [0, 100];

  it("is true only for out-of-range readings", () => {
    expect(isAttention(series([at("2025-11-01", 138)], range))).toBe(true);
    expect(isAttention(series([at("2025-11-01", -1)], range))).toBe(true);
    expect(isAttention(series([at("2025-11-01", 50)], range))).toBe(false);
    expect(isAttention(series([], range))).toBe(false);
  });
});
