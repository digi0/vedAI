"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Paperclip, X, ExternalLink, Loader2 } from "lucide-react";
import { getRecordFileUrl } from "@/lib/actions";

// Force a correct content-type from the extension — Storage objects are
// sometimes served as octet-stream, which the browser won't render inline.
const MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  bmp: "image/bmp",
};

/**
 * "View file" chip. On click it gets a short-lived signed URL (ownership-
 * checked), fetches the file, and renders it from a same-origin blob: URL —
 * which sidesteps cross-origin framing / content-disposition issues that
 * otherwise leave the preview blank. Images show inline; everything else
 * (PDFs) renders in an iframe. The signed URL is kept only for "open in new
 * tab" (a blob: URL would be revoked when the modal closes).
 */
export default function RecordFilePreview({ filePath }: { filePath: string }) {
  const t = useTranslations("records");
  const [open, setOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [mime, setMime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const blobRef = useRef<string | null>(null);

  const ext = (filePath.split(".").pop() ?? "").toLowerCase();

  function revoke() {
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
  }
  useEffect(() => revoke, []); // revoke on unmount

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
    try {
      const res = await getRecordFileUrl(filePath);
      if (!res.ok) throw new Error(res.error);
      const r = await fetch(res.url);
      if (!r.ok) throw new Error("fetch failed");
      const raw = await r.blob();
      const type = MIME[ext] || raw.type || "application/octet-stream";
      const blob = raw.type === type ? raw : new Blob([raw], { type });
      revoke();
      const obj = URL.createObjectURL(blob);
      blobRef.current = obj;
      setBlobUrl(obj);
      setSignedUrl(res.url);
      setMime(type);
      setOpen(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const isImage = mime.startsWith("image/");

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

      {open && blobUrl && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black/80 p-3 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-4xl flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 pb-2 text-white">
              {signedUrl && (
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm underline-offset-2 hover:underline"
                >
                  <ExternalLink size={14} /> {t("openInNewTab")}
                </a>
              )}
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
                <img src={blobUrl} alt="" className="mx-auto h-auto max-w-full" />
              ) : (
                <iframe src={blobUrl} title="preview" className="h-full w-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
