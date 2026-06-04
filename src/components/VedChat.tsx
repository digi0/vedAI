"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, ArrowUp } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Explain my latest report simply",
  "How's my cholesterol?",
  "मेरी रिपोर्ट आसान भाषा में समझाओ",
];

export default function VedChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ved", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok || !res.body) {
        throw new Error(
          res.status === 503
            ? "Ved isn't available right now."
            : "Couldn't reach Ved. Try again?",
        );
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = prev.slice();
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (e) {
      setMessages((prev) => {
        const copy = prev.slice();
        copy[copy.length - 1] = {
          role: "assistant",
          content: e instanceof Error ? e.message : "Something went wrong.",
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Ved"
          className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 inline-flex items-center gap-2 rounded-full bg-[var(--color-brand)] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-black/20 hover:bg-[var(--color-brand-strong)] md:right-6 md:bottom-6"
        >
          <Sparkles size={18} />
          Ved
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 z-50 md:inset-auto md:right-6 md:bottom-6">
          {/* mobile backdrop */}
          <div
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 md:hidden"
          />
          <div className="absolute inset-x-0 bottom-0 flex h-[82vh] flex-col rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] md:static md:h-[600px] md:w-[390px] md:rounded-2xl md:shadow-2xl md:shadow-black/20">
            {/* header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand)] text-white">
                  <Sparkles size={16} />
                </span>
                <div>
                  <div className="font-display text-lg leading-none">Ved</div>
                  <div className="text-xs text-[var(--color-fg-dim)]">
                    your health companion
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1.5 text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="mt-2">
                  <p className="text-sm text-[var(--color-fg-muted)]">
                    Hi! I&apos;m Ved. Ask me anything about your records, metrics,
                    or what a result means — in English or Hindi.
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-left text-sm hover:border-[var(--color-border-strong)]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-[var(--color-brand)] text-white"
                          : "bg-[var(--color-surface-2)] text-[var(--color-fg)]"
                      }`}
                    >
                      {m.content || (
                        <span className="inline-flex gap-1">
                          <Dot /> <Dot /> <Dot />
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2 border-t border-[var(--color-border)] p-3"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder="Ask Ved…"
                className="max-h-28 flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-brand)]"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-white disabled:opacity-40"
              >
                <ArrowUp size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Dot() {
  return (
    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-fg-dim)]" />
  );
}
