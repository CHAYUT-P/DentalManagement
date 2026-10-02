/**
 * Billing shapes and the money maths the cashier screen and the server share
 * (full edition). Everything is whole baht — Thai clinics don't bill satang.
 */

export type PayMethod = "cash" | "transfer" | "promptpay" | "card" | "other" | "credit";

export const PAY_METHODS: { key: PayMethod; label: string }[] = [
  { key: "cash", label: "เงินสด" },
  { key: "promptpay", label: "พร้อมเพย์" },
  { key: "transfer", label: "โอนเงิน" },
  { key: "card", label: "บัตรเครดิต" },
  { key: "other", label: "อื่น ๆ" },
  { key: "credit", label: "หักเงินมัดจำ" },
];

export const payMethodLabel = (m: string) => PAY_METHODS.find((p) => p.key === m)?.label ?? m;

export type BillStatus = "open" | "partial" | "paid" | "void";

export interface BillItem {
  id?: number;
  /** null = a free-text line (product, lab fee…) */
  treatmentKey: string | null;
  name: string;
  teeth: string;
  qty: number;
  unitPrice: number;
  /** baht off this line */
  discount: number;
  /** what the lab charged for this line — comes off before a % DF */
  labCost: number;
  dentistSlug: string | null;
  /** the doctor fee, worked out by the server when the bill is saved */
  df: number;
}

export interface BillPayment {
  id: number;
  method: PayMethod;
  amount: number;
  date: string;
  note: string;
  /** ISO time it was taken */
  at: string;
}

export interface Bill {
  id: number;
  receiptNo: string | null;
  status: BillStatus;
  date: string;
  appointmentId: number | null;
  waitlistId: number | null;
  patientName: string;
  phone: string;
  dentistSlug: string | null;
  /** the patient file this bill belongs to, when known */
  childId: number | null;
  /** deposit the patient still has to spend ("credit" payments) */
  credit: number;
  /** a contract (ortho) this bill pays an instalment of */
  planId: number | null;
  /** "deposit" = money taken to keep on account, not a treatment sale */
  kind: "visit" | "deposit";
  discount: number;
  note: string;
  voidReason: string;
  items: BillItem[];
  payments: BillPayment[];
  subtotal: number;
  total: number;
  paid: number;
  balance: number;
  createdAt: string;
  paidAt: string | null;
}

/** a visit today that has no bill yet — the cashier opens one from it */
export interface PendingVisit {
  kind: "booking" | "walkin";
  appointmentId: number | null;
  waitlistId: number | null;
  ref: string;
  patientName: string;
  phone: string;
  dentistSlug: string | null;
  /** booked time, or arrival time for a walk-in */
  time: string;
  /** "arrived" | "in_chair" | "completed" for bookings; waitlist status for walk-ins */
  status: string;
  /** what the room recorded, if anything */
  recorded: boolean;
}

export interface CashierDay {
  date: string;
  bills: Bill[];
  pending: PendingVisit[];
}

export interface DayCloseDentist {
  dentistSlug: string | null;
  lines: number;
  /** what the lines came to after discounts */
  revenue: number;
  labCost: number;
  df: number;
}

export interface DayClose {
  date: string;
  /** money received on this day, by method ("credit" = deposit spent, not new money) */
  byMethod: { method: PayMethod; amount: number; count: number }[];
  /** new money in — deposits spent are not counted again */
  received: number;
  /** bills dated today that are settled */
  billsPaid: number;
  /** bills dated today still owing, and how much */
  billsOwing: number;
  owing: number;
  /** DF for bills dated today that are settled */
  dentists: DayCloseDentist[];
  voided: { receiptNo: string | null; patientName: string; total: number; reason: string }[];
}

export interface BillingSettings {
  clinicName: string;
  address: string;
  phone: string;
  /** เลขประจำตัวผู้เสียภาษี — printed when set */
  taxId: string;
  /** phone or tax id the PromptPay QR pays to; empty = no QR */
  promptpayId: string;
  /** receipt numbers look like RC6910-0001 */
  receiptPrefix: string;
  paper: "a5" | "slip";
  footer: string;
}

export const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  clinicName: "คลินิกทันตกรรมเด็ก Denta Kids",
  address: "",
  phone: "",
  taxId: "",
  promptpayId: "",
  receiptPrefix: "RC",
  paper: "a5",
  footer: "ขอบคุณที่ไว้วางใจ Denta Kids",
};

export type DfMode = "percent" | "fixed";

export interface DfRule {
  id: number;
  /** null = any dentist */
  dentistSlug: string | null;
  /** null = any treatment */
  treatmentKey: string | null;
  mode: DfMode;
  /** percent (0–100) or baht per unit */
  value: number;
}

/* ── the maths ─────────────────────────────────────────────────────────── */

const int = (n: unknown) => Math.max(0, Math.round(Number(n) || 0));

export function lineGross(i: Pick<BillItem, "qty" | "unitPrice">): number {
  return int(i.qty) * int(i.unitPrice);
}

/** a line after its own discount — never below zero */
export function lineNet(i: Pick<BillItem, "qty" | "unitPrice" | "discount">): number {
  return Math.max(0, lineGross(i) - int(i.discount));
}

export function billTotals(items: Pick<BillItem, "qty" | "unitPrice" | "discount">[], discount: number) {
  const subtotal = items.reduce((s, i) => s + lineNet(i), 0);
  const total = Math.max(0, subtotal - int(discount));
  return { subtotal, total };
}

/** the most specific rule wins: dentist+treatment → treatment → dentist → clinic */
export function pickDfRule(rules: DfRule[], dentistSlug: string | null, treatmentKey: string | null) {
  const find = (d: string | null, t: string | null) =>
    rules.find((r) => r.dentistSlug === d && r.treatmentKey === t);
  return (
    (dentistSlug && treatmentKey ? find(dentistSlug, treatmentKey) : undefined) ??
    (treatmentKey ? find(null, treatmentKey) : undefined) ??
    (dentistSlug ? find(dentistSlug, null) : undefined) ??
    find(null, null)
  );
}

/**
 * The doctor fee for each line. The bill-wide discount is shared across the
 * lines by their value, then a percentage applies to what is left after the
 * lab cost; a fixed fee is per unit. Lines with no dentist earn no DF.
 */
export function computeDf(
  items: Pick<BillItem, "qty" | "unitPrice" | "discount" | "labCost" | "dentistSlug" | "treatmentKey">[],
  billDiscount: number,
  rules: DfRule[],
): number[] {
  const nets = items.map(lineNet);
  const sum = nets.reduce((s, n) => s + n, 0);
  const off = Math.min(int(billDiscount), sum);
  return items.map((item, idx) => {
    if (!item.dentistSlug) return 0;
    const rule = pickDfRule(rules, item.dentistSlug, item.treatmentKey);
    if (!rule) return 0;
    if (rule.mode === "fixed") return int(rule.value) * Math.max(1, int(item.qty));
    const share = sum > 0 ? (off * nets[idx]) / sum : 0;
    const base = Math.max(0, nets[idx] - share - int(item.labCost));
    return Math.round((base * Math.min(100, int(rule.value))) / 100);
  });
}

export const baht = (n: number) => `฿${Math.round(n).toLocaleString("th-TH")}`;
