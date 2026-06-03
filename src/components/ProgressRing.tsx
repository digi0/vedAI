"use client";

import { useEffect, useState } from "react";

/**
 * Animated circular progress ring. Sweeps from 0 → value on mount.
 * Color reflects how good the value is (green / amber / red).
 */
export default function ProgressRing({
  value,
  size = 132,
  stroke = 12,
  children,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const [p, setP] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setP(Math.max(0, Math.min(1, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - p);
  const color =
    value >= 0.8
      ? "var(--color-ok)"
      : value >= 0.5
        ? "var(--color-warn)"
        : "var(--color-alert)";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
