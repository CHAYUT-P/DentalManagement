/**
 * Reports for the owner (full edition): money in and out, treatments,
 * dentists and their DF, appointments, who still owes, cancelled receipts.
 * Everything is worked out from the same tables the cashier writes.
 */

import { and, eq, gte, lte, ne, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { appointment, child, expense, invoice, payment, stockItem } from "@/db/schema";
import { billsWhere } from "@/server/billing";
import type { PayMethod } from "@/lib/billing";

export interface ReportData {
  from: string;
  to: string;
  /** new money received in the range (deposits spent are not counted again) */
  received: number;
  byMethod: { method: PayMethod; amount: number }[];
  byDay: { date: string; amount: number }[];
  /** treatment sales: settled visit bills dated in the range */
  sales: number;
  bills: number;
  patients: number;
  newPatients: number;
  expenses: number;
  expensesByCategory: { category: string; amount: number }[];
  df: number;
  treatments: { key: string | null; name: string; count: number; revenue: number }[];
  dentists: { slug: string | null; visits: number; revenue: number; labCost: number; df: number }[];
  appointments: { total: number; completed: number; noShow: number; cancelled: number; online: number; phone: number; walkin: number };
  owing: { id: number; date: string; patientName: string; phone: string; receiptNo: string | null; balance: number }[];
  voided: { date: string; receiptNo: string | null; patientName: string; total: number; reason: string }[];
  stockValue: number;
  lowStock: number;
}

export async function report(from: string, to: string): Promise<ReportData> {
  const [pays, bills, exps, appts, kids, items, owingBills] = await Promise.all([
    db
      .select({ method: payment.method, amount: payment.amount, date: payment.date, status: invoice.status })
      .from(payment)
      .innerJoin(invoice, eq(invoice.id, payment.invoiceId))
      .where(and(gte(payment.date, from), lte(payment.date, to))),
    billsWhere(and(gte(invoice.date, from), lte(invoice.date, to))!),
    db.select().from(expense).where(and(gte(expense.date, from), lte(expense.date, to))),
    db.select({ status: appointment.status, source: appointment.source }).from(appointment).where(and(gte(appointment.date, from), lte(appointment.date, to))),
    db
      .select({ id: child.id })
      .from(child)
      .where(sql`(${child.createdAt} at time zone 'Asia/Bangkok')::date between ${from}::date and ${to}::date`),
    db.select({ qty: stockItem.qty, cost: stockItem.cost, minQty: stockItem.minQty, isActive: stockItem.isActive }).from(stockItem),
    billsWhere(ne(invoice.status, "void")),
  ]);

  const live = pays.filter((p) => p.status !== "void" && p.method !== "credit");
  const methods = [...new Set(live.map((p) => p.method))] as PayMethod[];
  const days = new Map<string, number>();
  for (const p of live) days.set(p.date, (days.get(p.date) ?? 0) + p.amount);

  const settled = bills.filter((b) => b.status === "paid" && b.kind !== "deposit");
  const treat = new Map<string, { key: string | null; name: string; count: number; revenue: number }>();
  const doc = new Map<string, { slug: string | null; visits: Set<number>; revenue: number; labCost: number; df: number }>();
  for (const b of settled) {
    const nets = b.items.map((i) => Math.max(0, i.qty * i.unitPrice - i.discount));
    const sum = nets.reduce((s, n) => s + n, 0);
    b.items.forEach((it, idx) => {
      const net = Math.round(nets[idx] - (sum > 0 ? (Math.min(b.discount, sum) * nets[idx]) / sum : 0));
      const tk = it.treatmentKey ?? `#${it.name}`;
      const t = treat.get(tk) ?? { key: it.treatmentKey, name: it.name, count: 0, revenue: 0 };
      t.count += it.qty;
      t.revenue += net;
      treat.set(tk, t);
      const dk = it.dentistSlug ?? "";
      const d = doc.get(dk) ?? { slug: it.dentistSlug, visits: new Set<number>(), revenue: 0, labCost: 0, df: 0 };
      d.visits.add(b.id);
      d.revenue += net;
      d.labCost += it.labCost;
      d.df += it.df;
      doc.set(dk, d);
    });
  }

  const cats = new Map<string, number>();
  for (const e of exps) cats.set(e.category, (cats.get(e.category) ?? 0) + e.amount);

  const visitBills = bills.filter((b) => b.status !== "void" && b.kind !== "deposit");
  const people = new Set(visitBills.map((b) => (b.childId ? `c${b.childId}` : `p${b.phone}${b.patientName}`)));

  return {
    from,
    to,
    received: live.reduce((s, p) => s + p.amount, 0),
    byMethod: methods.map((m) => ({ method: m, amount: live.filter((p) => p.method === m).reduce((s, p) => s + p.amount, 0) })),
    byDay: [...days.entries()].sort().map(([date, amount]) => ({ date, amount })),
    sales: settled.reduce((s, b) => s + b.total, 0),
    bills: settled.length,
    patients: people.size,
    newPatients: kids.length,
    expenses: exps.reduce((s, e) => s + e.amount, 0),
    expensesByCategory: [...cats.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    df: [...doc.values()].reduce((s, d) => s + d.df, 0),
    treatments: [...treat.values()].sort((a, b) => b.revenue - a.revenue),
    dentists: [...doc.values()]
      .map((d) => ({ slug: d.slug, visits: d.visits.size, revenue: d.revenue, labCost: d.labCost, df: d.df }))
      .sort((a, b) => b.revenue - a.revenue),
    appointments: {
      total: appts.length,
      completed: appts.filter((a) => a.status === "completed").length,
      noShow: appts.filter((a) => a.status === "no_show").length,
      cancelled: appts.filter((a) => a.status === "cancelled").length,
      online: appts.filter((a) => a.source === "online").length,
      phone: appts.filter((a) => a.source === "phone").length,
      walkin: appts.filter((a) => a.source === "walkin").length,
    },
    owing: owingBills
      .filter((b) => b.balance > 0)
      .map((b) => ({ id: b.id, date: b.date, patientName: b.patientName, phone: b.phone, receiptNo: b.receiptNo, balance: b.balance }))
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
    voided: bills
      .filter((b) => b.status === "void")
      .map((b) => ({ date: b.date, receiptNo: b.receiptNo, patientName: b.patientName, total: b.total, reason: b.voidReason })),
    stockValue: items.reduce((s, i) => s + Math.max(0, i.qty) * i.cost, 0),
    lowStock: items.filter((i) => i.isActive && i.qty <= i.minQty).length,
  };
}

/** one dentist's DF lines for a period — the statement they sign off */
export async function dfStatement(dentistSlug: string, from: string, to: string) {
  const bills = await billsWhere(and(gte(invoice.date, from), lte(invoice.date, to), eq(invoice.status, "paid"))!);
  const lines = bills
    .filter((b) => b.kind !== "deposit")
    .flatMap((b) =>
      b.items
        .filter((i) => i.dentistSlug === dentistSlug)
        .map((i) => ({
          date: b.date,
          receiptNo: b.receiptNo,
          patientName: b.patientName,
          item: i.name,
          teeth: i.teeth,
          qty: i.qty,
          amount: Math.max(0, i.qty * i.unitPrice - i.discount),
          labCost: i.labCost,
          df: i.df,
        })),
    )
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return {
    dentistSlug,
    from,
    to,
    lines,
    total: lines.reduce((s, l) => s + l.amount, 0),
    labCost: lines.reduce((s, l) => s + l.labCost, 0),
    df: lines.reduce((s, l) => s + l.df, 0),
  };
}

export type DfStatement = Awaited<ReturnType<typeof dfStatement>>;
