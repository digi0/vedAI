"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2, Loader2 } from "lucide-react";
import { deleteRecord } from "@/lib/actions";

/** Trash button on a record. Confirms, deletes the file + row, then refreshes. */
export default function RemoveRecordButton({ recordId }: { recordId: string }) {
  const t = useTranslations("records");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function onRemove() {
    if (pending) return;
    if (!window.confirm(t("removeConfirm"))) return;
    setFailed(false);
    startTransition(async () => {
      const res = await deleteRecord(recordId);
      if (res.ok) router.refresh();
      else setFailed(true);
    });
  }

  return (
    <button
      type="button"
      onClick={onRemove}
      disabled={pending}
      aria-label={t("remove")}
      title={failed ? t("removeError") : t("remove")}
      className={`shrink-0 rounded-md p-1.5 transition-colors disabled:opacity-50 ${
        failed
          ? "text-[var(--color-alert)]"
          : "text-[var(--color-fg-dim)] hover:bg-[var(--color-alert-soft)] hover:text-[var(--color-alert)]"
      }`}
    >
      {pending ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Trash2 size={16} />
      )}
    </button>
  );
}
