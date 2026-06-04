"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { regenerateInsights } from "@/lib/actions";

export default function RegenerateInsightsButton() {
  const router = useRouter();
  const t = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await regenerateInsights();
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("failed"));
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
        {pending ? t("thinking") : t("regenerate")}
      </button>
      {error && (
        <span className="text-xs text-[var(--color-alert)]">{error}</span>
      )}
    </div>
  );
}
