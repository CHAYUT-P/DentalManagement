/**
 * Shapes and constants for the patient file (full edition): the dental
 * chart, treatment plans and contracts, paperwork, files and recalls.
 */

import type { Bill } from "./billing";
import type { VisitItem } from "./staffTypes";

/* ── the chart ─────────────────────────────────────────────────────────── */

export type ToothStatus =
  | "sound"
  | "caries"
  | "filled"
  | "sealant"
  | "pulpotomy"
  | "rct"
  | "ssc"
  | "crown"
  | "missing"
  | "extracted"
  | "unerupted"
  | "mobile"
  | "impacted"
  | "implant"
  | "watch";

/** what each mark means, and how the chart draws it */
export const TOOTH_STATUSES: { key: ToothStatus; label: string; short: string; tone: string; surfaces?: boolean }[] = [
  { key: "caries", label: "ฟันผุ", short: "ผุ", tone: "caries", surfaces: true },
  { key: "watch", label: "เฝ้าระวัง", short: "ระวัง", tone: "watch" },
  { key: "filled", label: "อุดแล้ว", short: "อุด", tone: "filled", surfaces: true },
  { key: "sealant", label: "เคลือบหลุมร่องฟัน", short: "SL", tone: "sealant" },
  { key: "pulpotomy", label: "รักษาประสาทฟันน้ำนม", short: "PO", tone: "done" },
  { key: "rct", label: "รักษารากฟัน", short: "RCT", tone: "done" },
  { key: "ssc", label: "ครอบฟันเหล็ก (SSC)", short: "SSC", tone: "crown" },
  { key: "crown", label: "ครอบฟัน", short: "CR", tone: "crown" },
  { key: "extracted", label: "ถอนแล้ว", short: "ถอน", tone: "gone" },
  { key: "missing", label: "ไม่มีฟัน", short: "หาย", tone: "gone" },
  { key: "unerupted", label: "ยังไม่ขึ้น", short: "UE", tone: "gone" },
  { key: "mobile", label: "ฟันโยก", short: "โยก", tone: "watch" },
  { key: "impacted", label: "ฟันคุด", short: "คุด", tone: "watch" },
  { key: "implant", label: "รากเทียม", short: "IMP", tone: "crown" },
  { key: "sound", label: "ปกติ (ล้างเครื่องหมาย)", short: "", tone: "sound" },
];

export const toothStatusLabel = (s: string) => TOOTH_STATUSES.find((t) => t.key === s)?.label ?? s;

/** FDI rows as you face the patient: upper right → upper left, lower right → lower left */
export const PERMANENT_UPPER = ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"];
export const PERMANENT_LOWER = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];
export const PRIMARY_UPPER = ["55", "54", "53", "52", "51", "61", "62", "63", "64", "65"];
export const PRIMARY_LOWER = ["85", "84", "83", "82", "81", "71", "72", "73", "74", "75"];

/** front teeth have an incisal edge (I) instead of an occlusal surface (O) */
export const isAnterior = (tooth: string) => ["1", "2", "3"].includes(tooth[1]);
export const surfacesFor = (tooth: string) => (isAnterior(tooth) ? ["M", "I", "D", "B", "L"] : ["M", "O", "D", "B", "L"]);

/** which set to open with: baby teeth under 6, mixed 6–12, adult from 13 */
export function chartSetForAge(age: number | undefined): "primary" | "mixed" | "permanent" {
  if (age == null) return "mixed";
  if (age < 6) return "primary";
  if (age < 13) return "mixed";
  return "permanent";
}

export interface ToothRow {
  tooth: string;
  status: ToothStatus;
  surfaces: string[];
  note: string;
  dentistSlug: string | null;
  updatedAt: string;
}

export interface ToothEventRow extends ToothRow {
  id: number;
}

/* ── plans, estimates, contracts ───────────────────────────────────────── */

export type PlanStatus = "draft" | "accepted" | "in_progress" | "done" | "cancelled";
export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  draft: "ร่าง / ใบเสนอราคา",
  accepted: "ตกลงแล้ว",
  in_progress: "กำลังรักษา",
  done: "เสร็จแล้ว",
  cancelled: "ยกเลิก",
};

export interface PlanItemRow {
  id?: number;
  treatmentKey: string | null;
  name: string;
  teeth: string;
  qty: number;
  unitPrice: number;
  discount: number;
  status: "planned" | "done" | "cancelled";
  doneAt: string | null;
}

export interface PlanRow {
  id: number;
  title: string;
  kind: "plan" | "contract";
  status: PlanStatus;
  agreedTotal: number | null;
  note: string;
  dentistSlug: string | null;
  items: PlanItemRow[];
  /** the items' value after their discounts */
  itemsTotal: number;
  /** money on bills linked to this plan (contracts) */
  paid: number;
  createdAt: string;
}

/* ── paperwork and files ───────────────────────────────────────────────── */

export type DocKind = "prescription" | "certificate" | "referral" | "consent";

export interface RxLine {
  name: string;
  strength: string;
  qty: string;
  unit: string;
  sig: string;
}

export interface ClinicalDocRow {
  id: number;
  kind: DocKind;
  date: string;
  dentistSlug: string | null;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface FileMeta {
  id: number;
  kind: "photo" | "xray" | "document";
  name: string;
  mime: string;
  size: number;
  note: string;
  createdAt: string;
}

export interface Medication {
  id: number;
  name: string;
  strength: string;
  unit: string;
  sig: string;
  isActive: boolean;
}

/* ── recalls ───────────────────────────────────────────────────────────── */

export type RecallStatus = "due" | "contacted" | "booked" | "done" | "skipped";

export interface RecallRow {
  id: number;
  childId: number;
  patientName: string;
  guardianName: string;
  phone: string;
  dueDate: string;
  reason: string;
  status: RecallStatus;
  contactNote: string;
  contactedAt: string | null;
  /** a LINE account this family booked with — reminders can go there */
  hasLine: boolean;
}

/* ── the whole file ────────────────────────────────────────────────────── */

export interface PatientVisit {
  kind: "booking" | "walkin";
  id: number;
  ref: string;
  date: string;
  time: string;
  status: string;
  dentistSlug: string | null;
  treatmentKey: string;
  items: VisitItem[];
  detail: string;
}

export interface PatientFileData {
  childId: number;
  guardianId: number;
  name: string;
  fullName: string;
  nickname: string;
  hn: string;
  birthdate: string | null;
  age: number | null;
  gender: string | null;
  idCard: string;
  bloodType: string;
  conditions: string;
  medications: string;
  allergies: string;
  notes: string;
  tags: string[];
  recallMonths: number;
  guardian: { name: string; fullName: string; relation: string; phone: string; lineContact: string; address: string };
  visits: PatientVisit[];
  bills: Bill[];
  /** money still owed across this patient's bills */
  owing: number;
  /** deposit left to spend */
  credit: number;
  chart: ToothRow[];
  chartHistory: ToothEventRow[];
  plans: PlanRow[];
  docs: ClinicalDocRow[];
  files: FileMeta[];
  recalls: RecallRow[];
}
