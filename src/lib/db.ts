/**
 * Server-side data accessors.
 *
 * Reads run as the logged-in user through the cookie-bound client, so RLS
 * (auth.uid() = user_id) enforces per-user isolation. The one exception is
 * the doctor share view, which is intentionally cross-user but gated by a
 * share token — those calls pass { userId, admin: true } and use the
 * service-role client.
 */

import "server-only";
import { supabaseServer, serverAdmin } from "./supabase";
import type {
  MedicalRecord,
  MetricSeries,
  MetricCategory,
  EmergencyProfile,
  RecordType,
  PharmacyItem,
  MedicationOrder,
  MedForm,
  DeliveryMethod,
  OrderStatus,
} from "./types";

/** Read options. Default = current session user via RLS. */
export type ReadOpts = { userId?: string; admin?: boolean };

async function readCtx(opts?: ReadOpts) {
  if (opts?.admin && opts.userId) {
    return { sb: serverAdmin(), userId: opts.userId };
  }
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { sb, userId: user.id };
}

// ---------- profile ----------

export async function getProfile(opts?: ReadOpts): Promise<EmergencyProfile | null> {
  const { sb, userId } = await readCtx(opts);
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
      ? { provider: data.insurance.provider, policyNumber: data.insurance.policy_number }
      : { provider: "", policyNumber: "" },
    primaryDoctor: data.primary_doctor ?? { name: "", phone: "" },
  };
}

// ---------- records ----------

export async function listRecords(opts?: ReadOpts): Promise<MedicalRecord[]> {
  const { sb, userId } = await readCtx(opts);
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

/** Signed URL for a stored record file (5-min TTL). Storage is service-role. */
export async function signedRecordUrl(filePath: string): Promise<string | null> {
  const sb = serverAdmin();
  const { data, error } = await sb.storage
    .from("record-files")
    .createSignedUrl(filePath, 300);
  if (error) return null;
  return data?.signedUrl ?? null;
}

// ---------- metrics ----------

const METRIC_META: Record<
  string,
  { label: string; unit: string; healthyRange?: [number, number]; category: MetricCategory }
> = {
  bp_sys: { label: "Blood Pressure (Systolic)", unit: "mmHg", healthyRange: [90, 130], category: "Vitals" },
  bp_dia: { label: "Blood Pressure (Diastolic)", unit: "mmHg", healthyRange: [60, 85], category: "Vitals" },
  weight: { label: "Weight", unit: "kg", healthyRange: [50, 90], category: "Vitals" },
  resting_hr: { label: "Resting Heart Rate", unit: "bpm", healthyRange: [55, 75], category: "Vitals" },
  sleep_hrs: { label: "Sleep", unit: "hrs/night", healthyRange: [7, 9], category: "Vitals" },
  glucose: { label: "Fasting Glucose", unit: "mg/dL", healthyRange: [70, 99], category: "Vitals" },
  hba1c: { label: "HbA1c", unit: "%", healthyRange: [4.0, 5.7], category: "Vitals" },
  ldl: { label: "LDL Cholesterol", unit: "mg/dL", healthyRange: [0, 100], category: "Cholesterol" },
  hdl: { label: "HDL Cholesterol", unit: "mg/dL", healthyRange: [40, 100], category: "Cholesterol" },
  triglycerides: { label: "Triglycerides", unit: "mg/dL", healthyRange: [0, 150], category: "Cholesterol" },
  total_chol: { label: "Total Cholesterol", unit: "mg/dL", healthyRange: [0, 200], category: "Cholesterol" },
  vitamin_d: { label: "Vitamin D (25-OH)", unit: "ng/mL", healthyRange: [30, 100], category: "Vitamins" },
  vitamin_b12: { label: "Vitamin B12", unit: "pg/mL", healthyRange: [200, 900], category: "Vitamins" },
  creatinine: { label: "Serum Creatinine", unit: "mg/dL", healthyRange: [0.7, 1.3], category: "Kidney" },
  alt: { label: "ALT (SGPT)", unit: "U/L", healthyRange: [0, 50], category: "Liver" },
  ast: { label: "AST (SGOT)", unit: "U/L", healthyRange: [0, 40], category: "Liver" },
  tsh: { label: "TSH", unit: "μIU/mL", healthyRange: [0.55, 4.78], category: "Thyroid" },
};

export async function listMetrics(opts?: ReadOpts): Promise<MetricSeries[]> {
  const { sb, userId } = await readCtx(opts);
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
    key: k,
    label: METRIC_META[k].label,
    unit: METRIC_META[k].unit,
    healthyRange: METRIC_META[k].healthyRange,
    category: METRIC_META[k].category,
    points: grouped.get(k) ?? [],
  }));
}

// ---------- insights ----------

export type Insight = {
  id: string;
  severity: "info" | "watch" | "alert";
  title: string;
  detail: string;
  suggestion: string;
  generatedAt: string;
};

export async function listInsights(opts?: ReadOpts): Promise<Insight[]> {
  const { sb, userId } = await readCtx(opts);
  const { data, error } = await sb
    .from("insights")
    .select("*")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    severity: r.severity as Insight["severity"],
    title: r.title,
    detail: r.detail,
    suggestion: r.suggestion,
    generatedAt: r.generated_at,
  }));
}

// ---------- pharmacy ----------

export async function listPharmacyItems(opts?: ReadOpts): Promise<PharmacyItem[]> {
  const { sb, userId } = await readCtx(opts);
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
    allergyClass: r.allergy_class ?? undefined,
  }));
}

export async function listMedicationOrders(opts?: ReadOpts): Promise<MedicationOrder[]> {
  const { sb, userId } = await readCtx(opts);
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

// ---------- share tokens (token-gated, cross-user) ----------

export type ShareToken = {
  token: string;
  userId: string;
  expiresAt: string;
  revokedAt: string | null;
  viewedCount: number;
  includeRecords: boolean;
  includeMetrics: boolean;
  includeProfile: boolean;
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
    includeRecords: data.include_records ?? true,
    includeMetrics: data.include_metrics ?? true,
    includeProfile: data.include_profile ?? true,
  };
}

export async function bumpShareView(token: string) {
  // Use a raw SQL increment to avoid the read-modify-write race that drops
  // counts when concurrent requests both read the same value before either
  // writes. Supabase exposes this via rpc or the PostgREST increment syntax.
  const sb = serverAdmin();
  await sb.rpc("increment_share_view", { p_token: token });
}
