/**
 * NOTE: no `server-only` import here on purpose — the seed and verification
 * scripts import these same query functions outside Next.js. The credential
 * boundary is src/db/index.ts (which does carry `server-only`); this file
 * only ever runs on the server in the app because only server code imports it.
 */

import { and, asc, desc, eq, gte, inArray, lte, ne } from "drizzle-orm";

import type { IconKey } from "@/data/icons";
import { minutesOf, weekday, weekdayIndex } from "@/lib/dates";
/**
 * The client instance is imported directly (not via "@/db", whose `server-only`
 * guard would also block the seed/verification scripts that legitimately reuse
 * these queries outside Next.js). Same builder, same env var.
 */
import { db } from "@/db/client";
import {
  appointment,
  child,
  clinicDay,
  clinicInfo,
  dentist,
  dentistShift,
  dentistText,
  dentistTreat,
  guardian,
  holiday,
  staffNotification,
  treatment,
  waitlistEntry,
  type AppointmentSource,
  type AppointmentStatus,
} from "@/db/schema";

/**
 * The Data Access Layer — the only module that talks to Postgres.
 *
 * Pages and server actions import from here; nothing else touches `db`
 * directly. Every function is small, named after what it returns, and returns
 * plain serialisable objects (DTOs) so they can cross the server/client
 * boundary safely.
 */

/* ══════════════════════════════════ shapes ══════════════════════════════ */

/** what the UI needs about a dentist — the two-language profile flattened */
export interface DentistDTO {
  id: number;
  slug: string;
  years: number;
  tint: string;
  face: Record<string, unknown>;
  photoSmall: string;
  photoLarge: string;
  isActive: boolean;
  treats: IconKey[];
  shifts: { weekday: number; enabled: boolean; start: string; end: string }[];
  text: Record<"th" | "en", DentistTextDTO>;
}

export interface DentistTextDTO {
  name: string;
  title: string;
  blurb: string;
  bio: string;
  credentials: string[];
  languages: string;
  days: string;
}

export interface TreatmentDTO {
  key: IconKey;
  price: number | null;
  durationMin: number;
}

export interface ClinicDayDTO {
  day: string;
  isOpen: boolean;
  start: string;
  end: string;
}

export interface HolidayDTO {
  id: number;
  start: string;
  end: string;
  name: string;
}

export interface AppointmentDTO {
  id: number;
  ref: string;
  date: string;
  time: string;
  durationMin: number;
  childId: number | null;
  childName: string;
  guardianId: number | null;
  guardianName: string;
  phone: string;
  dentistId: number;
  dentistSlug: string;
  dentistName: string;
  treatmentKey: IconKey;
  source: AppointmentSource;
  status: AppointmentStatus;
  note: string;
  price: number | null;
  forSelf: boolean;
}

export interface GuardianDTO {
  id: number;
  name: string;
  phone: string;
  lineUserId: string | null;
  children: {
    id: number;
    name: string;
    birthdate: string | null;
    age: number | null;
    allergies: string;
    notes: string;
    conditions: string;
    medications: string;
    hn: string | null;
    gender: string | null;
  }[];
  registeredAt: string;
}

export interface WaitlistDTO {
  id: number;
  childName: string;
  guardianPhone: string;
  treatmentKey: IconKey;
  dentistId: number | null;
  dentistSlug: string | null;
  arrivedAt: string;
  status: "waiting" | "in_chair" | "done";
  note: string;
}

export interface NotificationDTO {
  id: number;
  type: string;
  title: string;
  body: string;
  refCode: string | null;
  isRead: boolean;
  createdAt: string;
}

/* ══════════════════════════════════ mappers ═════════════════════════════ */

function asIconKey(k: string): IconKey {
  return k as IconKey;
}

/* ═══════════════════════════════ dentists ═══════════════════════════════ */

export async function listDentists(): Promise<DentistDTO[]> {
  const [rows, texts, treats, shifts] = await Promise.all([
    db.select().from(dentist).orderBy(asc(dentist.sort), asc(dentist.id)),
    db.select().from(dentistText),
    db.select().from(dentistTreat),
    db.select().from(dentistShift).orderBy(asc(dentistShift.weekday)),
  ]);

  return rows.map((d) => {
    const textRows = texts.filter((t) => t.dentistId === d.id);
    const th = textRows.find((t) => t.lang === "th");
    const en = textRows.find((t) => t.lang === "en");
    const mapText = (t?: typeof th): DentistTextDTO => ({
      name: t?.name ?? "",
      title: t?.title ?? "",
      blurb: t?.blurb ?? "",
      bio: t?.bio ?? "",
      credentials: (t?.credentials as string[]) ?? [],
      languages: t?.languages ?? "",
      days: t?.days ?? "",
    });
    return {
      id: d.id,
      slug: d.slug,
      years: d.years,
      tint: d.tint,
      face: (d.face as Record<string, unknown>) ?? {},
      photoSmall: d.photoSmall,
      photoLarge: d.photoLarge,
      isActive: d.isActive,
      treats: treats.filter((t) => t.dentistId === d.id).map((t) => asIconKey(t.treatmentKey)),
      shifts: shifts
        .filter((s) => s.dentistId === d.id)
        .map((s) => ({ weekday: s.weekday, enabled: s.enabled, start: s.start, end: s.end })),
      text: { th: mapText(th), en: mapText(en) },
    };
  });
}

/* ═══════════════════════════════ treatments ═════════════════════════════ */

export async function listTreatments(): Promise<TreatmentDTO[]> {
  const rows = await db
    .select()
    .from(treatment)
    .where(eq(treatment.isActive, true))
    .orderBy(asc(treatment.sort), asc(treatment.id));
  return rows.map((t) => ({
    key: asIconKey(t.key),
    price: t.price,
    durationMin: t.durationMin,
  }));
}

/** price map keyed by IconKey — the shape the staff console edits */
export async function priceMap(): Promise<Record<IconKey, number | null>> {
  const rows = await db.select().from(treatment);
  const out = {} as Record<IconKey, number | null>;
  for (const r of rows) out[asIconKey(r.key)] = r.price;
  return out;
}

/* ═══════════════════════════════ clinic config ══════════════════════════ */

export async function listClinicDays(): Promise<ClinicDayDTO[]> {
  return db
    .select({ day: clinicDay.day, isOpen: clinicDay.isOpen, start: clinicDay.start, end: clinicDay.end })
    .from(clinicDay)
    .orderBy(asc(clinicDay.id));
}

export async function listHolidays(): Promise<HolidayDTO[]> {
  const rows = await db.select().from(holiday).orderBy(asc(holiday.start));
  return rows.map((h) => ({ id: h.id, start: h.start, end: h.end, name: h.name }));
}

/* ─────────────────────────── clinic contact info ───────────────────────── */

export interface ClinicInfoDTO {
  phone: string;
  phoneDisplay: string;
  lineId: string;
  lineUrl: string;
  mapUrl: string;
  directionsUrl: string;
  addressTh: string;
  addressEn: string;
  landmarkTh: string;
  landmarkEn: string;
}

/** the single clinic_info row, or null when never seeded */
export async function getClinicInfo(): Promise<ClinicInfoDTO | null> {
  const rows = await db.select().from(clinicInfo).where(eq(clinicInfo.id, 1));
  const r = rows[0];
  if (!r) return null;
  return {
    phone: r.phone,
    phoneDisplay: r.phoneDisplay,
    lineId: r.lineId,
    lineUrl: r.lineUrl,
    mapUrl: r.mapUrl,
    directionsUrl: r.directionsUrl,
    addressTh: r.addressTh,
    addressEn: r.addressEn,
    landmarkTh: r.landmarkTh,
    landmarkEn: r.landmarkEn,
  };
}

export async function updateClinicInfo(patch: Partial<ClinicInfoDTO>): Promise<void> {
  await db
    .update(clinicInfo)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(clinicInfo.id, 1));
}

/* ═══════════════════════════════ availability ═══════════════════════════ */

/**
 * The bookable slot grid: every enabled dentist-shift on an open day gets one
 * row; a slot the dentist already has an appointment in is marked taken.
 * The patient calendar AND the staff schedule read from this one definition,
 * so they can never disagree about what is free.
 */
export interface SlotRow {
  dentistId: number;
  dentistSlug: string;
  time: string; // HH:MM
  taken: boolean;
}

export async function slotsForDate(date: string): Promise<SlotRow[]> {
  const weekdayKey = weekday(date);
  const weekdayNum = weekdayIndex(date);

  const [days, daysOff] = await Promise.all([
    db.select().from(clinicDay).where(eq(clinicDay.day, weekdayKey)),
    db
      .select()
      .from(holiday)
      .where(and(lte(holiday.start, date), gte(holiday.end, date))),
  ]);

  const open = days[0]?.isOpen && daysOff.length === 0;
  if (!open) return [];

  const active = await db
    .select({ id: dentist.id, slug: dentist.slug })
    .from(dentist)
    .where(eq(dentist.isActive, true));

  if (active.length === 0) return [];

  const activeIds = active.map((a) => a.id);
  const shifts = await db
    .select()
    .from(dentistShift)
    .where(and(eq(dentistShift.enabled, true), inArray(dentistShift.dentistId, activeIds)));

  const booked = await db
    .select({ dentistId: appointment.dentistId, time: appointment.time })
    .from(appointment)
    .where(and(eq(appointment.date, date), ne(appointment.status, "cancelled")));

  const takenSet = new Set(booked.map((b) => `${b.dentistId}:${b.time}`));

  const out: SlotRow[] = [];
  for (const d of active) {
    // only this weekday's shift — never the other six rows
    const shift = shifts.find((s) => s.dentistId === d.id && s.weekday === weekdayNum);
    if (!shift) continue;
    const startM = minutesOf(shift.start);
    const endM = minutesOf(shift.end);
    for (let m = startM; m + 30 <= endM; m += 30) {
      const hhmm = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      out.push({
        dentistId: d.id,
        dentistSlug: d.slug,
        time: hhmm,
        taken: takenSet.has(`${d.id}:${hhmm}`),
      });
    }
  }
  return out;
}

/** does any active dentist still have a free 30-min slot on this date? */
export async function dateHasRoom(date: string, today: string, nowMin: number): Promise<boolean> {
  if (date < today) return false;
  const slots = await slotsForDate(date);
  const leadMin = date === today ? nowMin + 60 : -1;
  return slots.some((s) => !s.taken && minutesOf(s.time) > leadMin);
}

/* ═══════════════════════════════ appointments ═══════════════════════════ */

export interface CreateAppointmentInput {
  date: string;
  time: string;
  treatmentKey: IconKey;
  dentistId: number;
  childName: string;
  guardianName: string;
  phone: string;
  /** booked for the booker themselves (adult) */
  forSelf?: boolean;
  source?: AppointmentSource;
  note?: string;
  price?: number | null;
}

/** make a booking reference: DK- plus four digits, retrying on collision */
async function nextRef(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const ref = `DK-${Math.floor(1000 + Math.random() * 9000)}`;
    const hit = await db.select({ id: appointment.id }).from(appointment).where(eq(appointment.ref, ref));
    if (hit.length === 0) return ref;
  }
  // vanishingly unlikely; fall back to a timestamp-suffixed ref
  return `DK-${Date.now() % 10000}`;
}

/**
 * Create an appointment. The unique index (dentist, date, time) is the real
 * double-booking guard; this returns null when the slot was taken mid-flight
 * so the caller can show "slot just filled".
 */
export async function createAppointment(input: CreateAppointmentInput): Promise<AppointmentDTO | null> {
  const ref = await nextRef();

  // match the family by phone — a first-time caller is registered so the
  // booking links to a real guardian/child, not just free text
  const digits = input.phone.replace(/\D/g, "");
  const fam = await findFamilyByPhone(digits);
  let guardianId = fam[0]?.id ?? null;
  let childId: number | null = fam[0]?.children.find((c) => c.name === input.childName)?.id ?? null;

  if (!guardianId) {
    guardianId = await upsertGuardian({ name: input.guardianName, phone: digits });
  }
  if (input.childName && !input.forSelf) {
    const name = input.childName.trim();
    const known = await findFamilyByPhone(digits);
    childId = known[0]?.children.find((c) => c.name === name)?.id ?? null;
    if (!childId) {
      await addChildToGuardian(guardianId, name);
      childId =
        (await findFamilyByPhone(digits))[0]?.children.find((c) => c.name === name)?.id ?? null;
    }
  }

  const inserted = await db
    .insert(appointment)
    .values({
      ref,
      childId,
      childName: input.childName,
      guardianId,
      guardianName: input.guardianName,
      phone: digits,
      dentistId: input.dentistId,
      treatmentKey: input.treatmentKey,
      date: input.date,
      time: input.time,
      durationMin: 30,
      source: input.source ?? "online",
      status: "confirmed",
      note: input.note ?? "",
      price: input.price ?? null,
      forSelf: input.forSelf ?? false,
    })
    // the arbiter matches the partial unique index (status <> 'cancelled'):
    // a live booking keeps its slot exclusive; cancelled ones free it
    .onConflictDoNothing({
      target: [appointment.dentistId, appointment.date, appointment.time],
      where: ne(appointment.status, "cancelled"),
    })
    .returning();

  const row = inserted[0];
  if (!row) return null; // slot taken mid-flight

  const d = await dentistName(row.dentistId);
  await db.insert(staffNotification).values({
    type: "online_booking",
    title: "การจองใหม่ออนไลน์",
    body: `${row.childName} นัดหมาย ${row.date} เวลา ${row.time} น. (${row.ref})`,
    refCode: row.ref,
  });

  return toAppointmentDTO(row, d.slug, d.name);
}

function toAppointmentDTO(
  row: typeof appointment.$inferSelect,
  dentistSlug: string,
  dentistName: string,
): AppointmentDTO {
  return {
    id: row.id,
    ref: row.ref,
    date: row.date,
    time: row.time,
    durationMin: row.durationMin,
    childId: row.childId,
    childName: row.childName,
    guardianId: row.guardianId,
    guardianName: row.guardianName,
    phone: row.phone,
    dentistId: row.dentistId,
    dentistSlug,
    dentistName,
    treatmentKey: asIconKey(row.treatmentKey),
    source: row.source as AppointmentSource,
    status: row.status as AppointmentStatus,
    note: row.note,
    price: row.price,
    forSelf: row.forSelf,
  };
}

async function dentistName(dentistId: number): Promise<{ slug: string; name: string }> {
  const rows = await db
    .select({ slug: dentist.slug, name: dentistText.name })
    .from(dentist)
    .leftJoin(dentistText, and(eq(dentistText.dentistId, dentist.id), eq(dentistText.lang, "th")))
    .where(eq(dentist.id, dentistId));
  const r = rows[0];
  return { slug: r?.slug ?? "", name: r?.name ?? "" };
}

export async function listAppointmentsBetween(start: string, end: string): Promise<AppointmentDTO[]> {
  const rows = await db
    .select({ a: appointment, slug: dentist.slug, dname: dentistText.name })
    .from(appointment)
    .leftJoin(dentist, eq(dentist.id, appointment.dentistId))
    .leftJoin(dentistText, and(eq(dentistText.dentistId, dentist.id), eq(dentistText.lang, "th")))
    .where(and(gte(appointment.date, start), lte(appointment.date, end)))
    .orderBy(asc(appointment.date), asc(appointment.time));

  return rows.map((r) =>
    toAppointmentDTO(
      r.a,
      r.slug ?? "",
      r.dname ?? "",
    ),
  );
}

export async function listAppointmentsByPhone(phone: string): Promise<AppointmentDTO[]> {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return [];
  return listAppointmentsBetween("1970-01-01", "9999-12-31").then((all) =>
    all.filter((a) => a.phone.replace(/\D/g, "") === digits),
  );
}

export interface AppointmentUpdate {
  status?: AppointmentStatus;
  date?: string;
  time?: string;
  dentistId?: number;
  note?: string;
  price?: number | null;
  childName?: string;
  guardianName?: string;
  phone?: string;
}

export async function updateAppointment(id: number, patch: AppointmentUpdate): Promise<void> {
  await db
    .update(appointment)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(appointment.id, id));
}

export async function deleteAppointment(id: number): Promise<void> {
  await db.delete(appointment).where(eq(appointment.id, id));
}

/* ═══════════════════════════════ patients ═══════════════════════════════ */

export async function findFamilyByPhone(phone: string): Promise<GuardianDTO[]> {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return [];

  const gs = await db.select().from(guardian).where(eq(guardian.phone, digits));
  if (gs.length === 0) return [];

  const cs = await db
    .select()
    .from(child)
    .where(inArray(child.guardianId, gs.map((g) => g.id)));

  return gs.map((g) => ({
    id: g.id,
    name: g.name,
    phone: g.phone,
    lineUserId: g.lineUserId,
    children: cs
      .filter((c) => c.guardianId === g.id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        birthdate: c.birthdate,
        age: c.age,
        allergies: c.allergies,
        notes: c.notes,
        conditions: c.conditions,
        medications: c.medications,
        hn: c.hn,
        gender: c.gender,
      })),
    registeredAt: g.createdAt.toISOString().slice(0, 10),
  }));
}

export async function listPatients(): Promise<GuardianDTO[]> {
  const [gs, cs] = await Promise.all([
    db.select().from(guardian).orderBy(asc(guardian.id)),
    db.select().from(child),
  ]);
  return gs.map((g) => ({
    id: g.id,
    name: g.name,
    phone: g.phone,
    lineUserId: g.lineUserId,
    children: cs
      .filter((c) => c.guardianId === g.id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        birthdate: c.birthdate,
        age: c.age,
        allergies: c.allergies,
        notes: c.notes,
        conditions: c.conditions,
        medications: c.medications,
        hn: c.hn,
        gender: c.gender,
      })),
    registeredAt: g.createdAt.toISOString().slice(0, 10),
  }));
}

export interface CreatePatientInput {
  name: string;
  phone: string;
  address?: string;
  children?: { name: string }[];
}

/** upsert on phone: a returning caller updates the name instead of doubling */
export async function upsertGuardian(input: CreatePatientInput): Promise<number> {
  const digits = input.phone.replace(/\D/g, "");
  const existing = await db.select().from(guardian).where(eq(guardian.phone, digits));
  let guardianId: number;

  if (existing.length > 0) {
    guardianId = existing[0].id;
    await db
      .update(guardian)
      .set({ name: input.name, address: input.address ?? "", updatedAt: new Date() })
      .where(eq(guardian.id, guardianId));
  } else {
    const [row] = await db
      .insert(guardian)
      .values({ name: input.name, phone: digits, address: input.address ?? "" })
      .returning({ id: guardian.id });
    guardianId = row.id;
  }

  for (const c of input.children ?? []) {
    const clean = c.name.trim();
    if (!clean) continue;
    const dup = await db
      .select({ id: child.id })
      .from(child)
      .where(and(eq(child.guardianId, guardianId), eq(child.name, clean)));
    if (dup.length === 0) {
      await db.insert(child).values({ guardianId, name: clean });
    }
  }
  return guardianId;
}

export async function updatePatient(id: number, patch: Partial<CreatePatientInput>): Promise<void> {
  await db
    .update(guardian)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(guardian.id, id));
}

export async function addChildToGuardian(guardianId: number, name: string): Promise<void> {
  const clean = name.trim();
  if (!clean) return;
  const dup = await db
    .select({ id: child.id })
    .from(child)
    .where(and(eq(child.guardianId, guardianId), eq(child.name, clean)));
  if (dup.length === 0) {
    await db.insert(child).values({ guardianId, name: clean });
  }
}

/* ═══════════════════════════════ waitlist ═══════════════════════════════ */

export async function listWaitlist(): Promise<WaitlistDTO[]> {
  const rows = await db
    .select({ w: waitlistEntry, slug: dentist.slug })
    .from(waitlistEntry)
    .leftJoin(dentist, eq(dentist.id, waitlistEntry.dentistId))
    .orderBy(asc(waitlistEntry.arrivedAt));

  return rows.map((r) => ({
    id: r.w.id,
    childName: r.w.childName,
    guardianPhone: r.w.guardianPhone,
    treatmentKey: asIconKey(r.w.treatmentKey),
    dentistId: r.w.dentistId,
    dentistSlug: r.slug ?? null,
    arrivedAt: r.w.arrivedAt,
    status: r.w.status as WaitlistDTO["status"],
    note: r.w.note,
  }));
}

export async function addWaitlist(input: {
  childName: string;
  guardianPhone?: string;
  treatmentKey: IconKey;
  dentistId?: number | null;
  note?: string;
}): Promise<void> {
  const now = new Date();
  const hhmm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  await db.insert(waitlistEntry).values({
    childName: input.childName,
    guardianPhone: (input.guardianPhone ?? "").replace(/\D/g, ""),
    treatmentKey: input.treatmentKey,
    dentistId: input.dentistId ?? null,
    arrivedAt: hhmm,
    status: "waiting",
    note: input.note ?? "",
  });
}

export async function updateWaitlistStatus(
  id: number,
  status: "waiting" | "in_chair" | "done",
  dentistId?: number | null,
): Promise<void> {
  await db
    .update(waitlistEntry)
    .set({ status, ...(dentistId ? { dentistId } : {}), updatedAt: new Date() })
    .where(eq(waitlistEntry.id, id));
}

export async function removeWaitlist(id: number): Promise<void> {
  await db.delete(waitlistEntry).where(eq(waitlistEntry.id, id));
}

/* ═════════════════════════════ notifications ════════════════════════════ */

export async function listNotifications(): Promise<NotificationDTO[]> {
  const rows = await db
    .select()
    .from(staffNotification)
    .orderBy(desc(staffNotification.createdAt))
    .limit(50);
  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    refCode: n.refCode,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function markNotificationsRead(): Promise<void> {
  await db.update(staffNotification).set({ isRead: true }).where(eq(staffNotification.isRead, false));
}

/* ═══════════════════════════ dentist mutations ══════════════════════════ */

export interface DentistUpdate {
  years?: number;
  tint?: string;
  isActive?: boolean;
  photoSmall?: string;
  photoLarge?: string;
  text?: Partial<Record<"th" | "en", Partial<DentistTextDTO>>>;
  treats?: IconKey[];
  shifts?: { weekday: number; enabled: boolean; start: string; end: string }[];
}

export async function updateDentist(slug: string, patch: DentistUpdate): Promise<void> {
  const rows = await db.select({ id: dentist.id }).from(dentist).where(eq(dentist.slug, slug));
  const id = rows[0]?.id;
  if (!id) throw new Error(`unknown dentist: ${slug}`);

  const { text, treats, shifts, ...plain } = patch;

  if (Object.keys(plain).length > 0) {
    await db
      .update(dentist)
      .set({ ...plain, updatedAt: new Date() })
      .where(eq(dentist.id, id));
  }

  if (text?.th) {
    await db
      .update(dentistText)
      .set(text.th)
      .where(and(eq(dentistText.dentistId, id), eq(dentistText.lang, "th")));
  }
  if (text?.en) {
    await db
      .update(dentistText)
      .set(text.en)
      .where(and(eq(dentistText.dentistId, id), eq(dentistText.lang, "en")));
  }

  if (treats) {
    await db.delete(dentistTreat).where(eq(dentistTreat.dentistId, id));
    for (const k of treats) {
      await db.insert(dentistTreat).values({ dentistId: id, treatmentKey: k }).onConflictDoNothing();
    }
  }

  if (shifts) {
    for (const s of shifts) {
      await db
        .insert(dentistShift)
        .values({ dentistId: id, ...s })
        .onConflictDoUpdate({
          target: [dentistShift.dentistId, dentistShift.weekday],
          set: { enabled: s.enabled, start: s.start, end: s.end },
        });
    }
  }
}

export interface NewDentistInput {
  slug: string;
  years: number;
  tint: string;
  text: Record<"th" | "en", DentistTextDTO>;
  treats: IconKey[];
  shifts: { weekday: number; enabled: boolean; start: string; end: string }[];
}

export async function createDentist(input: NewDentistInput): Promise<void> {
  const [row] = await db
    .insert(dentist)
    .values({
      slug: input.slug,
      years: input.years,
      tint: input.tint,
      face: {},
      isActive: true,
    })
    .returning({ id: dentist.id });

  for (const lang of ["th", "en"] as const) {
    await db.insert(dentistText).values({ dentistId: row.id, lang, ...input.text[lang] });
  }
  for (const k of input.treats) {
    await db.insert(dentistTreat).values({ dentistId: row.id, treatmentKey: k }).onConflictDoNothing();
  }
  for (const s of input.shifts) {
    await db.insert(dentistShift).values({ dentistId: row.id, ...s }).onConflictDoNothing();
  }
}

/* ═══════════════════════════ price / schedule mutations ═════════════════ */

export async function updateTreatmentPrice(key: IconKey, price: number | null): Promise<void> {
  await db
    .update(treatment)
    .set({ price, updatedAt: new Date() })
    .where(eq(treatment.key, key));
}

export async function updateClinicDay(
  day: string,
  patch: { isOpen?: boolean; start?: string; end?: string },
): Promise<void> {
  await db.update(clinicDay).set(patch).where(eq(clinicDay.day, day));
}

export async function addHolidayRange(start: string, end: string, name: string): Promise<void> {
  const s = start <= end ? start : end;
  const e = start <= end ? end : start;
  await db.insert(holiday).values({ start: s, end: e, name });
}

export async function removeHoliday(id: number): Promise<void> {
  await db.delete(holiday).where(eq(holiday.id, id));
}

/* ═══════════════════════════ misc helpers ═══════════════════════════════ */

/** count of unread staff notifications — the sidebar badge */
export async function unreadNotificationCount(): Promise<number> {
  return db.$count(staffNotification, eq(staffNotification.isRead, false));
}
