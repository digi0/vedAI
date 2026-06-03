import "server-only";

import { serverAdmin } from "./supabase";
import { bridgeLabValuesToMetrics } from "./metric-bridge";
import type { ParsedDocument } from "medical-parser";
import type { RecordType } from "./types";

export type IngestOutcome = {
  parsed: boolean;
  labValues: number;
  title: string;
  parseError?: string;
};

/**
 * Core document ingestion, shared by the in-app upload and the WhatsApp bot.
 * Parses the bytes, stores the file (unless already in Storage), and persists
 * a record + parsed_data + bridged metrics for the given user. Runs with the
 * service-role client, so callers MUST pass a verified userId.
 */
export async function ingestDocumentBytes(opts: {
  userId: string;
  bytes: ArrayBuffer;
  fileName: string;
  /** If the file is already in Storage (app upload), skip re-uploading. */
  storedPath?: string;
}): Promise<IngestOutcome> {
  const { userId, bytes, fileName } = opts;
  const sb = serverAdmin();
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "bin";

  // Ensure the file lives in Storage.
  let path = opts.storedPath;
  if (!path) {
    path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage
      .from("record-files")
      .upload(path, new Uint8Array(bytes), {
        contentType: ext === "pdf" ? "application/pdf" : undefined,
      });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Parse (best-effort). Dynamic import keeps a parser failure catchable.
  let parsed: ParsedDocument | null = null;
  let parseStatus: "parsed" | "failed" = "failed";
  let parseError: string | undefined;
  if (ext === "pdf") {
    try {
      const { parsePdf } = await import("medical-parser");
      parsed = await parsePdf(Buffer.from(bytes));
      parseStatus = "parsed";
    } catch (e) {
      parseError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }
  }

  const recordType: RecordType =
    parsed && parsed.type !== "other" ? (parsed.type as RecordType) : "lab";
  const today = new Date().toISOString().slice(0, 10);
  const title = parsed?.title || fileName.replace(/\.[^.]+$/, "");

  const parsedToStore = parsed
    ? (() => {
        const { rawText: _drop, ...rest } = parsed;
        return rest;
      })()
    : null;

  const { error: insErr } = await sb.from("records").insert({
    user_id: userId,
    type: recordType,
    title,
    doctor: parsed?.doctor ?? null,
    facility: parsed?.facility ?? null,
    record_date: parsed?.date ?? today,
    summary: parsed?.summary || "Pending review.",
    file_path: path,
    parsed_data: parsedToStore,
    parse_status: parseStatus,
  });
  if (insErr) throw new Error(`DB insert failed: ${insErr.message}`);

  // Seed the emergency profile from parsed patient info if it's still empty.
  if (parsed?.patient?.name) {
    const { data: existing } = await sb
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (!existing || !existing.full_name) {
      const dob = parsed.patient.age
        ? `${new Date().getFullYear() - parsed.patient.age}-01-01`
        : null;
      await sb.from("profiles").upsert({
        user_id: userId,
        full_name: parsed.patient.name,
        dob,
        allergies: [],
        conditions: [],
        medications: [],
        emergency_contacts: [],
        insurance: null,
        primary_doctor: null,
      });
    }
  }

  // Bridge parsed lab values into the metrics time-series.
  let labCount = 0;
  if (parsed?.labValues?.length) {
    const readings = bridgeLabValuesToMetrics(parsed.labValues, parsed.date ?? today);
    labCount = readings.length;
    if (readings.length > 0) {
      await sb.from("metrics_readings").insert(
        readings.map((r) => ({
          user_id: userId,
          key: r.key,
          value: r.value,
          taken_at: r.takenAt,
        })),
      );
    }
  }

  return { parsed: !!parsed, labValues: labCount, title, parseError };
}
