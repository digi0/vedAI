"use server";

/**
 * Server actions — mutations called from client components via forms.
 *
 * Every write resolves the verified session user via requireUserId() and
 * scopes rows to that id. We use the service-role client for writes (so
 * Storage and inserts don't need extra RLS policies), but user_id is always
 * the authenticated user — never trusted input — so there's no cross-user
 * leakage. Reads go through the RLS-enforced client in db.ts.
 */

import { revalidatePath } from "next/cache";
import type { ParsedDocument } from "medical-parser";
import { serverAdmin, requireUserId } from "./supabase";
import { getLocale } from "next-intl/server";
import { getLLM, type PatientContext } from "./llm";
import { getProfile, listMetrics } from "./db";
import { ingestDocumentBytes } from "./ingest";
import type { RecordType, DeliveryMethod, OrderItem } from "./types";
import { rateLimit } from "./rate-limit";

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
  const userId = await requireUserId();
  const sb = serverAdmin();
  const { error } = await sb.from("records").insert({
    user_id: userId,
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
 * Ingest a record file that the CLIENT has already uploaded directly to
 * Storage (browser → Supabase, bypassing Vercel's 4.5MB serverless body
 * limit). The server only receives the storage path: it downloads the file
 * server-side, parses it, and persists the record + parsed fields.
 *
 * If the user's profile is empty, it's seeded from the parsed patient info
 * (never overwrites an existing profile).
 */
export type IngestResult =
  | { ok: true; parsed: boolean; labValues: number; parseError?: string }
  | { ok: false; error: string };

export async function ingestRecord(input: {
  path: string;
  fileName: string;
}): Promise<IngestResult> {
  try {
    const userId = await requireUserId();

    // Security: the path must live in the caller's own folder.
    if (!input.path.startsWith(`${userId}/`)) {
      throw new Error("Invalid file path.");
    }

    // Download the file the client just uploaded (server-side, no body limit).
    const sb = serverAdmin();
    const { data: blob, error: dlErr } = await sb.storage
      .from("record-files")
      .download(input.path);
    if (dlErr || !blob) {
      throw new Error(`Could not read the uploaded file: ${dlErr?.message ?? "missing"}`);
    }

    const out = await ingestDocumentBytes({
      userId,
      bytes: await blob.arrayBuffer(),
      fileName: input.fileName,
      storedPath: input.path,
    });

    revalidatePath("/records");
    revalidatePath("/emergency");
    revalidatePath("/metrics");
    revalidatePath("/");
    return {
      ok: true,
      parsed: out.parsed,
      labValues: out.labValues,
      parseError: out.parseError,
    };
  } catch (e) {
    // Surface the real message to the client (prod redacts thrown errors).
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Delete a record and its stored file. Service-role write, but always scoped
 * to the authenticated user's id (never trusted input), so a user can only
 * ever delete their own record.
 */
export async function deleteRecord(
  recordId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    const sb = serverAdmin();

    const { data, error } = await sb
      .from("records")
      .select("id, file_path")
      .eq("id", recordId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: "not_found" };

    if (data.file_path) {
      // Best-effort: don't block the row delete if the object is already gone.
      await sb.storage.from("record-files").remove([data.file_path]);
    }

    const { error: delErr } = await sb
      .from("records")
      .delete()
      .eq("id", recordId)
      .eq("user_id", userId);
    if (delErr) throw delErr;

    revalidatePath("/records");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}

// ---------- metrics ----------

export async function logMetric(input: {
  key: string;
  value: number;
  takenAt?: string;
  note?: string;
}) {
  const userId = await requireUserId();
  const sb = serverAdmin();
  const { error } = await sb.from("metrics_readings").insert({
    user_id: userId,
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

export type InsightsResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

/**
 * Pull profile + parsed records + metrics, call the LLM (Claude in prod,
 * Ollama in dev), and replace the user's stored insights. Sends only
 * abnormal lab values to keep the prompt compact. Returns the real error
 * to the client (prod redacts thrown server-action errors).
 */
// 3 regenerations per user per 10 minutes — LLM calls are expensive.
const INSIGHTS_RATE_LIMIT = 3;
const INSIGHTS_RATE_WINDOW_MS = 10 * 60 * 1000;

export async function regenerateInsights(): Promise<InsightsResult> {
  try {
    const userId = await requireUserId();

    const { allowed } = rateLimit(
      `insights:${userId}`,
      INSIGHTS_RATE_LIMIT,
      INSIGHTS_RATE_WINDOW_MS,
    );
    if (!allowed) {
      return { ok: false, error: "Too many requests — please wait a few minutes before regenerating insights again." };
    }

    const sb = serverAdmin();

    const [profile, metrics, recordsRes] = await Promise.all([
      getProfile(),
      listMetrics(),
      sb
        .from("records")
        .select("type, title, record_date, summary, parsed_data")
        .eq("user_id", userId)
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

  const locale = await getLocale();
  const llm = getLLM();
  const insights = await llm.generateInsights(ctx, locale);

  // Replace stored insights atomically-ish: delete then insert.
  await sb.from("insights").delete().eq("user_id", userId);
  if (insights.length > 0) {
    const { error } = await sb.from("insights").insert(
      insights.map((i) => ({
        user_id: userId,
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
    return { ok: true, count: insights.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
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

  const userId = await requireUserId();
  const sb = serverAdmin();
  const { error } = await sb.from("medication_orders").insert({
    id,
    user_id: userId,
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
      .eq("user_id", userId)
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
  const userId = await requireUserId();
  const sb = serverAdmin();
  await sb
    .from("pharmacy_items")
    .update({ note: "Refill auth requested — pending doctor approval." })
    .eq("id", itemId)
    .eq("user_id", userId);
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
  const userId = await requireUserId();
  const sb = serverAdmin();
  const token = genToken();
  const hours = opts?.hoursValid ?? 72;
  const expires = new Date(Date.now() + hours * 3600 * 1000).toISOString();

  const { error } = await sb.from("share_tokens").insert({
    token,
    user_id: userId,
    expires_at: expires,
  });
  if (error) throw new Error(error.message);
  return token;
}

export async function revokeShareToken(token: string) {
  const userId = await requireUserId();
  const sb = serverAdmin();
  await sb
    .from("share_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token", token)
    .eq("user_id", userId);
  revalidatePath("/share");
}
