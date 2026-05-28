"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateInsights } from "@/lib/actions";

export default function RegenerateInsightsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        await regenerateInsights();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={run}
        disabled={pending}
        className="rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {pending ? "Thinking…" : "Regenerate"}
      </button>
      {error && (
        <span className="text-xs text-[var(--color-alert)]">{error}</span>
      )}
    </div>
  );
}
