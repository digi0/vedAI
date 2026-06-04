"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Paperclip, X, ExternalLink, Loader2 } from "lucide-react";
import { getRecordFileUrl } from "@/lib/actions";

const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif", "heic", "bmp"];

/**
 * "View file" chip on a record. On click it asks the server for a short-lived
 * signed URL (ownership-checked) and opens an in-app preview — an image inline,
 * anything else (PDF) in an iframe — with an "open in new tab" escape hatch.
 */
export default function RecordFilePreview({ filePath }: { filePath: string }) {
  const t = useTranslations("records");
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const ext = (filePath.split(".").pop() ?? "").toLowerCase();
  const isImage = IMAGE_EXT.includes(ext);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function openPreview() {
    if (loading) return;
    setError(false);
    setLoading(true);
    // Always mint a fresh URL — signed links are short-lived, so a cached one
    // could be stale by the time the user reopens the preview.
    const res = await getRecordFileUrl(filePath);
    setLoading(false);
    if (res.ok) {
      setUrl(res.url);
      setOpen(true);
    } else {
      setError(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openPreview}
        disabled={loading}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs text-[var(--color-fg-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)] disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Paperclip size={12} aria-hidden />
        )}
        {t("viewFile")}
      </button>
      {error && (
        <div className="mt-1 text-xs text-[var(--color-alert)]">
          {t("previewError")}
        </div>
      )}

      {open && url && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black/80 p-3 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-4xl flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 pb-2 text-white">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm underline-offset-2 hover:underline"
              >
                <ExternalLink size={14} /> {t("openInNewTab")}
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("closePreview")}
                className="rounded-full bg-white/10 p-1.5 hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-white">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="mx-auto h-auto max-w-full" />
              ) : (
                <iframe src={url} title="preview" className="h-full w-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
