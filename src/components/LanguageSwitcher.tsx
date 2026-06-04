"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { setLocale } from "@/i18n/actions";
import { locales, type AppLocale } from "@/i18n/locale";

const SHORT: Record<AppLocale, string> = { en: "EN", hi: "हिं" };

/** Compact EN | हिं segmented toggle. Writes the locale cookie, then refreshes. */
export default function LanguageSwitcher() {
  const active = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: AppLocale) {
    if (next === active || pending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      className="inline-flex items-center rounded-md border border-[var(--color-border)] p-0.5 text-xs"
      role="group"
      aria-label="Language"
    >
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => choose(l)}
          disabled={pending}
          aria-pressed={active === l}
          className={`rounded px-2 py-1 font-medium transition-colors disabled:opacity-60 ${
            active === l
              ? "bg-[var(--color-brand)] text-white"
              : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          }`}
        >
          {SHORT[l]}
        </button>
      ))}
    </div>
  );
}
