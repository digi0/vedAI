"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { revokeShareToken } from "@/lib/actions";

/**
 * Kills a live share link. The page has always told people they can "revoke
 * them anytime" and the server action existed, but nothing called it.
 */
export default function RevokeShareButton({ token }: { token: string }) {
  const router = useRouter();
  const t = useTranslations("share");
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function revoke() {
    startTransition(async () => {
      await revokeShareToken(token);
      setConfirming(false);
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="btn btn-glass btn-sm">
        {t("revoke")}
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="text-xs text-[var(--color-fg-muted)]">
        {t("revokeConfirm")}
      </span>
      <button onClick={revoke} disabled={pending} className="btn btn-sm btn-primary">
        {pending ? t("revoking") : t("revokeYes")}
      </button>
      <button onClick={() => setConfirming(false)} className="btn btn-glass btn-sm">
        {t("revokeNo")}
      </button>
    </span>
  );
}
