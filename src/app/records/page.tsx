import { SectionTitle } from "@/components/Card";
import RecordItem from "@/components/RecordItem";
import RecordsToolbar from "@/components/RecordsToolbar";
import LinkWhatsApp from "@/components/LinkWhatsApp";
import { listRecords } from "@/lib/db";
import { getWhatsappStatus } from "@/lib/whatsapp-actions";

export const dynamic = "force-dynamic";

export default async function Records({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const { type, q } = await searchParams;
  const [all, wa] = await Promise.all([listRecords(), getWhatsappStatus()]);

  const filtered = all
    .filter((r) => (type && type !== "all" ? r.type === type : true))
    .filter((r) =>
      q
        ? (r.title + r.doctor + r.facility + r.summary)
            .toLowerCase()
            .includes(q.toLowerCase())
        : true,
    );

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Your vault" title="Records" />
      <LinkWhatsApp linkedPhone={wa.linkedPhone} />
      <RecordsToolbar activeType={type ?? "all"} initialQuery={q ?? ""} />
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border-strong)] p-10 text-center text-[var(--color-fg-muted)]">
            Nothing here yet.
          </div>
        ) : (
          filtered.map((r) => <RecordItem key={r.id} record={r} />)
        )}
      </div>
    </div>
  );
}
