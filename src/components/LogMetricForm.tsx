"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { logMetric } from "@/lib/actions";

const optionKeys = ["bp_sys", "bp_dia", "weight", "glucose", "resting_hr", "sleep_hrs"];

export default function LogMetricForm() {
  const router = useRouter();
  const tl = useTranslations("logMetric");
  const tm = useTranslations("metrics");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("bp_sys");
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
      >
        {tm("logNewReading")}
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
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
      <select
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm"
      >
        {optionKeys.map((k) => (
          <option key={k} value={k}>
            {tl(k)}
          </option>
        ))}
      </select>
      <input
        type="number"
        step="0.1"
        placeholder={tm("value")}
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
        {pending ? tc("saving") : tc("save")}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="rounded-md px-2 py-1.5 text-sm text-[var(--color-fg-muted)]"
      >
        {tc("cancel")}
      </button>
    </div>
  );
}
