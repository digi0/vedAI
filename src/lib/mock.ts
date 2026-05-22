import type {
  MedicalRecord,
  MetricSeries,
  Insight,
  EmergencyProfile,
  PharmacyItem,
  DeliveryMethod,
  MedicationOrder,
} from "./types";

export const profile: EmergencyProfile = {
  name: "Raghav Malpani",
  dob: "1999-08-14",
  bloodType: "O+",
  allergies: ["Penicillin", "Peanuts"],
  conditions: ["Mild asthma", "Borderline hypertension"],
  medications: [
    { name: "Albuterol", dose: "90mcg", frequency: "As needed" },
    { name: "Lisinopril", dose: "10mg", frequency: "Daily, morning" },
  ],
  emergencyContacts: [
    { name: "Priya Malpani", relation: "Sister", phone: "+1 (415) 555-0142" },
    { name: "Dr. Anita Rao", relation: "PCP", phone: "+1 (415) 555-0188" },
  ],
  insurance: { provider: "Blue Shield CA", policyNumber: "BSC-998-77421" },
  primaryDoctor: { name: "Dr. Anita Rao, MD", phone: "+1 (415) 555-0188" },
};

export const records: MedicalRecord[] = [
  {
    id: "r1",
    type: "lab",
    title: "Comprehensive Metabolic Panel",
    doctor: "Dr. Anita Rao",
    facility: "Bay Area Health Clinic",
    date: "2026-04-12",
    summary:
      "All values within normal range. Slight elevation in fasting glucose (102 mg/dL).",
    fileName: "cmp-2026-04-12.pdf",
    tags: ["routine", "blood"],
  },
  {
    id: "r2",
    type: "prescription",
    title: "Lisinopril 10mg",
    doctor: "Dr. Anita Rao",
    facility: "Bay Area Health Clinic",
    date: "2026-03-02",
    summary: "Daily, morning. For borderline hypertension. 90-day refill.",
    fileName: "rx-lisinopril-2026-03-02.pdf",
    tags: ["bp", "daily"],
  },
  {
    id: "r3",
    type: "imaging",
    title: "Chest X-Ray",
    doctor: "Dr. M. Chen",
    facility: "Stanford Radiology",
    date: "2026-01-22",
    summary:
      "Clear lung fields. No acute cardiopulmonary process. Follow-up not required.",
    fileName: "cxr-2026-01-22.pdf",
    tags: ["asthma", "imaging"],
  },
  {
    id: "r4",
    type: "visit",
    title: "Annual Physical",
    doctor: "Dr. Anita Rao",
    facility: "Bay Area Health Clinic",
    date: "2025-11-08",
    summary:
      "BP 132/86. Weight 78kg. Discussed sleep hygiene and exercise plan. Labs ordered.",
    fileName: "visit-2025-11-08.pdf",
    tags: ["checkup"],
  },
  {
    id: "r5",
    type: "vaccination",
    title: "Influenza (Quadrivalent)",
    doctor: "CVS Pharmacist",
    facility: "CVS MinuteClinic",
    date: "2025-10-15",
    summary: "Seasonal flu vaccine. No adverse reaction.",
    tags: ["vaccine"],
  },
  {
    id: "r6",
    type: "lab",
    title: "Lipid Panel",
    doctor: "Dr. Anita Rao",
    facility: "Bay Area Health Clinic",
    date: "2025-11-10",
    summary:
      "LDL 138 mg/dL (slightly elevated). HDL 52. Triglycerides 140. Total 218.",
    fileName: "lipid-2025-11-10.pdf",
    tags: ["cholesterol"],
  },
];

const months = [
  "2025-12-01",
  "2026-01-01",
  "2026-02-01",
  "2026-03-01",
  "2026-04-01",
  "2026-05-01",
];

export const metrics: MetricSeries[] = [
  {
    key: "bp_sys",
    label: "Blood Pressure (Systolic)",
    unit: "mmHg",
    healthyRange: [90, 130],
    points: months.map((d, i) => ({
      date: d,
      value: [134, 132, 131, 128, 127, 125][i],
    })),
  },
  {
    key: "bp_dia",
    label: "Blood Pressure (Diastolic)",
    unit: "mmHg",
    healthyRange: [60, 85],
    points: months.map((d, i) => ({
      date: d,
      value: [86, 85, 84, 82, 81, 80][i],
    })),
  },
  {
    key: "weight",
    label: "Weight",
    unit: "kg",
    healthyRange: [68, 78],
    points: months.map((d, i) => ({
      date: d,
      value: [80, 79.4, 78.9, 78.1, 77.4, 76.8][i],
    })),
  },
  {
    key: "glucose",
    label: "Fasting Glucose",
    unit: "mg/dL",
    healthyRange: [70, 99],
    points: months.map((d, i) => ({
      date: d,
      value: [104, 103, 102, 101, 99, 98][i],
    })),
  },
  {
    key: "resting_hr",
    label: "Resting Heart Rate",
    unit: "bpm",
    healthyRange: [55, 75],
    points: months.map((d, i) => ({
      date: d,
      value: [74, 72, 71, 70, 68, 67][i],
    })),
  },
  {
    key: "sleep_hrs",
    label: "Sleep",
    unit: "hrs/night",
    healthyRange: [7, 9],
    points: months.map((d, i) => ({
      date: d,
      value: [6.2, 6.4, 6.5, 6.8, 7.0, 7.1][i],
    })),
  },
];

export const insights: Insight[] = [
  {
    id: "i1",
    severity: "watch",
    title: "Borderline cholesterol trending up",
    detail:
      "Your LDL was 138 mg/dL in Nov 2025 — above the optimal <100 mg/dL range. Combined with mildly elevated BP, this raises cardiovascular risk.",
    suggestion:
      "Aim for 30 min cardio 4×/week and reduce saturated fat. Re-check lipids in 3 months.",
  },
  {
    id: "i2",
    severity: "info",
    title: "Blood pressure improving",
    detail:
      "Systolic BP dropped from 134 → 125 mmHg over 6 months on Lisinopril. Diastolic also trending into healthy range.",
    suggestion:
      "Keep current medication and routine. Worth flagging to Dr. Rao at next visit for potential dose review.",
  },
  {
    id: "i3",
    severity: "watch",
    title: "Sleep is below target",
    detail:
      "Average sleep this period: 6.7 hrs/night. Chronic sleep <7 hrs correlates with elevated BP and impaired glucose control — both already on your radar.",
    suggestion:
      "Set a consistent wind-down at 10:30pm. Avoid screens 30 min before bed. Target 7.5 hrs.",
  },
  {
    id: "i4",
    severity: "alert",
    title: "Penicillin allergy — confirm at every prescription",
    detail:
      "You have a documented penicillin allergy. This must be flagged anytime an antibiotic is considered.",
    suggestion:
      "Share emergency profile (QR) with any new provider before they prescribe.",
  },
  {
    id: "i5",
    severity: "info",
    title: "Weight loss on track",
    detail:
      "Down 3.2 kg over 6 months — steady, sustainable rate. Likely contributing to BP and glucose improvements.",
    suggestion: "Maintain current pace. No intervention needed.",
  },
];

export const pharmacyItems: PharmacyItem[] = [
  {
    id: "m1",
    name: "Lisinopril",
    dose: "10mg",
    form: "tablet",
    packSize: "90 tablets / fill",
    price: 12,
    refillsLeft: 3,
    prescribedBy: "Dr. Anita Rao",
    rxRecordId: "r2",
    note: "Daily, morning — for borderline hypertension.",
  },
  {
    id: "m2",
    name: "Albuterol",
    dose: "90mcg",
    form: "inhaler",
    packSize: "1 inhaler · 200 doses",
    price: 28,
    refillsLeft: 2,
    prescribedBy: "Dr. Anita Rao",
    note: "As needed — rescue inhaler for mild asthma.",
  },
  {
    id: "m3",
    name: "Atorvastatin",
    dose: "20mg",
    form: "tablet",
    packSize: "30 tablets / fill",
    price: 15,
    refillsLeft: 0,
    prescribedBy: "Dr. Anita Rao",
    note: "Refill needs doctor re-authorization — LDL trending high.",
  },
];

export const deliveryOptions: {
  key: DeliveryMethod;
  label: string;
  eta: string;
  fee: number;
}[] = [
  { key: "pickup", label: "Pharmacy pickup", eta: "Ready in ~2 hrs", fee: 0 },
  { key: "standard", label: "Standard delivery", eta: "2–3 business days", fee: 4.99 },
  { key: "express", label: "Express delivery", eta: "Next business day", fee: 12.99 },
];

export const medicationOrders: MedicationOrder[] = [
  {
    id: "ORD-20260418-7741",
    items: [{ name: "Lisinopril", dose: "10mg", qty: 1, price: 12 }],
    delivery: "standard",
    total: 16.99,
    placedAt: "2026-04-18",
    status: "delivered",
  },
];
