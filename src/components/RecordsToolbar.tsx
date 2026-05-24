"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";
import { uploadRecordFile } from "@/lib/actions";

const types = [
  { key: "all", label: "All" },
  { key: "lab", label: "Labs" },
  { key: "prescription", label: "Rx" },
  { key: "imaging", label: "Imaging" },
  { key: "visit", label: "Visits" },
  { key: "vaccination", label: "Vaccines" },
];

export default function RecordsToolbar({
  activeType,
  initialQuery,
}: {
  activeType: string;
  initialQuery: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState(initialQuery);

  function setParam(name: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "" || value === "all") next.delete(name);
    else next.set(name, value);
    startTransition(() => router.push(`/records?${next.toString()}`));
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("type", "lab");
      await uploadRecordFile(form);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        placeholder="Search by title, doctor, or facility…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setParam("q", e.target.value);
        }}
        className="min-w-[240px] flex-1 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-1">
        {types.map((t) => (
          <button
            key={t.key}
            onClick={() => setParam("type", t.key)}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              activeType === t.key
                ? "bg-[var(--color-fg)] text-white"
                : "border border-[var(--color-border)] bg-white text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <label className="cursor-pointer rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm text-white">
        {uploading ? "Uploading…" : pending ? "…" : "Upload"}
        <input
          type="file"
          className="hidden"
          onChange={onUpload}
          disabled={uploading}
          accept=".pdf,.jpg,.jpeg,.png"
        />
      </label>
    </div>
  );
}
