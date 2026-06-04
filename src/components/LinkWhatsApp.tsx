"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Check, Copy } from "lucide-react";
import {
  createWhatsappLinkCode,
  unlinkWhatsapp,
} from "@/lib/whatsapp-actions";

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export default function LinkWhatsApp({ linkedPhone }: { linkedPhone: string | null }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [linked, setLinked] = useState<string | null>(linkedPhone);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function getCode() {
    startTransition(async () => {
      const { code } = await createWhatsappLinkCode();
      setCode(code);
      setOpen(true);
    });
  }

  function copyCode() {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function unlink() {
    startTransition(async () => {
      await unlinkWhatsapp();
      setLinked(null);
      setCode(null);
      setOpen(false);
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-tint)] text-[var(--color-brand)]">
          <MessageCircle size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium">Add records via WhatsApp</h3>
          {linked ? (
            <p className="mt-0.5 text-sm text-[var(--color-fg-muted)]">
              Linked to <span className="font-medium text-[var(--color-fg)]">{linked}</span>.
              Forward any lab report to the Ved AI number and it lands here automatically.
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-[var(--color-fg-muted)]">
              Forward lab reports straight from WhatsApp — no uploading. Link your
              number once to get started.
            </p>
          )}

          {linked ? (
            <button
              onClick={unlink}
              disabled={pending}
              className="mt-3 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-2)]"
            >
              Unlink
            </button>
          ) : (
            <button
              onClick={getCode}
              disabled={pending}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-strong)] disabled:opacity-60"
            >
              <MessageCircle size={16} />
              {pending ? "…" : "Link WhatsApp"}
            </button>
          )}

          {open && code && !linked && (
            <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-sm">
              <p className="text-[var(--color-fg-muted)]">
                On WhatsApp, send this code to{" "}
                <span className="font-medium text-[var(--color-fg)]">
                  {WA_NUMBER || "the Ved AI number"}
                </span>
                :
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="rounded-md bg-[var(--color-surface-2)] px-3 py-2 font-mono text-lg tracking-widest">
                  {code}
                </code>
                <button
                  onClick={copyCode}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-2 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-2 text-xs text-[var(--color-fg-dim)]">
                Code expires in 15 minutes. We&apos;ll confirm on WhatsApp once linked.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
