/**
 * Server-side data accessors.
 *
 * Every function in this file is SERVER-ONLY — they use the service_role
 * client which bypasses RLS. Never import from a client component.
 *
 * During the demo phase, all reads/writes default to DEMO_USER_ID. Once
 * auth lands, swap the userId arg for the session UID and most of these
 * helpers move to the browser anon client.
 */

import "server-only";
import { serverAdmin, DEMO_USER_ID } from "./supabase";
import type {
  MedicalRecord,
  MetricSeries,
  EmergencyProfile,
  RecordType,
  PharmacyItem,
  MedicationOrder,
  MedForm,
  DeliveryMethod,
  OrderStatus,
} from "./types";

// ---------- profile ----------

export async function getProfile(
  userId: string = DEMO_USER_ID,
): Promise<EmergencyProfile | null> {
  const sb = serverAdmin();
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    name: data.full_name,
    dob: data.dob,
    bloodType: data.blood_type,
    allergies: data.allergies ?? [],
    conditions: data.conditions ?? [],
    medications: data.medications ?? [],
    emergencyContacts: data.emergency_contacts ?? [],
    insurance: data.insurance
      ? {
          provider: data.insurance.provider,
          policyNumber: data.insurance.policy_number,
        }
      : { provider: "", policyNumber: "" },
    primaryDoctor: data.primary_doctor ?? { name: "", phone: "" },
  };
}

// ---------- records ----------

export async function listRecords(
  userId: string = DEMO_USER_ID,
): Promise<MedicalRecord[]> {
  const sb = serverAdmin();
  const { data, error } = await sb
    .from("records")
    .select("*")
    .eq("user_id", userId)
    .order("record_date", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToRecord);
}

function rowToRecord(r: {
  id: string;
  type: string;
  title: string;
  doctor: string | null;
  facility: string | null;
  record_date: string;
  summary: string | null;
  file_path: string | null;
  tags: string[] | null;
}): MedicalRecord {
  return {
    id: r.id,
    type: r.type as RecordType,
    title: r.title,
    doctor: r.doctor ?? "",
    facility: r.facility ?? "",
    date: r.record_date,
    summary: r.summary ?? "",
    fileName: r.file_path ?? undefined,
    tags: r.tags ?? [],
  };
}

/** Generate a signed URL for a stored record file (60s TTL). */
export async function signedRecordUrl(filePath: string): Promise<string | null> {
  const sb = serverAdmin();
  const { data, error } = await sb.storage
    .from("record-files")
    .createSignedUrl(filePath, 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

// ---------- metrics ----------

const METRIC_META: Record<
  string,
  { label: string; unit: string; healthyRange?: [number, number] }
> = {
  bp_sys: { label: "Blood Pressure (Systolic)", unit: "mmHg", healthyRange: [90, 130] },
  bp_dia: { label: "Blood Pressure (Diastolic)", unit: "mmHg", healthyRange: [60, 85] },
  weight: { label: "Weight", unit: "kg", healthyRange: [68, 78] },
  glucose: { label: "Fasting Glucose", unit: "mg/dL", healthyRange: [70, 99] },
  resting_hr: { label: "Resting Heart Rate", unit: "bpm", healthyRange: [55, 75] },
  sleep_hrs: { label: "Sleep", unit: "hrs/night", healthyRange: [7, 9] },
};

export async function listMetrics(
  userId: string = DEMO_USER_ID,
): Promise<MetricSeries[]> {
  const sb = serverAdmin();
  const { data, error } = await sb
    .from("metrics_readings")
    .select("key, value, taken_at")
    .eq("user_id", userId)
    .order("taken_at", { ascending: true });

  if (error) throw error;

  const grouped = new Map<string, { date: string; value: number }[]>();
  for (const row of data ?? []) {
    const arr = grouped.get(row.key) ?? [];
    arr.push({ date: row.taken_at, value: Number(row.value) });
    grouped.set(row.key, arr);
  }

  return Object.keys(METRIC_META).map((k) => ({
    key: k as MetricSeries["key"],
    label: METRIC_META[k].label,
    unit: METRIC_META[k].unit,
    healthyRange: METRIC_META[k].healthyRange,
    points: grouped.get(k) ?? [],
  }));
}

// ---------- pharmacy ----------

export async function listPharmacyItems(
  userId: string = DEMO_USER_ID,
): Promise<PharmacyItem[]> {
  const sb = serverAdmin();
  const { data, error } = await sb
    .from("pharmacy_items")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    dose: r.dose,
    form: r.form as MedForm,
    packSize: r.pack_size,
    price: Number(r.price),
    refillsLeft: r.refills_left,
    prescribedBy: r.prescribed_by ?? "",
    rxRecordId: r.rx_record_id ?? undefined,
    note: r.note ?? undefined,
  }));
}

export async function listMedicationOrders(
  userId: string = DEMO_USER_ID,
): Promise<MedicationOrder[]> {
  const sb = serverAdmin();
  const { data, error } = await sb
    .from("medication_orders")
    .select("*")
    .eq("user_id", userId)
    .order("placed_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    items: r.items,
    delivery: r.delivery as DeliveryMethod,
    total: Number(r.total),
    placedAt: r.placed_at,
    status: r.status as OrderStatus,
  }));
}

// ---------- share tokens ----------

export type ShareToken = {
  token: string;
  userId: string;
  expiresAt: string;
  revokedAt: string | null;
  viewedCount: number;
};

export async function getShareByToken(token: string): Promise<ShareToken | null> {
  const sb = serverAdmin();
  const { data, error } = await sb
    .from("share_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;
  return {
    token: data.token,
    userId: data.user_id,
    expiresAt: data.expires_at,
    revokedAt: data.revoked_at,
    viewedCount: data.viewed_count,
  };
}

export async function bumpShareView(token: string) {
  const existing = await getShareByToken(token);
  if (!existing) return;
  const sb = serverAdmin();
  await sb
    .from("share_tokens")
    .update({ viewed_count: existing.viewedCount + 1 })
    .eq("token", token);
}
