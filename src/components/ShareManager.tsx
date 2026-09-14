"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createShareToken } from "@/lib/actions";
import { DEFAULT_SHARE_SCOPE, type ShareScope } from "@/lib/share-scope";

const SECTIONS = [
  { key: "includeRecords", label: "sectionRecords" },
  { key: "includeMetrics", label: "sectionMetrics" },
  { key: "includeProfile", label: "sectionProfile" },
] as const;

export default function ShareManager({
  tokens,
}: {
  tokens: { token: string; expiresAt: string; revokedAt: string | null }[];
}) {
  const router = useRouter();
  const t = useTranslations("share");
  const [pending, startTransition] = useTransition();
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<ShareScope>(DEFAULT_SHARE_SCOPE);

  // The server refuses an empty link too; this just keeps the button honest.
  const nothingSelected =
    !scope.includeRecords && !scope.includeMetrics && !scope.includeProfile;

  function toggle(key: keyof ShareScope) {
    setScope((s) => ({ ...s, [key]: !s[key] }));
  }

  function generate() {
    setError(null);
    startTransition(async () => {
      try {
        const token = await createShareToken({ hoursValid: 72, ...scope });
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        setLastUrl(`${origin}/share/${token}`);
        setCopied(false);
        router.refresh();
      } catch {
        setError(t("generateError"));
      }
    });
  }

  async function copy() {
    if (!lastUrl) return;
    await navigator.clipboard.writeText(lastUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const activeCount = tokens.filter(
    (tok) => !tok.revokedAt && new Date(tok.expiresAt) > new Date(),
  ).length;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{t("generateTitle")}</div>
          <div className="text-xs text-[var(--color-fg-muted)]">
            {t("generateSub", { count: activeCount })}
          </div>
        </div>
        <button
          onClick={generate}
          disabled={pending || nothingSelected}
          className="btn btn-primary"
        >
          {pending ? t("generating") : t("generateBtn")}
        </button>
      </div>

      <fieldset className="mt-4">
        <legend className="text-xs font-medium text-[var(--color-fg-muted)]">
          {t("scopeLegend")}
        </legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {SECTIONS.map(({ key, label }) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={scope[key]}
                onChange={() => toggle(key)}
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              {t(label)}
            </label>
          ))}
        </div>
        {nothingSelected && (
          <p className="mt-2 text-xs text-[var(--color-warn)]">
            {t("scopeEmpty")}
          </p>
        )}
      </fieldset>

      {error && (
        <p className="mt-3 text-sm text-[var(--color-alert)]">{error}</p>
      )}

      {lastUrl && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md bg-[var(--color-brand-soft)] p-3">
          <code className="min-w-0 flex-1 truncate font-mono text-sm">
            {lastUrl}
          </code>
          <button onClick={copy} className="btn btn-glass btn-sm">
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
      )}
    </div>
  );
}
