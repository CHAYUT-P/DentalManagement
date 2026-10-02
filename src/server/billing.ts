/**
 * Billing (full edition): bills built from the room's visit record, payments,
 * receipt numbers, doctor fees (DF) and the day close. Same rules as
 * queries.ts — no `server-only` here, only server code imports it.
 */

import { and, asc, eq, inArray, like, ne, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  appointment,
  clinicSetting,
  dentist,
  dfRule,
  invoice,
  invoiceItem,
  payment,
  treatment,
  visitRecord,
  waitlistEntry,
} from "@/db/schema";
import {
  DEFAULT_BILLING_SETTINGS,
  billTotals,
  computeDf,
  type Bill,
  type BillItem,
  type BillingSettings,
  type BillStatus,
  type CashierDay,
  type DayClose,
  type DfMode,
  type DfRule,
  type PayMethod,
  type PendingVisit,
} from "@/lib/billing";
import { todayISO } from "@/lib/dates";
import { toTreatmentInfo } from "@/lib/treatments";
import type { VisitItem } from "@/lib/staffTypes";

const METHODS: PayMethod[] = ["cash", "transfer", "promptpay", "card", "other"];
const int = (n: unknown) => Math.max(0, Math.round(Number(n) || 0));

/* ── lookups ───────────────────────────────────────────────────────────── */

async function dentistMaps() {
  const rows = await db.select({ id: dentist.id, slug: dentist.slug }).from(dentist);
  return {
    toSlug: new Map(rows.map((r) => [r.id, r.slug])),
    toId: new Map(rows.map((r) => [r.slug, r.id])),
  };
}

async function catalog() {
  const rows = await db.select().from(treatment);
  return new Map(rows.map((r) => [r.key, toTreatmentInfo(r)]));
}

/* ── settings ──────────────────────────────────────────────────────────── */

export async function getBillingSettings(): Promise<BillingSettings> {
  const rows = await db.select().from(clinicSetting).where(eq(clinicSetting.key, "billing"));
  if (!rows[0]) return DEFAULT_BILLING_SETTINGS;
  try {
    return { ...DEFAULT_BILLING_SETTINGS, ...(JSON.parse(rows[0].value) as Partial<BillingSettings>) };
  } catch {
    return DEFAULT_BILLING_SETTINGS;
  }
}

export async function saveBillingSettings(input: Partial<BillingSettings>): Promise<void> {
  const cur = await getBillingSettings();
  const next: BillingSettings = {
    clinicName: String(input.clinicName ?? cur.clinicName).slice(0, 120),
    address: String(input.address ?? cur.address).slice(0, 300),
    phone: String(input.phone ?? cur.phone).slice(0, 40),
    taxId: String(input.taxId ?? cur.taxId).slice(0, 20),
    promptpayId: String(input.promptpayId ?? cur.promptpayId).replace(/[^\d]/g, "").slice(0, 15),
    receiptPrefix: String(input.receiptPrefix ?? cur.receiptPrefix).replace(/[^A-Za-z0-9]/g, "").slice(0, 6) || "RC",
    paper: input.paper === "slip" ? "slip" : input.paper === "a5" ? "a5" : cur.paper,
    footer: String(input.footer ?? cur.footer).slice(0, 200),
  };
  await db
    .insert(clinicSetting)
    .values({ key: "billing", value: JSON.stringify(next) })
    .onConflictDoUpdate({ target: clinicSetting.key, set: { value: JSON.stringify(next), updatedAt: new Date() } });
}

/* ── DF rules ──────────────────────────────────────────────────────────── */

export async function listDfRules(): Promise<DfRule[]> {
  const { toSlug } = await dentistMaps();
  const rows = await db.select().from(dfRule).orderBy(asc(dfRule.id));
  return rows.map((r) => ({
    id: r.id,
    dentistSlug: r.dentistId != null ? (toSlug.get(r.dentistId) ?? null) : null,
    treatmentKey: r.treatmentKey,
    mode: r.mode === "fixed" ? "fixed" : "percent",
    value: r.value,
  }));
}

/** set the rule for this dentist/treatment pair (null = any) */
export async function saveDfRule(input: {
  dentistSlug: string | null;
  treatmentKey: string | null;
  mode: DfMode;
  value: number;
}): Promise<void> {
  const { toId } = await dentistMaps();
  const dentistId = input.dentistSlug ? (toId.get(input.dentistSlug) ?? null) : null;
  if (input.dentistSlug && dentistId === null) return;
  const mode = input.mode === "fixed" ? "fixed" : "percent";
  const value = mode === "percent" ? Math.min(100, int(input.value)) : int(input.value);
  await db
    .insert(dfRule)
    .values({ dentistId, treatmentKey: input.treatmentKey || null, mode, value })
    .onConflictDoUpdate({
      target: [dfRule.dentistId, dfRule.treatmentKey],
      set: { mode, value, updatedAt: new Date() },
    });
}

export async function removeDfRule(id: number): Promise<void> {
  await db.delete(dfRule).where(eq(dfRule.id, id));
}

/* ── reading bills ─────────────────────────────────────────────────────── */

async function loadBills(where: ReturnType<typeof eq> | ReturnType<typeof and>): Promise<Bill[]> {
  const { toSlug } = await dentistMaps();
  const heads = await db.select().from(invoice).where(where).orderBy(asc(invoice.createdAt));
  if (heads.length === 0) return [];
  const ids = heads.map((h) => h.id);
  const [items, pays] = await Promise.all([
    db.select().from(invoiceItem).where(inArray(invoiceItem.invoiceId, ids)).orderBy(asc(invoiceItem.sort), asc(invoiceItem.id)),
    db.select().from(payment).where(inArray(payment.invoiceId, ids)).orderBy(asc(payment.createdAt)),
  ]);
  return heads.map((h) => {
    const lines: BillItem[] = items
      .filter((i) => i.invoiceId === h.id)
      .map((i) => ({
        id: i.id,
        treatmentKey: i.treatmentKey,
        name: i.name,
        teeth: i.teeth,
        qty: i.qty,
        unitPrice: i.unitPrice,
        discount: i.discount,
        labCost: i.labCost,
        dentistSlug: i.dentistId != null ? (toSlug.get(i.dentistId) ?? null) : null,
        df: i.df,
      }));
    const paysOf = pays
      .filter((p) => p.invoiceId === h.id)
      .map((p) => ({
        id: p.id,
        method: (METHODS.includes(p.method as PayMethod) ? p.method : "other") as PayMethod,
        amount: p.amount,
        date: p.date,
        note: p.note,
        at: p.createdAt.toISOString(),
      }));
    const { subtotal, total } = billTotals(lines, h.discount);
    const paid = paysOf.reduce((s, p) => s + p.amount, 0);
    return {
      id: h.id,
      receiptNo: h.receiptNo,
      status: h.status as BillStatus,
      date: h.date,
      appointmentId: h.appointmentId,
      waitlistId: h.waitlistId,
      patientName: h.patientName,
      phone: h.phone,
      dentistSlug: h.dentistId != null ? (toSlug.get(h.dentistId) ?? null) : null,
      discount: h.discount,
      note: h.note,
      voidReason: h.voidReason,
      items: lines,
      payments: paysOf,
      subtotal,
      total,
      paid,
      balance: Math.max(0, total - paid),
      createdAt: h.createdAt.toISOString(),
      paidAt: h.paidAt ? h.paidAt.toISOString() : null,
    };
  });
}

export async function getBill(id: number): Promise<Bill | null> {
  return (await loadBills(eq(invoice.id, id)))[0] ?? null;
}

/** everything the cashier screen shows for one day */
export async function cashierDay(date: string): Promise<CashierDay> {
  const bills = await loadBills(eq(invoice.date, date));
  const live = bills.filter((b) => b.status !== "void");
  const billedAppt = new Set(live.map((b) => b.appointmentId).filter((x): x is number => x != null));
  const billedWalk = new Set(live.map((b) => b.waitlistId).filter((x): x is number => x != null));

  const { toSlug } = await dentistMaps();
  const appts = await db
    .select()
    .from(appointment)
    .where(and(eq(appointment.date, date), inArray(appointment.status, ["arrived", "in_chair", "completed"])));
  // walk-ins carry no date column — the day is when the row was made
  const walks = await db
    .select()
    .from(waitlistEntry)
    .where(sql`(${waitlistEntry.createdAt} at time zone 'Asia/Bangkok')::date = ${date}::date`);
  const recs = await db
    .select({ a: visitRecord.appointmentId, w: visitRecord.waitlistId })
    .from(visitRecord);
  const recA = new Set(recs.map((r) => r.a).filter((x): x is number => x != null));
  const recW = new Set(recs.map((r) => r.w).filter((x): x is number => x != null));

  const pending: PendingVisit[] = [
    ...appts
      .filter((a) => !billedAppt.has(a.id))
      .map((a) => ({
        kind: "booking" as const,
        appointmentId: a.id,
        waitlistId: null,
        ref: a.ref,
        patientName: a.childName,
        phone: a.phone,
        dentistSlug: a.dentistId != null ? (toSlug.get(a.dentistId) ?? null) : null,
        time: a.checkedInAt ?? a.time,
        status: a.status,
        recorded: recA.has(a.id),
      })),
    ...walks
      .filter((w) => !billedWalk.has(w.id))
      .map((w) => ({
        kind: "walkin" as const,
        appointmentId: null,
        waitlistId: w.id,
        ref: `W-${w.id}`,
        patientName: w.childName,
        phone: w.guardianPhone,
        dentistSlug: w.dentistId != null ? (toSlug.get(w.dentistId) ?? null) : null,
        time: w.arrivedAt,
        status: w.status === "done" ? "completed" : w.status,
        recorded: recW.has(w.id),
      })),
  ].sort((a, b) => {
    // finished in the room first — those are the ones walking to the counter
    const rank = (s: string) => (s === "completed" ? 0 : s === "in_chair" ? 1 : 2);
    return rank(a.status) - rank(b.status) || (a.time < b.time ? -1 : 1);
  });

  return { date, bills, pending };
}

/* ── writing bills ─────────────────────────────────────────────────────── */

/**
 * The bill for a visit — the existing one, or a new one built from what the
 * room recorded (or, with no record, the booked treatment at list price).
 */
export async function openBillForVisit(input: { appointmentId?: number | null; waitlistId?: number | null }): Promise<number | null> {
  const apptId = input.appointmentId ?? null;
  const walkId = input.waitlistId ?? null;
  if ((apptId === null) === (walkId === null)) return null;

  const existing = await db
    .select({ id: invoice.id })
    .from(invoice)
    .where(and(apptId !== null ? eq(invoice.appointmentId, apptId) : eq(invoice.waitlistId, walkId!), ne(invoice.status, "void")))
    .limit(1);
  if (existing[0]) return existing[0].id;

  let head: { name: string; phone: string; dentistId: number | null; date: string; bookedKey: string; childId: number | null };
  if (apptId !== null) {
    const a = (await db.select().from(appointment).where(eq(appointment.id, apptId)))[0];
    if (!a) return null;
    head = { name: a.childName, phone: a.phone, dentistId: a.dentistId, date: a.date, bookedKey: a.treatmentKey, childId: a.childId };
  } else {
    const w = (await db.select().from(waitlistEntry).where(eq(waitlistEntry.id, walkId!)))[0];
    if (!w) return null;
    head = { name: w.childName, phone: w.guardianPhone, dentistId: w.dentistId, date: todayISO(w.createdAt), bookedKey: w.treatmentKey, childId: null };
  }

  const rec = (
    await db
      .select()
      .from(visitRecord)
      .where(apptId !== null ? eq(visitRecord.appointmentId, apptId) : eq(visitRecord.waitlistId, walkId!))
  )[0];
  const cat = await catalog();
  const dentistId = rec?.dentistId ?? head.dentistId;
  const recItems = (Array.isArray(rec?.items) ? (rec.items as VisitItem[]) : []).filter((i) => i?.key);
  const lines: { treatmentKey: string; name: string; teeth: string; qty: number; unitPrice: number }[] = recItems.length
    ? recItems.map((i) => ({
        treatmentKey: i.key,
        name: cat.get(i.key)?.name.th ?? i.key,
        teeth: i.teeth ?? "",
        qty: int(i.qty) || 1,
        unitPrice: int(i.price),
      }))
    : (
        (rec && Array.isArray(rec.treatments) && rec.treatments.length ? (rec.treatments as string[]) : [head.bookedKey])
      ).map((k, idx, arr) => ({
        treatmentKey: k,
        name: cat.get(k)?.name.th ?? k,
        teeth: "",
        qty: 1,
        // an older record's single price belongs to its only treatment
        unitPrice: arr.length === 1 && rec?.price != null ? int(rec.price) : int(cat.get(k)?.price),
      }));

  const [created] = await db
    .insert(invoice)
    .values({
      date: head.date,
      appointmentId: apptId,
      waitlistId: walkId,
      childId: head.childId,
      patientName: head.name,
      phone: head.phone,
      dentistId,
    })
    .returning({ id: invoice.id });
  if (lines.length) {
    await db.insert(invoiceItem).values(
      lines.map((l, i) => ({ invoiceId: created.id, ...l, dentistId, sort: i })),
    );
  }
  await refreshDf(created.id);
  return created.id;
}

/** a bill with no visit behind it — a product sale, a family paying a balance */
export async function openBlankBill(input: { patientName: string; phone: string }): Promise<number> {
  const [created] = await db
    .insert(invoice)
    .values({ date: todayISO(), patientName: input.patientName.trim().slice(0, 80) || "ลูกค้าทั่วไป", phone: input.phone.trim().slice(0, 20) })
    .returning({ id: invoice.id });
  return created.id;
}

/** replace the lines, the bill discount and the note; DF is worked out again */
export async function saveBill(
  id: number,
  input: { items: BillItem[]; discount: number; note: string; patientName?: string },
): Promise<boolean> {
  const head = (await db.select().from(invoice).where(eq(invoice.id, id)))[0];
  // a settled receipt is final — cancel it and bill again instead
  if (!head || head.status === "void" || head.status === "paid") return false;
  const { toId } = await dentistMaps();
  const lines = (input.items ?? []).slice(0, 60).map((i, idx) => ({
    invoiceId: id,
    treatmentKey: i.treatmentKey || null,
    name: String(i.name ?? "").trim().slice(0, 120) || "รายการ",
    teeth: String(i.teeth ?? "").slice(0, 60),
    qty: Math.max(1, int(i.qty)),
    unitPrice: int(i.unitPrice),
    discount: int(i.discount),
    labCost: int(i.labCost),
    dentistId: i.dentistSlug ? (toId.get(i.dentistSlug) ?? null) : null,
    sort: idx,
  }));
  await db.transaction(async (tx) => {
    await tx.delete(invoiceItem).where(eq(invoiceItem.invoiceId, id));
    if (lines.length) await tx.insert(invoiceItem).values(lines);
    await tx
      .update(invoice)
      .set({
        discount: int(input.discount),
        note: String(input.note ?? "").slice(0, 300),
        ...(input.patientName?.trim() ? { patientName: input.patientName.trim().slice(0, 80) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(invoice.id, id));
  });
  await refreshDf(id);
  await settleStatus(id);
  return true;
}

/** recompute each line's DF from the current rules */
async function refreshDf(id: number): Promise<void> {
  const bill = await getBill(id);
  if (!bill) return;
  const dfs = computeDf(bill.items, bill.discount, await listDfRules());
  await Promise.all(
    bill.items.map((it, idx) =>
      it.id != null && it.df !== dfs[idx]
        ? db.update(invoiceItem).set({ df: dfs[idx] }).where(eq(invoiceItem.id, it.id))
        : null,
    ),
  );
}

/** open → partial → paid from the money in; stamps paidAt once */
async function settleStatus(id: number): Promise<void> {
  const bill = await getBill(id);
  if (!bill || bill.status === "void") return;
  const status: BillStatus =
    bill.paid <= 0 ? "open" : bill.paid >= bill.total ? "paid" : "partial";
  await db
    .update(invoice)
    .set({
      status,
      paidAt: status === "paid" ? (bill.paidAt ? new Date(bill.paidAt) : new Date()) : null,
      updatedAt: new Date(),
    })
    .where(eq(invoice.id, id));
}

/** the next receipt number for this month: RC + พ.ศ. year + month + running */
async function nextReceiptNo(prefix: string, date: string): Promise<string> {
  const [y, m] = date.split("-");
  const stem = `${prefix}${String(Number(y) + 543).slice(-2)}${m}-`;
  const rows = await db
    .select({ no: invoice.receiptNo })
    .from(invoice)
    .where(like(invoice.receiptNo, `${stem}%`));
  const max = rows.reduce((mx, r) => Math.max(mx, Number(r.no?.slice(stem.length)) || 0), 0);
  return `${stem}${String(max + 1).padStart(4, "0")}`;
}

/** take money; the first payment gives the bill its receipt number */
export async function addPayment(
  id: number,
  input: { method: PayMethod; amount: number; note?: string },
): Promise<{ ok: boolean; receiptNo?: string }> {
  const head = (await db.select().from(invoice).where(eq(invoice.id, id)))[0];
  const amount = int(input.amount);
  if (!head || head.status === "void" || amount <= 0) return { ok: false };
  const method = METHODS.includes(input.method) ? input.method : "other";
  const today = todayISO();

  await db.insert(payment).values({ invoiceId: id, method, amount, date: today, note: String(input.note ?? "").slice(0, 120) });

  let receiptNo = head.receiptNo;
  if (!receiptNo) {
    const { receiptPrefix } = await getBillingSettings();
    // two counters taking money at once can race for a number — retry on the unique index
    for (let attempt = 0; attempt < 5 && !receiptNo; attempt++) {
      const candidate = await nextReceiptNo(receiptPrefix, today);
      try {
        await db.update(invoice).set({ receiptNo: candidate }).where(eq(invoice.id, id));
        receiptNo = candidate;
      } catch {
        // taken — try the next one
      }
    }
  }
  await settleStatus(id);
  return { ok: true, receiptNo: receiptNo ?? undefined };
}

/** cancel a bill — kept, with the reason, for the day-close audit */
export async function voidBill(id: number, reason: string): Promise<boolean> {
  const why = reason.trim().slice(0, 200);
  if (!why) return false;
  await db
    .update(invoice)
    .set({ status: "void", voidReason: why, voidedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(invoice.id, id), ne(invoice.status, "void")));
  return true;
}

/* ── day close ─────────────────────────────────────────────────────────── */

export async function dayClose(date: string): Promise<DayClose> {
  // money in today, whichever day the bill belongs to — not from voided bills
  const pays = await db
    .select({ method: payment.method, amount: payment.amount, status: invoice.status })
    .from(payment)
    .innerJoin(invoice, eq(invoice.id, payment.invoiceId))
    .where(eq(payment.date, date));
  const byMethod = METHODS.map((m) => {
    const rows = pays.filter((p) => p.method === m && p.status !== "void");
    return { method: m, amount: rows.reduce((s, r) => s + r.amount, 0), count: rows.length };
  }).filter((r) => r.count > 0);

  const bills = await loadBills(eq(invoice.date, date));
  const live = bills.filter((b) => b.status !== "void");
  const settled = live.filter((b) => b.status === "paid");
  const owingBills = live.filter((b) => b.balance > 0);

  const per = new Map<string, { lines: number; revenue: number; labCost: number; df: number }>();
  for (const b of settled) {
    const nets = b.items.map((i) => Math.max(0, i.qty * i.unitPrice - i.discount));
    const sum = nets.reduce((s, n) => s + n, 0);
    b.items.forEach((it, idx) => {
      const key = it.dentistSlug ?? "";
      const row = per.get(key) ?? { lines: 0, revenue: 0, labCost: 0, df: 0 };
      const share = sum > 0 ? (Math.min(b.discount, sum) * nets[idx]) / sum : 0;
      row.lines += 1;
      row.revenue += Math.round(nets[idx] - share);
      row.labCost += it.labCost;
      row.df += it.df;
      per.set(key, row);
    });
  }

  return {
    date,
    byMethod,
    received: byMethod.reduce((s, r) => s + r.amount, 0),
    billsPaid: settled.length,
    billsOwing: owingBills.length,
    owing: owingBills.reduce((s, b) => s + b.balance, 0),
    dentists: [...per.entries()]
      .map(([slug, r]) => ({ dentistSlug: slug || null, ...r }))
      .sort((a, b) => b.df - a.df),
    voided: bills
      .filter((b) => b.status === "void")
      .map((b) => ({ receiptNo: b.receiptNo, patientName: b.patientName, total: b.total, reason: b.voidReason })),
  };
}

/** the patient's next booking after a given day — printed on the receipt */
export async function nextVisitFor(phone: string, after: string): Promise<{ date: string; time: string } | null> {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return null;
  const rows = await db
    .select({ date: appointment.date, time: appointment.time, phone: appointment.phone })
    .from(appointment)
    .where(and(eq(appointment.status, "confirmed"), sql`${appointment.date} > ${after}`))
    .orderBy(asc(appointment.date), asc(appointment.time));
  const hit = rows.find((r) => r.phone.replace(/\D/g, "") === digits);
  return hit ? { date: hit.date, time: hit.time } : null;
}
