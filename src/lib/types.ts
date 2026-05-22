export type RecordType =
  | "lab"
  | "prescription"
  | "imaging"
  | "visit"
  | "vaccination";

export type MedicalRecord = {
  id: string;
  type: RecordType;
  title: string;
  doctor: string;
  facility: string;
  date: string; // ISO
  summary: string;
  fileName?: string;
  tags?: string[];
};

export type MetricPoint = { date: string; value: number };

export type MetricSeries = {
  key: "bp_sys" | "bp_dia" | "weight" | "glucose" | "resting_hr" | "sleep_hrs";
  label: string;
  unit: string;
  healthyRange?: [number, number];
  points: MetricPoint[];
};

export type Insight = {
  id: string;
  severity: "info" | "watch" | "alert";
  title: string;
  detail: string;
  suggestion: string;
};

export type EmergencyProfile = {
  name: string;
  dob: string;
  bloodType: string;
  allergies: string[];
  conditions: string[];
  medications: { name: string; dose: string; frequency: string }[];
  emergencyContacts: { name: string; relation: string; phone: string }[];
  insurance: { provider: string; policyNumber: string };
  primaryDoctor: { name: string; phone: string };
};

export type MedForm = "tablet" | "capsule" | "inhaler" | "injection" | "topical";

export type PharmacyItem = {
  id: string;
  name: string;
  dose: string;
  form: MedForm;
  packSize: string;
  price: number; // USD per fill
  refillsLeft: number;
  prescribedBy: string;
  rxRecordId?: string; // links to a MedicalRecord of type "prescription"
  note?: string;
};

export type DeliveryMethod = "pickup" | "standard" | "express";

export type OrderStatus = "processing" | "shipped" | "delivered";

export type OrderItem = {
  name: string;
  dose: string;
  qty: number;
  price: number;
};

export type MedicationOrder = {
  id: string;
  items: OrderItem[];
  delivery: DeliveryMethod;
  total: number;
  placedAt: string; // ISO
  status: OrderStatus;
};
