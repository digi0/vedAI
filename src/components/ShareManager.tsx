"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShareToken } from "@/lib/actions";

export default function ShareManager({
  tokens,
}: {
  tokens: { token: string; expiresAt: string; revokedAt: string | null }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    startTransition(async () => {
      const token = await createShareToken({ hoursValid: 72 });
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      setLastUrl(`${origin}/share/${token}`);
      setCopied(false);
      router.refresh();
    });
  }

  async function copy() {
    if (!lastUrl) return;
    await navigator.clipboard.writeText(lastUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const activeCount = tokens.filter(
    (t) => !t.revokedAt && new Date(t.expiresAt) > new Date(),
  ).length;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Generate a new share link</div>
          <div className="text-xs text-[var(--color-fg-muted)]">
            Valid for 72 hours. {activeCount} active link(s) currently.
          </div>
        </div>
        <button
          onClick={generate}
          disabled={pending}
          className="rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {pending ? "Generating…" : "Generate link"}
        </button>
      </div>

      {lastUrl && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md bg-[var(--color-brand-soft)] p-3">
          <code className="min-w-0 flex-1 truncate font-mono text-sm">
            {lastUrl}
          </code>
          <button
            onClick={copy}
            className="rounded-md border border-[var(--color-brand)] bg-[var(--color-surface)] px-3 py-1 text-sm text-[var(--color-brand)]"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
