"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SoundId = "buzzer" | "bell" | "horn";

const SOUNDS: { id: SoundId; label: string; vibe: number[] }[] = [
  { id: "buzzer", label: "Buzzer", vibe: [200] },
  { id: "bell", label: "Bell", vibe: [30, 60, 30] },
  { id: "horn", label: "Horn", vibe: [90, 50, 180] },
];

type Hit = { n: number; ms: number };

/* ── Sound ────────────────────────────────────────────────────
   Synthesized with the Web Audio API rather than shipped as audio files:
   zero network cost, and a buzzer that has to *download* before it fires
   isn't a buzzer. Each voice builds its own node graph and is garbage
   collected once the oscillators stop. */

function envelope(ctx: AudioContext, peak: number, attack: number, dur: number) {
  const t = ctx.currentTime;
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 5000; // shaves the harshest square-wave harmonics
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(lp).connect(ctx.destination);
  return g;
}

function playSound(ctx: AudioContext, id: SoundId) {
  const t = ctx.currentTime;

  if (id === "buzzer") {
    const dur = 0.55;
    const out = envelope(ctx, 0.34, 0.008, dur);
    for (const [freq, level] of [
      [110, 1],
      [55, 0.7],
    ]) {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + dur);
    }
    // Amplitude wobble — this is what reads as "buzzer" and not "bass note".
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 24;
    const depth = ctx.createGain();
    depth.gain.value = 0.16;
    lfo.connect(depth).connect(out.gain);
    lfo.start(t);
    lfo.stop(t + dur);
    return;
  }

  if (id === "bell") {
    const dur = 1.6;
    const out = envelope(ctx, 0.3, 0.004, dur);
    // Fundamental plus inharmonic partials — a pure sine sounds like a test tone.
    for (const [freq, level] of [
      [880, 1],
      [1320, 0.45],
      [2640, 0.16],
    ]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(level, t);
      // Higher partials die first, like a real struck bell.
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (level === 1 ? 1 : 0.45));
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + dur);
    }
    return;
  }

  // horn — two saws a couple of Hz apart beat against each other, then the
  // pitch sags at the release like an air horn running out of pressure.
  const dur = 0.9;
  const out = envelope(ctx, 0.26, 0.02, dur);
  for (const freq of [233, 236, 466]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.setValueAtTime(freq, t + dur * 0.75);
    osc.frequency.linearRampToValueAtTime(freq * 0.88, t + dur);
    const g = ctx.createGain();
    g.gain.value = freq > 400 ? 0.35 : 1;
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur);
  }
}

function fmt(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function Buzzer() {
  const [sound, setSound] = useState<SoundId>("buzzer");
  const [armed, setArmed] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [hits, setHits] = useState<Hit[]>([]);

  const ctxRef = useRef<AudioContext | null>(null);
  const startedAt = useRef(0);
  // Reads by the keyboard handler and rAF loop, which are bound once — refs
  // keep them seeing current values without rebinding on every render.
  const armedRef = useRef(armed);
  const soundRef = useRef(sound);
  armedRef.current = armed;
  soundRef.current = sound;

  const buzz = useCallback(() => {
    // The context can only be created/resumed inside a user gesture, so it's
    // built on first buzz rather than on mount.
    let ctx = ctxRef.current;
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctor) ctx = ctxRef.current = new Ctor();
    }
    if (ctx) {
      if (ctx.state === "suspended") void ctx.resume();
      playSound(ctx, soundRef.current);
    }
    navigator.vibrate?.(SOUNDS.find((s) => s.id === soundRef.current)!.vibe);

    setFlash(true);
    window.setTimeout(() => setFlash(false), 450);

    // Only a *question* has a reaction time. Un-armed taps are just a buzzer.
    if (armedRef.current) {
      const ms = performance.now() - startedAt.current;
      setArmed(false);
      setResult(ms);
      setHits((h) => [{ n: h.length + 1, ms }, ...h].slice(0, 6));
    }
  }, []);

  function arm() {
    setResult(null);
    startedAt.current = performance.now();
    setElapsed(0);
    setArmed(true);
  }

  // Space/Enter fire the buzzer from anywhere on the page — a phone propped up
  // on a table isn't the only way people run a quiz.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== "Space" && e.code !== "Enter") return;
      const el = document.activeElement;
      // Let a focused control handle its own keys instead of double-firing.
      if (el instanceof HTMLElement && (el.tagName === "BUTTON" || el.isContentEditable)) return;
      if (e.repeat) return;
      e.preventDefault();
      buzz();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [buzz]);

  // Live clock while armed, so the armed state is unmistakable.
  useEffect(() => {
    if (!armed) return;
    let raf = 0;
    const tick = () => {
      setElapsed(performance.now() - startedAt.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [armed]);

  useEffect(() => () => void ctxRef.current?.close(), []);

  const best = hits.length ? Math.min(...hits.map((h) => h.ms)) : null;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6">
      {/* Sound picker */}
      <div
        role="radiogroup"
        aria-label="Buzzer sound"
        className="glass flex gap-1 rounded-full p-1"
      >
        {SOUNDS.map((s) => (
          <button
            key={s.id}
            role="radio"
            aria-checked={sound === s.id}
            onClick={() => setSound(s.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              sound === s.id
                ? "bg-[var(--color-brand)] text-white"
                : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* The buzzer */}
      <button
        onPointerDown={buzz}
        aria-label="Buzz"
        className={`relative aspect-square w-full max-w-[19rem] select-none rounded-full text-white transition-transform duration-150 ease-out active:scale-[0.96] ${
          flash ? "scale-[1.03]" : ""
        }`}
        style={{
          background: flash
            ? "radial-gradient(circle at 50% 32%, #fff8, transparent 55%), var(--color-alert)"
            : "radial-gradient(circle at 50% 30%, #ffffff55, transparent 55%), var(--color-brand)",
          boxShadow: flash
            ? "0 0 0 14px color-mix(in oklab, var(--color-alert) 22%, transparent), 0 26px 60px -18px color-mix(in oklab, var(--color-alert) 75%, transparent), inset 0 -10px 26px rgba(0,0,0,0.28), inset 0 6px 16px rgba(255,255,255,0.4)"
            : "0 26px 60px -18px color-mix(in oklab, var(--color-brand) 70%, transparent), inset 0 -10px 26px rgba(0,0,0,0.25), inset 0 6px 16px rgba(255,255,255,0.35)",
        }}
      >
        <span className="font-display block text-5xl tracking-tight sm:text-6xl">BUZZ</span>
        <span className="mt-1 block text-sm/6 opacity-80">
          {armed ? fmt(elapsed) : "tap or press space"}
        </span>
        {armed && (
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full border-2 border-white/40"
            style={{ animationDuration: "1.6s" }}
          />
        )}
      </button>

      {/* Question control + last result */}
      <div className="flex min-h-[3.25rem] w-full flex-col items-center gap-2">
        {result !== null ? (
          <>
            <div className="font-display text-3xl text-[var(--color-brand)]">{fmt(result)}</div>
            <button className="btn btn-glass btn-sm" onClick={arm}>
              Next question
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-primary" onClick={arm} disabled={armed}>
              {armed ? "Waiting for a buzz…" : "Start question"}
            </button>
            <p className="text-xs text-[var(--color-fg-dim)]">
              {armed ? "First buzz wins — the clock is running." : "Times a buzz. Optional."}
            </p>
          </>
        )}
      </div>

      {/* Round history */}
      {hits.length > 0 && (
        <div className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">
              Rounds
            </span>
            <button
              className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              onClick={() => {
                setHits([]);
                setResult(null);
              }}
            >
              Clear
            </button>
          </div>
          <ul className="divide-y divide-[var(--color-border)] text-sm">
            {hits.map((h) => (
              <li key={h.n} className="flex items-center justify-between py-1.5">
                <span className="text-[var(--color-fg-muted)]">Round {h.n}</span>
                <span
                  className={
                    h.ms === best ? "font-medium text-[var(--color-brand)]" : "tabular-nums"
                  }
                >
                  {fmt(h.ms)}
                  {h.ms === best && hits.length > 1 && " · fastest"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
