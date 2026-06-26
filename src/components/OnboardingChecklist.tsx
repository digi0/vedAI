import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

/**
 * First-run guidance on the Overview. Shows until the user has both set up
 * their profile and uploaded a record, then disappears. Renders nothing for
 * fully-onboarded users.
 */
export default function OnboardingChecklist({
  profileDone,
  hasRecords,
}: {
  profileDone: boolean;
  hasRecords: boolean;
}) {
  const t = useTranslations("onboarding");
  if (profileDone && hasRecords) return null;

  const steps = [
    { done: profileDone, title: t("step1Title"), desc: t("step1Desc"), href: "/profile", cta: t("step1Cta") },
    { done: hasRecords, title: t("step2Title"), desc: t("step2Desc"), href: "/records", cta: t("step2Cta") },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section className="rounded-2xl border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg">{t("title")}</h2>
        <span className="shrink-0 text-xs text-[var(--color-fg-muted)]">
          {t("progress", { done: doneCount, total: steps.length })}
        </span>
      </div>
      <p className="mb-4 text-sm text-[var(--color-fg-muted)]">{t("subtitle")}</p>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3"
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                s.done
                  ? "bg-[var(--color-ok)] text-white"
                  : "border border-[var(--color-border-strong)] text-[var(--color-fg-muted)]"
              }`}
            >
              {s.done ? <Check size={14} /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div
                className={`text-sm font-medium ${
                  s.done ? "text-[var(--color-fg-muted)] line-through" : "text-[var(--color-fg)]"
                }`}
              >
                {s.title}
              </div>
              {!s.done && (
                <div className="mt-0.5 text-xs text-[var(--color-fg-muted)]">{s.desc}</div>
              )}
            </div>
            {!s.done && (
              <Link
                href={s.href}
                className="shrink-0 rounded-md bg-[var(--color-brand)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-brand-strong)]"
              >
                {s.cta}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
