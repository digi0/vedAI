"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Paperclip, X, ExternalLink, Loader2 } from "lucide-react";

const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif", "heic", "bmp"];

/**
 * "View file" chip. Opens a modal instantly and streams the file from our own
 * `/api/records/[id]/file` route (same-origin, inline) — so images and PDFs
 * render directly with no client-side download step. A spinner shows until the
 * content finishes loading.
 */
export default function RecordFilePreview({
  recordId,
  fileName,
}: {
  recordId: string;
  fileName: string;
}) {
  const t = useTranslations("records");
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  const isImage = IMAGE_EXT.includes(ext);
  const src = `/api/records/${recordId}/file`;

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

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setLoaded(false);
          setOpen(true);
        }}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs text-[var(--color-fg-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
      >
        <Paperclip size={12} aria-hidden />
        {t("viewFile")}
      </button>

      {open && (
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
                href={src}
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
            <div className="relative min-h-0 flex-1 overflow-auto rounded-lg bg-white">
              {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={28} className="animate-spin text-[var(--color-brand)]" />
                </div>
              )}
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  onLoad={() => setLoaded(true)}
                  className="mx-auto h-auto max-w-full"
                />
              ) : (
                <iframe
                  src={src}
                  title="preview"
                  onLoad={() => setLoaded(true)}
                  className="h-full w-full"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
