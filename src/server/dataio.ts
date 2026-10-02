/**
 * Moving data in and out (full edition): patient lists to and from CSV —
 * so the clinic can bring its records over from the old program bit by bit
 * — and bills/payments out for the accountant.
 */

import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db/client";
import { child, guardian, invoice } from "@/db/schema";
import { billsWhere } from "@/server/billing";
import { payMethodLabel } from "@/lib/billing";
import type { ImportField } from "@/lib/dataio";

const digits = (s: string) => (s || "").replace(/\D/g, "");
const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: unknown[][]) => "﻿" + rows.map((r) => r.map(cell).join(",")).join("\n");

/** 31/12/2560, 31-12-2017, 2017-12-31 → 2017-12-31 (Thai years accepted) */
function toIso(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let y: number, m: number, d: number;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (dmy) [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
  else return null;
  if (y < 100) y += 2500; // two-digit years in Thai clinics are almost always พ.ศ.
  if (y > 2400) y -= 543;
  if (!m || m > 12 || !d || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export async function exportPatientsCsv(): Promise<string> {
  const [gs, cs] = await Promise.all([db.select().from(guardian), db.select().from(child)]);
  const rows: unknown[][] = [
    ["HN", "ชื่อเล่น/ชื่อเรียก", "ชื่อ-นามสกุล", "วันเกิด", "เพศ", "เลขบัตรประชาชน", "แพ้ยา", "โรคประจำตัว", "ยาประจำ", "หมายเหตุ", "ผู้ปกครอง", "ความสัมพันธ์", "เบอร์โทร", "LINE", "ที่อยู่"],
  ];
  for (const c of cs) {
    const g = gs.find((x) => x.id === c.guardianId);
    rows.push([
      c.hn ?? "",
      c.name,
      c.fullName,
      c.birthdate ?? "",
      c.gender === "male" ? "ชาย" : c.gender === "female" ? "หญิง" : "",
      c.idCard,
      c.allergies,
      c.conditions,
      c.medications,
      c.notes,
      g?.fullName || g?.name || "",
      g?.relation ?? "",
      g?.phone ?? "",
      g?.lineContact ?? "",
      g?.address ?? "",
    ]);
  }
  return csv(rows);
}

/**
 * Bring patients in. Each row needs a phone and a name; a family is found by
 * phone (or made), the patient by name / full name / HN within it (or made).
 * Fields left empty in the file never wipe what is already recorded.
 */
export async function importPatients(rows: Partial<Record<ImportField, string>>[]): Promise<{ created: number; updated: number; skipped: number }> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const gs = await db.select().from(guardian);
  for (const raw of rows.slice(0, 1000)) {
    const r = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, String(v ?? "").trim()])) as Partial<Record<ImportField, string>>;
    const phone = digits(r.phone ?? "");
    const name = r.name || r.fullName || "";
    if (phone.length < 9 || !name) {
      skipped++;
      continue;
    }
    let g = gs.find((x) => digits(x.phone) === phone);
    if (!g) {
      [g] = await db
        .insert(guardian)
        .values({
          name: r.guardian || `ผู้ปกครอง ${name}`,
          fullName: r.guardian ?? "",
          relation: r.relation ?? "",
          phone,
          lineContact: r.line ?? "",
          address: r.address ?? "",
        })
        .returning();
      gs.push(g);
    } else {
      const patch = {
        ...(r.guardian && !g.fullName ? { fullName: r.guardian } : {}),
        ...(r.relation && !g.relation ? { relation: r.relation } : {}),
        ...(r.line && !g.lineContact ? { lineContact: r.line } : {}),
        ...(r.address && !g.address ? { address: r.address } : {}),
      };
      if (Object.keys(patch).length) await db.update(guardian).set(patch).where(eq(guardian.id, g.id));
    }
    const kids = await db.select().from(child).where(eq(child.guardianId, g.id));
    const hit = kids.find(
      (c) => (r.hn && c.hn === r.hn) || c.name === name || (r.fullName && c.fullName === r.fullName) || (r.name && c.nickname === r.name),
    );
    const fields = {
      ...(r.fullName ? { fullName: r.fullName } : {}),
      ...(r.hn ? { hn: r.hn } : {}),
      ...(r.birthdate && toIso(r.birthdate) ? { birthdate: toIso(r.birthdate) } : {}),
      ...(r.gender ? { gender: /ญ|f/i.test(r.gender) ? "female" : /ช|m/i.test(r.gender) ? "male" : null } : {}),
      ...(r.idCard ? { idCard: digits(r.idCard).slice(0, 13) } : {}),
      ...(r.allergies ? { allergies: r.allergies } : {}),
      ...(r.conditions ? { conditions: r.conditions } : {}),
      ...(r.medications ? { medications: r.medications } : {}),
      ...(r.notes ? { notes: r.notes } : {}),
    };
    if (hit) {
      if (Object.keys(fields).length) await db.update(child).set({ ...fields, updatedAt: new Date() }).where(eq(child.id, hit.id));
      updated++;
    } else {
      await db.insert(child).values({ guardianId: g.id, name, ...fields }).onConflictDoNothing();
      created++;
    }
  }
  return { created, updated, skipped };
}

/** every bill and payment in a period — one line per payment, for the accountant */
export async function exportBillsCsv(from: string, to: string): Promise<string> {
  const bills = await billsWhere(and(gte(invoice.date, from), lte(invoice.date, to))!);
  const rows: unknown[][] = [["วันที่", "เลขที่ใบเสร็จ", "สถานะ", "ผู้รับบริการ", "เบอร์โทร", "รายการ", "ยอดสุทธิ", "ชำระวันที่", "ช่องทาง", "จำนวนเงิน", "เหตุผลที่ยกเลิก"]];
  for (const b of bills) {
    const items = b.items.map((i) => `${i.name}${i.teeth ? ` (${i.teeth})` : ""}${i.qty > 1 ? ` x${i.qty}` : ""}`).join("; ");
    const status = b.status === "paid" ? "ชำระครบ" : b.status === "void" ? "ยกเลิก" : b.status === "partial" ? "ชำระบางส่วน" : "ยังไม่ชำระ";
    if (b.payments.length === 0) rows.push([b.date, b.receiptNo ?? "", status, b.patientName, b.phone, items, b.total, "", "", 0, b.voidReason]);
    for (const p of b.payments) rows.push([b.date, b.receiptNo ?? "", status, b.patientName, b.phone, items, b.total, p.date, payMethodLabel(p.method), p.amount, b.voidReason]);
  }
  return csv(rows);
}
