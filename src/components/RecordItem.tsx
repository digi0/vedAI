import type { MedicalRecord } from "@/lib/types";
import { useTranslations } from "next-intl";
import { Badge } from "./Card";
import {
  FlaskConical,
  Pill,
  ScanLine,
  Stethoscope,
  Syringe,
  Paperclip,
  type LucideIcon,
} from "lucide-react";

const typeIcon: Record<string, LucideIcon> = {
  lab: FlaskConical,
  prescription: Pill,
  imaging: ScanLine,
  visit: Stethoscope,
  vaccination: Syringe,
};

export default function RecordItem({ record }: { record: MedicalRecord }) {
  const t = useTranslations("recordTypes");
  const Icon = typeIcon[record.type] ?? FlaskConical;
  return (
    <article className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-border-strong)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-tint)] text-[var(--color-brand)]">
        <Icon size={18} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{record.title}</h3>
          <Badge tone="brand">{t(record.type)}</Badge>
        </div>
        <div className="mt-0.5 text-sm text-[var(--color-fg-muted)]">
          {[record.doctor, record.facility]
            .filter(Boolean)
            .join(" · ")}
          {(record.doctor || record.facility) && " · "}
          {new Date(record.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
        <p className="mt-2 text-sm text-[var(--color-fg)]">{record.summary}</p>
        {record.fileName && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-fg-dim)]">
            <Paperclip size={12} aria-hidden />
            {record.fileName.split("/").pop()}
          </div>
        )}
      </div>
    </article>
  );
}
