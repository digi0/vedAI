"use server";

/**
 * Server actions — mutations called from client components via forms.
 *
 * Same demo-phase rules as db.ts: every write uses DEMO_USER_ID and the
 * service_role client. Once auth lands, switch to a per-request server
 * client with the session UID.
 */

import { revalidatePath } from "next/cache";
import { parsePdf, type ParsedDocument } from "medical-parser";
import { serverAdmin, DEMO_USER_ID } from "./supabase";
import { getLLM, type PatientContext } from "./llm";
import {
  getProfile,
  listMetrics,
} from "./db";
import type { RecordType, DeliveryMethod, OrderItem } from "./types";

// ---------- records ----------

export async function createRecord(input: {
  type: RecordType;
  title: string;
  doctor?: string;
  facility?: string;
  date: string; // yyyy-mm-dd
  summary?: string;
  tags?: string[];
  filePath?: string;
}) {
  const sb = serverAdmin();
  const { error } = await sb.from("records").insert({
    user_id: DEMO_USER_ID,
    type: input.type,
    title: input.title,
    doctor: input.doctor ?? null,
    facility: input.facility ?? null,
    record_date: input.date,
    summary: input.summary ?? null,
    tags: input.tags ?? [],
    file_path: input.filePath ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/records");
  revalidatePath("/");
}

/**
 * Upload a record file, parse it with medical-parser, and persist both
 * the file (Storage) and the structured fields (records.parsed_data).
 *
 * If parsing succeeds and the user's profile is empty, populate it from
 * the parsed patient info — handy for the demo so a single upload also
 * boots the emergency card. We DO NOT overwrite an existing profile.
 */
export async function uploadRecordFile(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No file provided.");
  }

  const sb = serverAdmin();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${DEMO_USER_ID}/${crypto.randomUUID()}.${ext}`;

  const rawBytes = await file.arrayBuffer();
  const bytes = new Uint8Array(rawBytes);

  const { error: upErr } = await sb.storage
    .from("record-files")
    .upload(path, bytes, { contentType: file.type || undefined });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

  // Parse the PDF (best-effort). On failure, fall back to a stub record.
  let parsed: ParsedDocument | null = null;
  let parseStatus: "parsed" | "failed" = "failed";
  if (ext.toLowerCase() === "pdf") {
    try {
      parsed = await parsePdf(Buffer.from(rawBytes));
      parseStatus = "parsed";
    } catch (e) {
      console.warn("[upload] parse failed:", (e as Error).message);
    }
  }

  // Build the record row from parsed data when available.
  const recordType: RecordType =
    parsed && parsed.type !== "other"
      ? (parsed.type as RecordType)
      : "lab"; // DB enum doesn't have "other"; default safely

  const today = new Date().toISOString().slice(0, 10);
  const title =
    parsed?.title ||
    (form.get("title") as string) ||
    file.name.replace(/\.[^.]+$/, "");

  // Strip rawText before persisting — we already have the file in Storage,
  // no need to duplicate ~80KB of text in the DB row.
  const parsedToStore = parsed
    ? (() => {
        const { rawText: _drop, ...rest } = parsed;
        return rest;
      })()
    : null;

  const { error: insErr } = await sb.from("records").insert({
    user_id: DEMO_USER_ID,
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
  if (insErr) throw new Error(insErr.message);

  // Auto-populate profile from parsed patient info IF profile is empty.
  if (parsed?.patient?.name) {
    const existing = await getProfile().catch(() => null);
    const isEmpty = !existing || !existing.name;
    if (isEmpty) {
      const dob = parsed.patient.age
        ? `${new Date().getFullYear() - parsed.patient.age}-01-01`
        : null;
      await sb.from("profiles").upsert({
        user_id: DEMO_USER_ID,
        full_name: parsed.patient.name,
        dob,
        // Everything else stays empty until the user fills it in or another
        // doc (e.g. prescription) adds medications/allergies.
        allergies: [],
        conditions: [],
        medications: [],
        emergency_contacts: [],
        insurance: null,
        primary_doctor: null,
      });
    }
  }

  revalidatePath("/records");
  revalidatePath("/emergency");
  revalidatePath("/");
}

// ---------- metrics ----------

export async function logMetric(input: {
  key: string;
  value: number;
  takenAt?: string;
  note?: string;
}) {
  const sb = serverAdmin();
  const { error } = await sb.from("metrics_readings").insert({
    user_id: DEMO_USER_ID,
    key: input.key,
    value: input.value,
    taken_at: input.takenAt ?? new Date().toISOString(),
    note: input.note ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/metrics");
  revalidatePath("/");
}

// ---------- insights (LLM) ----------

/**
 * Pull profile + parsed records + metrics, call the LLM (Ollama), and
 * replace the user's stored insights. Sends only abnormal lab values
 * to keep the prompt within llama3:8b's 8K context window.
 */
export async function regenerateInsights() {
  const sb = serverAdmin();

  const [profile, metrics, recordsRes] = await Promise.all([
    getProfile(),
    listMetrics(),
    sb
      .from("records")
      .select("type, title, record_date, summary, parsed_data")
      .eq("user_id", DEMO_USER_ID)
      .order("record_date", { ascending: false }),
  ]);

  if (recordsRes.error) throw new Error(recordsRes.error.message);

  // Trim each record's parsed_data — only keep abnormal lab values so the
  // prompt fits comfortably in the model's context.
  const records = (recordsRes.data ?? []).map((r) => {
    const pd = r.parsed_data as ParsedDocument | null;
    let slim: ParsedDocument | null = null;
    if (pd) {
      const { rawText: _drop, ...rest } = pd;
      slim = {
        ...rest,
        rawText: "", // empty rather than undefined to satisfy the type
        labValues:
          pd.labValues?.filter(
            (lv) => lv.flag === "high" || lv.flag === "low",
          ) ?? [],
      };
    }
    return {
      type: r.type,
      title: r.title,
      date: r.record_date,
      summary: r.summary ?? "",
      parsedData: slim,
    };
  });

  const ctx: PatientContext = {
    profile: profile
      ? {
          name: profile.name,
          dob: profile.dob,
          bloodType: profile.bloodType,
          allergies: profile.allergies,
          conditions: profile.conditions,
          medications: profile.medications,
        }
      : null,
    records,
    metrics: metrics.map((m) => ({
      key: m.key,
      label: m.label,
      unit: m.unit,
      healthyRange: m.healthyRange,
      points: m.points,
    })),
  };

  const llm = getLLM();
  const insights = await llm.generateInsights(ctx);

  // Replace stored insights atomically-ish: delete then insert.
  await sb.from("insights").delete().eq("user_id", DEMO_USER_ID);
  if (insights.length > 0) {
    const { error } = await sb.from("insights").insert(
      insights.map((i) => ({
        user_id: DEMO_USER_ID,
        severity: i.severity,
        title: i.title,
        detail: i.detail,
        suggestion: i.suggestion,
      })),
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/insights");
  revalidatePath("/");
}

// ---------- pharmacy ----------

const DELIVERY_FEE: Record<DeliveryMethod, number> = {
  pickup: 0,
  standard: 4.99,
  express: 12.99,
};

export async function placeOrder(input: {
  delivery: DeliveryMethod;
  items: OrderItem[];
}): Promise<{ id: string }> {
  if (input.items.length === 0) throw new Error("Cart is empty.");

  const subtotal = input.items.reduce((s, i) => s + i.price * i.qty, 0);
  const total = +(subtotal + DELIVERY_FEE[input.delivery]).toFixed(2);

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const id = `ORD-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;

  const sb = serverAdmin();
  const { error } = await sb.from("medication_orders").insert({
    id,
    user_id: DEMO_USER_ID,
    delivery: input.delivery,
    total,
    status: "processing",
    items: input.items,
  });
  if (error) throw new Error(error.message);

  // Decrement refills on the corresponding pharmacy_items.
  // Best-effort: match by (name, dose) for the demo user.
  for (const i of input.items) {
    const { data: rows } = await sb
      .from("pharmacy_items")
      .select("id, refills_left")
      .eq("user_id", DEMO_USER_ID)
      .eq("name", i.name)
      .eq("dose", i.dose)
      .limit(1);
    const row = rows?.[0];
    if (row && row.refills_left > 0) {
      await sb
        .from("pharmacy_items")
        .update({ refills_left: Math.max(0, row.refills_left - i.qty) })
        .eq("id", row.id);
    }
  }

  revalidatePath("/pharmacy");
  return { id };
}

export async function requestRefillAuth(itemId: string) {
  // Demo stub — in production this would notify the prescribing doctor.
  // For now we just touch the row's note so the UI can show "requested".
  const sb = serverAdmin();
  await sb
    .from("pharmacy_items")
    .update({ note: "Refill auth requested — pending doctor approval." })
    .eq("id", itemId)
    .eq("user_id", DEMO_USER_ID);
  revalidatePath("/pharmacy");
}

// ---------- share tokens ----------

function genToken(): string {
  // 16 random bytes → 22-char url-safe base64
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function createShareToken(opts?: {
  hoursValid?: number;
}): Promise<string> {
  const sb = serverAdmin();
  const token = genToken();
  const hours = opts?.hoursValid ?? 72;
  const expires = new Date(Date.now() + hours * 3600 * 1000).toISOString();

  const { error } = await sb.from("share_tokens").insert({
    token,
    user_id: DEMO_USER_ID,
    expires_at: expires,
  });
  if (error) throw new Error(error.message);
  return token;
}

export async function revokeShareToken(token: string) {
  const sb = serverAdmin();
  await sb
    .from("share_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token", token);
  revalidatePath("/share");
}
