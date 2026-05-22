import type { MedicalRecord } from "@/lib/types";
import { Badge } from "./Card";

const typeIcon: Record<string, string> = {
  lab: "🧪",
  prescription: "℞",
  imaging: "🩻",
  visit: "🩺",
  vaccination: "💉",
};

const typeLabel: Record<string, string> = {
  lab: "Lab",
  prescription: "Prescription",
  imaging: "Imaging",
  visit: "Visit",
  vaccination: "Vaccine",
};

export default function RecordItem({ record }: { record: MedicalRecord }) {
  return (
    <article className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-border-strong)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-lg">
        <span aria-hidden>{typeIcon[record.type]}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{record.title}</h3>
          <Badge tone="brand">{typeLabel[record.type]}</Badge>
        </div>
        <div className="mt-0.5 text-sm text-[var(--color-fg-muted)]">
          {record.doctor} · {record.facility} ·{" "}
          {new Date(record.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
        <p className="mt-2 text-sm text-[var(--color-fg)]">{record.summary}</p>
        {record.fileName && (
          <div className="mt-2 text-xs text-[var(--color-fg-dim)]">
            📎 {record.fileName}
          </div>
        )}
      </div>
    </article>
  );
}
