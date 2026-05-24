"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logMetric } from "@/lib/actions";

const options = [
  { key: "bp_sys", label: "BP Systolic (mmHg)" },
  { key: "bp_dia", label: "BP Diastolic (mmHg)" },
  { key: "weight", label: "Weight (kg)" },
  { key: "glucose", label: "Glucose (mg/dL)" },
  { key: "resting_hr", label: "Resting HR (bpm)" },
  { key: "sleep_hrs", label: "Sleep (hrs)" },
];

export default function LogMetricForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("bp_sys");
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-[var(--color-border-strong)] bg-white px-3 py-1.5 text-sm"
      >
        Log new reading
      </button>
    );
  }

  function submit() {
    const v = parseFloat(value);
    if (Number.isNaN(v)) return;
    startTransition(async () => {
      await logMetric({ key, value: v });
      setValue("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-border)] bg-white p-2">
      <select
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="rounded-md border border-[var(--color-border)] bg-white px-2 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        type="number"
        step="0.1"
        placeholder="Value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-28 rounded-md border border-[var(--color-border)] px-2 py-1.5 text-sm"
        autoFocus
      />
      <button
        onClick={submit}
        disabled={pending || !value}
        className="rounded-md bg-[var(--color-brand)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="rounded-md px-2 py-1.5 text-sm text-[var(--color-fg-muted)]"
      >
        Cancel
      </button>
    </div>
  );
}
