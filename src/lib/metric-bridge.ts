/**
 * Bridge medical-parser lab values → metrics_readings rows.
 *
 * Each entry maps a regex pattern against the LabValue.name to a
 * metric_key enum value. Patterns are checked top-down; first match wins.
 * "Ratio" rows (e.g. "HDL/LDL Ratio") are explicitly skipped via a
 * negative pattern so they don't pollute their parent metric's trend line.
 */

import type { LabValue } from "medical-parser";

type Mapping = {
  /** Returns true if this lab value should become a reading under `key`. */
  match: (name: string) => boolean;
  key: string;
};

const isRatio = (n: string) => /\bratio\b|\/\s*hdl\s+cholesterol/i.test(n);

const MAPPINGS: Mapping[] = [
  {
    key: "hba1c",
    match: (n) => /\bhba1c\b|glycosylated\s+hemoglobin/i.test(n),
  },
  {
    key: "ldl",
    match: (n) => /\bldl\b/i.test(n) && /cholesterol/i.test(n) && !isRatio(n),
  },
  {
    key: "hdl",
    match: (n) => /\bhdl\b/i.test(n) && /cholesterol/i.test(n) && !isRatio(n),
  },
  {
    key: "triglycerides",
    match: (n) => /triglyceride/i.test(n),
  },
  {
    key: "total_chol",
    match: (n) => /^total\s+cholesterol$/i.test(n.trim()),
  },
  {
    key: "vitamin_d",
    match: (n) =>
      /vitamin\s*d\b|25[\s-]*hydroxy|25[\s-]*oh/i.test(n) ||
      /\bOH\s*\)/.test(n), // parser sometimes truncates to "OH )"
  },
  {
    key: "vitamin_b12",
    match: (n) => /vitamin\s*b[\s-]?12|cobalamin/i.test(n),
  },
  {
    key: "creatinine",
    match: (n) =>
      /\bcreatinine\b/i.test(n) &&
      !isRatio(n) &&
      !/\bbun\b|urea/i.test(n),
  },
  {
    key: "alt",
    match: (n) => /\balt\b|sgpt|alanine\s+aminotrans/i.test(n),
  },
  {
    key: "ast",
    match: (n) => /\bast\b|sgot|aspartate\s+aminotrans/i.test(n),
  },
  {
    key: "tsh",
    match: (n) => /thyroid\s+stimulating|\btsh\b/i.test(n),
  },
  {
    key: "glucose",
    match: (n) => /glucose,?\s+fasting|fasting\s+(?:blood\s+sugar|glucose)/i.test(n),
  },
];

export type MetricReading = {
  key: string;
  value: number;
  takenAt: string; // ISO
};

/**
 * Convert a list of LabValues + a record date into metric reading rows
 * suitable for insertion into metrics_readings.
 *
 * Skips:
 *  - lab values with non-numeric values (qualitative bounds like "<10")
 *  - lab values that don't match any mapping
 */
export function bridgeLabValuesToMetrics(
  labValues: LabValue[],
  recordDateIso: string,
): MetricReading[] {
  const out: MetricReading[] = [];
  const seenKeys = new Set<string>();
  for (const lv of labValues) {
    if (typeof lv.value !== "number" || !Number.isFinite(lv.value)) continue;
    const name = lv.name || "";
    const mapping = MAPPINGS.find((m) => m.match(name));
    if (!mapping) continue;
    if (seenKeys.has(mapping.key)) continue; // first-match-wins per key
    seenKeys.add(mapping.key);
    out.push({
      key: mapping.key,
      value: lv.value,
      takenAt: new Date(recordDateIso).toISOString(),
    });
  }
  return out;
}
