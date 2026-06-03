"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";
import { ingestRecord } from "@/lib/actions";
import { browserClient } from "@/lib/supabase-browser";

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
      const sb = browserClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error("Please sign in again.");

      // Upload the file straight to Storage from the browser. This avoids
      // routing the (potentially large) file through a Vercel serverless
      // function, which caps request bodies at 4.5 MB.
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await sb.storage
        .from("record-files")
        .upload(path, file, { contentType: file.type || undefined });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

      // Hand the server just the path — it downloads, parses, and persists.
      const res = await ingestRecord({ path, fileName: file.name });
      if (!res.ok) throw new Error(res.error);
      if (!res.parsed) {
        alert(
          "Uploaded — but parsing failed, so it's saved as 'Pending review'.\n\n" +
            (res.parseError ? `Reason: ${res.parseError}` : "No reason returned."),
        );
      }
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
