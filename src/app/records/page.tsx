"use client";

import { useMemo, useState } from "react";
import { SectionTitle } from "@/components/Card";
import RecordItem from "@/components/RecordItem";
import { records as seed } from "@/lib/mock";
import type { MedicalRecord, RecordType } from "@/lib/types";

const filters: { key: RecordType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "lab", label: "Labs" },
  { key: "prescription", label: "Rx" },
  { key: "imaging", label: "Imaging" },
  { key: "visit", label: "Visits" },
  { key: "vaccination", label: "Vaccines" },
];

export default function Records() {
  const [list, setList] = useState<MedicalRecord[]>(seed);
  const [filter, setFilter] = useState<RecordType | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return list
      .filter((r) => (filter === "all" ? true : r.type === filter))
      .filter((r) =>
        query
          ? (r.title + r.doctor + r.facility + r.summary)
              .toLowerCase()
              .includes(query.toLowerCase())
          : true,
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [list, filter, query]);

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const newRecord: MedicalRecord = {
      id: `r-${Date.now()}`,
      type: "lab",
      title: file.name.replace(/\.[^.]+$/, ""),
      doctor: "—",
      facility: "Uploaded",
      date: new Date().toISOString().slice(0, 10),
      summary: "Pending review. Tap to add notes, doctor, and tags.",
      fileName: file.name,
    };
    setList((prev) => [newRecord, ...prev]);
    e.target.value = "";
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Your vault"
        title="Records"
        action={
          <label className="cursor-pointer rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm text-white">
            Upload
            <input
              type="file"
              className="hidden"
              onChange={onUpload}
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </label>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <input
          placeholder="Search by title, doctor, or facility…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[240px] flex-1 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                filter === f.key
                  ? "bg-[var(--color-fg)] text-white"
                  : "border border-[var(--color-border)] bg-white text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

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
