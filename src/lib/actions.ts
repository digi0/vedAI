"use server";

/**
 * Server actions — mutations called from client components via forms.
 *
 * Same demo-phase rules as db.ts: every write uses DEMO_USER_ID and the
 * service_role client. Once auth lands, switch to a per-request server
 * client with the session UID.
 */

import { revalidatePath } from "next/cache";
import { serverAdmin, DEMO_USER_ID } from "./supabase";
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
 * Upload a record file to storage. Called from the client via a FormData
 * action. Stores under <DEMO_USER_ID>/<uuid>.<ext>.
 */
export async function uploadRecordFile(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No file provided.");
  }

  const sb = serverAdmin();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${DEMO_USER_ID}/${crypto.randomUUID()}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await sb.storage
    .from("record-files")
    .upload(path, bytes, { contentType: file.type || undefined });

  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

  // Create a record stub for the upload — user can edit metadata later.
  const title = (form.get("title") as string) || file.name.replace(/\.[^.]+$/, "");
  const type = ((form.get("type") as string) || "lab") as RecordType;

  const { error: insErr } = await sb.from("records").insert({
    user_id: DEMO_USER_ID,
    type,
    title,
    record_date: new Date().toISOString().slice(0, 10),
    summary: "Pending review. Tap to add notes, doctor, and tags.",
    file_path: path,
  });
  if (insErr) throw new Error(insErr.message);

  revalidatePath("/records");
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
