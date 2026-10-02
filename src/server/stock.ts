/**
 * Stock, suppliers & labs, expenses and lab orders (full edition). A paid
 * bill takes what it sold and what its treatments use out of stock; a
 * cancelled bill puts it back.
 */

import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  dentist,
  expense,
  invoiceItem,
  labOrder,
  stockItem,
  stockMove,
  supplier,
  treatmentConsumable,
} from "@/db/schema";
import { todayISO } from "@/lib/dates";
import type {
  Consumable,
  Expense,
  LabOrder,
  LabStatus,
  MoveKind,
  StockCategory,
  StockItem,
  StockMove,
  Supplier,
} from "@/lib/stock";

const int = (n: unknown) => Math.round(Number(n) || 0);
const pos = (n: unknown) => Math.max(0, int(n));
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/* ── suppliers & labs ──────────────────────────────────────────────────── */

export async function listSuppliers(): Promise<Supplier[]> {
  const rows = await db.select().from(supplier).orderBy(asc(supplier.name));
  return rows.map((r) => ({ ...r, kind: r.kind === "lab" ? "lab" : "supplier" }));
}

export async function saveSupplier(input: Partial<Supplier> & { name: string }): Promise<number | null> {
  const values = {
    name: str(input.name, 120),
    kind: input.kind === "lab" ? "lab" : "supplier",
    phone: str(input.phone, 40),
    contact: str(input.contact, 120),
    note: str(input.note, 300),
    isActive: input.isActive !== false,
  };
  if (!values.name) return null;
  if (input.id) {
    await db.update(supplier).set(values).where(eq(supplier.id, input.id));
    return input.id;
  }
  const [row] = await db.insert(supplier).values(values).returning({ id: supplier.id });
  return row.id;
}

/* ── items ─────────────────────────────────────────────────────────────── */

export async function listStock(): Promise<StockItem[]> {
  const today = todayISO();
  const [items, dated] = await Promise.all([
    db.select().from(stockItem).orderBy(asc(stockItem.category), asc(stockItem.name)),
    db
      .select({ itemId: stockMove.itemId, expiry: stockMove.expiry })
      .from(stockMove)
      .where(and(eq(stockMove.kind, "receive"), gte(stockMove.expiry, today))),
  ]);
  return items.map((i) => {
    const exp = dated.filter((d) => d.itemId === i.id && d.expiry).map((d) => d.expiry!).sort()[0] ?? null;
    return {
      id: i.id,
      name: i.name,
      category: i.category as StockCategory,
      unit: i.unit,
      cost: i.cost,
      price: i.price,
      minQty: i.minQty,
      qty: i.qty,
      sellable: i.sellable,
      supplierId: i.supplierId,
      note: i.note,
      isActive: i.isActive,
      low: i.isActive && i.qty <= i.minQty,
      nextExpiry: exp,
    };
  });
}

export async function saveStockItem(input: Partial<StockItem> & { name: string }): Promise<number | null> {
  const values = {
    name: str(input.name, 120),
    category: ["material", "drug", "product", "other"].includes(String(input.category)) ? String(input.category) : "material",
    unit: str(input.unit, 20) || "ชิ้น",
    cost: pos(input.cost),
    price: pos(input.price),
    minQty: pos(input.minQty),
    sellable: !!input.sellable,
    supplierId: input.supplierId ?? null,
    note: str(input.note, 300),
    isActive: input.isActive !== false,
  };
  if (!values.name) return null;
  if (input.id) {
    await db.update(stockItem).set(values).where(eq(stockItem.id, input.id));
    return input.id;
  }
  const [row] = await db.insert(stockItem).values(values).returning({ id: stockItem.id });
  return row.id;
}

/* ── moves ─────────────────────────────────────────────────────────────── */

/** out-going kinds always subtract, whatever sign was typed */
const OUT: MoveKind[] = ["use", "sell", "expire", "return"];

export async function addMove(input: {
  itemId: number;
  kind: MoveKind;
  qty: number;
  unitCost?: number;
  lot?: string;
  expiry?: string | null;
  note?: string;
  invoiceId?: number | null;
  date?: string;
}): Promise<void> {
  const kind: MoveKind = ["receive", "use", "sell", "adjust", "expire", "return"].includes(input.kind) ? input.kind : "adjust";
  const n = int(input.qty);
  const change = OUT.includes(kind) ? -Math.abs(n) : kind === "receive" ? Math.abs(n) : n;
  if (!change) return;
  await db.insert(stockMove).values({
    itemId: input.itemId,
    change,
    kind,
    unitCost: pos(input.unitCost),
    invoiceId: input.invoiceId ?? null,
    lot: str(input.lot, 40),
    expiry: isDate(input.expiry) ? input.expiry : null,
    note: str(input.note, 200),
    date: isDate(input.date) ? input.date : todayISO(),
  });
  await db
    .update(stockItem)
    .set({
      qty: sql`${stockItem.qty} + ${change}`,
      // receiving at a new price updates what the item costs
      ...(kind === "receive" && pos(input.unitCost) > 0 ? { cost: pos(input.unitCost) } : {}),
    })
    .where(eq(stockItem.id, input.itemId));
}

export async function listMoves(filter: { itemId?: number; from?: string; to?: string }): Promise<StockMove[]> {
  const conds = [];
  if (filter.itemId) conds.push(eq(stockMove.itemId, filter.itemId));
  if (isDate(filter.from)) conds.push(gte(stockMove.date, filter.from));
  if (isDate(filter.to)) conds.push(lte(stockMove.date, filter.to));
  const rows = await db
    .select({ m: stockMove, name: stockItem.name, unit: stockItem.unit })
    .from(stockMove)
    .innerJoin(stockItem, eq(stockItem.id, stockMove.itemId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(stockMove.createdAt))
    .limit(400);
  return rows.map(({ m, name, unit }) => ({
    id: m.id,
    itemId: m.itemId,
    itemName: name,
    unit,
    change: m.change,
    kind: m.kind as MoveKind,
    unitCost: m.unitCost,
    invoiceId: m.invoiceId,
    lot: m.lot,
    expiry: m.expiry,
    note: m.note,
    date: m.date,
  }));
}

/* ── what treatments use ───────────────────────────────────────────────── */

export async function listConsumables(): Promise<Consumable[]> {
  return db.select().from(treatmentConsumable);
}

/** replace the list of what one treatment uses */
export async function setConsumables(treatmentKey: string, lines: { itemId: number; qty: number }[]): Promise<void> {
  await db.delete(treatmentConsumable).where(eq(treatmentConsumable.treatmentKey, treatmentKey));
  const clean = lines.filter((l) => l.itemId && pos(l.qty) > 0).slice(0, 30);
  if (clean.length) {
    await db
      .insert(treatmentConsumable)
      .values(clean.map((l) => ({ treatmentKey, itemId: l.itemId, qty: pos(l.qty) })))
      .onConflictDoNothing();
  }
}

/**
 * A bill was settled: products sold and what its treatments use come out of
 * stock. Runs once per bill (moves carry the bill id).
 */
export async function applyStockForBill(invoiceId: number): Promise<void> {
  const done = await db.select({ id: stockMove.id }).from(stockMove).where(eq(stockMove.invoiceId, invoiceId)).limit(1);
  if (done.length) return;
  const lines = await db.select().from(invoiceItem).where(eq(invoiceItem.invoiceId, invoiceId));
  const keys = [...new Set(lines.map((l) => l.treatmentKey).filter((k): k is string => !!k))];
  const uses = keys.length ? await db.select().from(treatmentConsumable).where(inArray(treatmentConsumable.treatmentKey, keys)) : [];
  for (const l of lines) {
    if (l.stockItemId) await addMove({ itemId: l.stockItemId, kind: "sell", qty: l.qty, invoiceId, note: l.name });
    if (l.treatmentKey) {
      for (const u of uses.filter((x) => x.treatmentKey === l.treatmentKey)) {
        await addMove({ itemId: u.itemId, kind: "use", qty: u.qty * l.qty, invoiceId, note: l.name });
      }
    }
  }
}

/** a bill was cancelled: whatever it took out goes back on the shelf */
export async function reverseStockForBill(invoiceId: number): Promise<void> {
  const moves = await db.select().from(stockMove).where(eq(stockMove.invoiceId, invoiceId));
  for (const m of moves) {
    await db.update(stockItem).set({ qty: sql`${stockItem.qty} - ${m.change}` }).where(eq(stockItem.id, m.itemId));
  }
  if (moves.length) await db.delete(stockMove).where(eq(stockMove.invoiceId, invoiceId));
}

/* ── expenses ──────────────────────────────────────────────────────────── */

export async function listExpenses(from: string, to: string): Promise<Expense[]> {
  const rows = await db
    .select()
    .from(expense)
    .where(and(gte(expense.date, from), lte(expense.date, to)))
    .orderBy(desc(expense.date), desc(expense.id));
  return rows.map((r) => ({ id: r.id, date: r.date, category: r.category, amount: r.amount, supplierId: r.supplierId, method: r.method, note: r.note }));
}

export async function saveExpense(input: Partial<Expense> & { category: string; amount: number }): Promise<void> {
  const values = {
    date: isDate(input.date) ? input.date : todayISO(),
    category: str(input.category, 60) || "อื่น ๆ",
    amount: pos(input.amount),
    supplierId: input.supplierId ?? null,
    method: str(input.method, 20) || "cash",
    note: str(input.note, 300),
  };
  if (!values.amount) return;
  if (input.id) await db.update(expense).set(values).where(eq(expense.id, input.id));
  else await db.insert(expense).values(values);
}

export async function removeExpense(id: number): Promise<void> {
  await db.delete(expense).where(eq(expense.id, id));
}

/* ── lab orders ────────────────────────────────────────────────────────── */

export async function listLabOrders(filter: { open?: boolean; childId?: number }): Promise<LabOrder[]> {
  const conds = [];
  if (filter.open) conds.push(inArray(labOrder.status, ["sent", "received", "remake"]));
  if (filter.childId) conds.push(eq(labOrder.childId, filter.childId));
  const [rows, ds] = await Promise.all([
    db.select().from(labOrder).where(conds.length ? and(...conds) : undefined).orderBy(desc(labOrder.sentDate), desc(labOrder.id)).limit(300),
    db.select({ id: dentist.id, slug: dentist.slug }).from(dentist),
  ]);
  const slug = new Map(ds.map((d) => [d.id, d.slug]));
  return rows.map((r) => ({
    id: r.id,
    childId: r.childId,
    patientName: r.patientName,
    labId: r.labId,
    dentistSlug: r.dentistId != null ? (slug.get(r.dentistId) ?? null) : null,
    work: r.work,
    teeth: r.teeth,
    shade: r.shade,
    sentDate: r.sentDate,
    dueDate: r.dueDate,
    receivedDate: r.receivedDate,
    cost: r.cost,
    status: r.status as LabStatus,
    note: r.note,
  }));
}

export async function saveLabOrder(input: Partial<LabOrder> & { patientName: string; work: string }): Promise<void> {
  const ds = await db.select({ id: dentist.id, slug: dentist.slug }).from(dentist);
  const status: LabStatus = ["sent", "received", "fitted", "remake", "cancelled"].includes(String(input.status))
    ? (input.status as LabStatus)
    : "sent";
  const values = {
    childId: input.childId ?? null,
    patientName: str(input.patientName, 80),
    labId: input.labId ?? null,
    dentistId: input.dentistSlug ? (ds.find((d) => d.slug === input.dentistSlug)?.id ?? null) : null,
    work: str(input.work, 160),
    teeth: str(input.teeth, 60),
    shade: str(input.shade, 20),
    sentDate: isDate(input.sentDate) ? input.sentDate : todayISO(),
    dueDate: isDate(input.dueDate) ? input.dueDate : null,
    receivedDate: isDate(input.receivedDate) ? input.receivedDate : status === "received" ? todayISO() : null,
    cost: pos(input.cost),
    status,
    note: str(input.note, 300),
  };
  if (!values.patientName || !values.work) return;
  if (input.id) await db.update(labOrder).set(values).where(eq(labOrder.id, input.id));
  else await db.insert(labOrder).values(values);
}

export async function removeLabOrder(id: number): Promise<void> {
  await db.delete(labOrder).where(eq(labOrder.id, id));
}
