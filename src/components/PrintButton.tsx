"use client";

export default function PrintButton({ label = "Save as PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-sm hover:bg-[var(--color-surface-2)]"
    >
      {label}
    </button>
  );
}
