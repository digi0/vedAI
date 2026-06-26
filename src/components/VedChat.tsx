"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, X, ArrowUp, Mic } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

// --- Minimal Web Speech API typings (not in lib.dom across all setups) ---
type SpeechResult = { isFinal: boolean; readonly [i: number]: { transcript: string } };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
interface SpeechRecognizer {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognizerCtor = new () => SpeechRecognizer;

function getSpeechCtor(): SpeechRecognizerCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognizerCtor;
    webkitSpeechRecognition?: SpeechRecognizerCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function VedChat() {
  const t = useTranslations("ved");
  const SUGGESTIONS = [t("suggestion1"), t("suggestion2"), t("suggestion3")];
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  // Voice intake
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [recLang, setRecLang] = useState<"en-IN" | "hi-IN">("en-IN");
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const finalRef = useRef(""); // text committed before the live (interim) part

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVoiceSupported(getSpeechCtor() !== null);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const stopListening = useCallback(() => {
    recognizerRef.current?.stop();
    recognizerRef.current = null;
    setListening(false);
  }, []);

  // Stop mic when the panel closes or the component unmounts.
  useEffect(() => {
    if (!open) stopListening();
    return () => stopListening();
  }, [open, stopListening]);

  function startListening() {
    const Ctor = getSpeechCtor();
    if (!Ctor || busy) return;
    const rec = new Ctor();
    rec.lang = recLang;
    rec.interimResults = true;
    rec.continuous = false;
    finalRef.current = input ? input.trimEnd() + " " : "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) finalRef.current += t;
        else interim += t;
      }
      setInput((finalRef.current + interim).trimStart());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognizerRef.current = rec;
    setListening(true);
    rec.start();
  }

  function toggleMic() {
    if (listening) stopListening();
    else startListening();
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    if (listening) stopListening();
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
          aria-label={t("open")}
          className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 inline-flex items-center gap-2 rounded-full bg-[var(--color-brand)] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-black/20 hover:bg-[var(--color-brand-strong)] md:right-6 md:bottom-6"
        >
          <Sparkles size={18} />
          {t("title")}
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
          <div className="glass absolute inset-x-0 bottom-0 flex h-[82vh] flex-col rounded-t-2xl md:static md:h-[600px] md:w-[390px] md:rounded-2xl">
            {/* header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand)] text-white">
                  <Sparkles size={16} />
                </span>
                <div>
                  <div className="font-display text-lg leading-none">{t("title")}</div>
                  <div className="text-xs text-[var(--color-fg-dim)]">
                    {t("subtitle")}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label={t("close")}
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
                    {t("greeting")}
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

            {/* listening hint */}
            {listening && (
              <div className="flex items-center justify-center gap-2 px-4 pb-1 text-xs text-[var(--color-brand)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand)] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-brand)]" />
                </span>
                {recLang === "hi-IN" ? t("listeningHindi") : t("listening")}…{" "}
                {t("tapMicToStop")}
              </div>
            )}

            {/* input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2 border-t border-[var(--color-border)] p-3"
            >
              {voiceSupported && (
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleMic}
                    disabled={busy}
                    aria-label={listening ? t("stopVoice") : t("startVoice")}
                    aria-pressed={listening}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:opacity-40 ${
                      listening
                        ? "border-transparent bg-[var(--color-alert)] text-white"
                        : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)]"
                    }`}
                  >
                    <Mic size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecLang((l) => (l === "en-IN" ? "hi-IN" : "en-IN"))}
                    title={t("voiceLanguage")}
                    className="rounded px-1 text-[10px] font-medium text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]"
                  >
                    {recLang === "en-IN" ? "EN" : "हि"}
                  </button>
                </div>
              )}
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
                placeholder={listening ? t("speakNow") : t("placeholder")}
                className="max-h-28 flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-brand)]"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label={t("send")}
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
