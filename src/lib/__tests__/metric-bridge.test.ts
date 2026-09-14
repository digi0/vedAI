import { describe, it, expect } from "vitest";
import type { LabValue } from "medical-parser";
import { bridgeLabValuesToMetrics } from "../metric-bridge";

const DATE = "2025-11-03";

/** Minimal LabValue; the bridge only reads `name` and `value`. */
const lab = (name: string, value: LabValue["value"]): LabValue =>
  ({ name, value }) as LabValue;

const keysOf = (labs: LabValue[], date = DATE) =>
  bridgeLabValuesToMetrics(labs, date).map((r) => r.key);

describe("bridgeLabValuesToMetrics", () => {
  it("maps the common lipid panel to metric keys", () => {
    expect(
      keysOf([
        lab("LDL Cholesterol", 138),
        lab("HDL Cholesterol", 52),
        lab("Triglycerides", 160),
        lab("Total Cholesterol", 210),
      ]),
    ).toEqual(["ldl", "hdl", "triglycerides", "total_chol"]);
  });

  it("carries the value and the record date onto each reading", () => {
    expect(bridgeLabValuesToMetrics([lab("HbA1c", 5.9)], DATE)).toEqual([
      { key: "hba1c", value: 5.9, takenAt: "2025-11-03T00:00:00.000Z" },
    ]);
  });

  it("recognises lab-sheet aliases for the same marker", () => {
    expect(keysOf([lab("SGPT (ALT)", 31)])).toEqual(["alt"]);
    expect(keysOf([lab("Aspartate Aminotransferase", 24)])).toEqual(["ast"]);
    expect(keysOf([lab("Thyroid Stimulating Hormone", 2.1)])).toEqual(["tsh"]);
    expect(keysOf([lab("Glycosylated Hemoglobin", 5.4)])).toEqual(["hba1c"]);
    expect(keysOf([lab("Vitamin B-12 (Cobalamin)", 410)])).toEqual([
      "vitamin_b12",
    ]);
  });

  it("skips ratio rows so they don't pollute the parent trend line", () => {
    expect(keysOf([lab("LDL/HDL Ratio", 2.6)])).toEqual([]);
    expect(keysOf([lab("Total Cholesterol/HDL Cholesterol", 4.1)])).toEqual([]);
  });

  it("skips qualitative values that aren't numbers", () => {
    expect(keysOf([lab("LDL Cholesterol", "<10" as never)])).toEqual([]);
    expect(keysOf([lab("HDL Cholesterol", NaN)])).toEqual([]);
  });

  it("skips markers it has no mapping for", () => {
    expect(keysOf([lab("Serum Sodium", 140)])).toEqual([]);
  });

  it("keeps only the first reading per metric key", () => {
    const out = bridgeLabValuesToMetrics(
      [lab("LDL Cholesterol", 138), lab("LDL Cholesterol", 999)],
      DATE,
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.value).toBe(138);
  });

  // Regression: `new Date(bad).toISOString()` throws RangeError. The record row
  // is already written by then, so ingestion died half-done on a PDF whose date
  // the parser mangled.
  it("falls back to now when the parsed record date is unusable", () => {
    const before = Date.now();
    const out = bridgeLabValuesToMetrics([lab("HbA1c", 5.9)], "date not found");
    const after = Date.now();

    expect(out).toHaveLength(1);
    const takenAt = Date.parse(out[0]!.takenAt);
    expect(takenAt).toBeGreaterThanOrEqual(before);
    expect(takenAt).toBeLessThanOrEqual(after);
  });
});
