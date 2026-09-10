"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import type { IconKey } from "@/data/icons";
import { db } from "@/db/client";
import { staffNotification } from "@/db/schema";
import {
  addHolidayRange,
  addChildToGuardian,
  addWaitlist,
  createAppointment,
  createDentist,
  deleteAppointment,
  findFamilyByPhone,
  listAppointmentsBetween,
  markNotificationsRead,
  priceMap,
  removeHoliday,
  removeWaitlist,
  slotsForDate,
  updateAppointment,
  updateClinicDay,
  updateClinicInfo,
  updateDentist,
  updatePatient,
  updateTreatmentPrice,
  updateWaitlistStatus,
  upsertGuardian,
  type AppointmentUpdate,
  type DentistUpdate,
  type NewDentistInput,
} from "@/server/queries";
import type { WaitlistDTO } from "@/server/queries";

/**
 * Server Actions — the mutation API for both UIs.
 *
 * Every write the patient site or the staff console performs goes through
 * here. Actions revalidate the pages whose data they change, so both UIs
 * refresh without a redeploy or a manual reload.
 *
 * NOTE ON AUTH: deliberately none. The staff console is a stand-in for the
 * future native desktop app (clinic computers only), and the patient site is
 * public by design until LINE login arrives. Revisit before any public deploy.
 */

/* ── paths whose data these actions touch ────────────────────────────────── */

const STAFF_PATHS = [
  "/staff",
  "/staff/appointments",
  "/staff/dentists",
  "/staff/patients",
  "/staff/services",
  "/staff/settings",
  "/staff/notifications",
];

/**
 * Revalidation only works inside a Next.js request context. That is always
 * true for the real app (actions run over HTTP); scripts that call these same
 * functions directly skip it silently.
 */
function revalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // no request scope (direct script call) — pages will still read fresh
    // data because every DB-backed route renders dynamically
  }
}

function revalidatePatientSite() {
  revalidate("/");
  revalidate("/book");
  revalidate("/bookings");
  revalidate("/dentists");
  revalidate("/services");
  revalidate("/notifications");
}

function revalidateStaff() {
  for (const p of STAFF_PATHS) revalidate(p);
}

function revalidateAll() {
  revalidatePatientSite();
  revalidateStaff();
}

/** a cancellation the patient made — staff hear about it immediately */
async function dbInsertCancellationNotice(ref: string, childName: string, date: string, time: string) {
  await db.insert(staffNotification).values({
    type: "cancellation",
    title: "ผู้ปกครองยกเลิกนัดหมาย",
    body: `${childName} ยกเลิกนัด ${date} เวลา ${time} น. (${ref})`,
    refCode: ref,
  });
}

/* ═══════════════════════════ booking (patient site) ═════════════════════ */

export interface BookResult {
  ok: boolean;
  /** set when ok — the created appointment, for the confirmation slip */
  ref?: string;
  /** set when !ok — the reason to show the parent */
  error?: "slot_taken" | "invalid";
}

export async function bookAppointment(input: {
  date: string;
  time: string;
  treatmentKey: IconKey;
  /** dentist id, or null for "any dentist" */
  dentistId: number | null;
  childName: string;
  guardianName: string;
  phone: string;
  forSelf: boolean;
}): Promise<BookResult> {
  // minimal validation — never trust the client, even ours
  if (!input.date || !input.time || !input.treatmentKey || !input.phone || !input.guardianName) {
    return { ok: false, error: "invalid" };
  }
  if (!/^[0-9]{9,10}$/.test(input.phone.replace(/\D/g, ""))) {
    return { ok: false, error: "invalid" };
  }

  let dentistId = input.dentistId;

  // "any dentist": find a free one among the actives for this slot
  if (dentistId === null) {
    const slots = await slotsForDate(input.date);
    const free = slots.filter((s) => s.time === input.time && !s.taken);
    if (free.length === 0) return { ok: false, error: "slot_taken" };
    dentistId = free[0].dentistId;
  }

  const created = await createAppointment({
    date: input.date,
    time: input.time,
    treatmentKey: input.treatmentKey,
    dentistId,
    childName: input.childName || input.guardianName,
    guardianName: input.guardianName,
    phone: input.phone,
    forSelf: input.forSelf,
    source: "online",
    price: null,
  });

  if (!created) return { ok: false, error: "slot_taken" };

  revalidateAll();
  return { ok: true, ref: created.ref };
}

/** the patient-site "my bookings" list — everything under one phone number */
export async function myBookings(phone: string) {
  return listAppointmentsBetween("1970-01-01", "9999-12-31").then((all) =>
    all
      .filter((a) => a.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""))
      .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1)),
  );
}

/** the booking flow's returning-family lookup (read-only action) */
export async function familyByPhone(phone: string) {
  // a lookup only means something once the phone looks complete; the caller
  // clears its own state otherwise
  if (phone.replace(/\D/g, "").length < 9) return [];
  const fams = await findFamilyByPhone(phone);
  return fams.map((f) => ({
    name: f.name,
    children: f.children.map((c) => ({ id: c.id, name: c.name })),
  }));
}

/** the patient cancelled their own booking (by reference code) */
export async function cancelBooking(ref: string) {
  const rows = await listAppointmentsBetween("1970-01-01", "9999-12-31");
  const target = rows.find((a) => a.ref === ref);
  if (!target) return;
  await updateAppointment(target.id, { status: "cancelled" });
  await dbInsertCancellationNotice(target.ref, target.childName, target.date, target.time);
  revalidateAll();
}

/* ═══════════════════════════ staff: appointments ════════════════════════ */

export async function staffCreateAppointment(input: {
  date: string;
  time: string;
  treatmentKey: IconKey;
  dentistId: number;
  childName: string;
  guardianName: string;
  phone: string;
  source: "phone" | "walkin" | "online";
  note?: string;
  price?: number | null;
}) {
  const created = await createAppointment({ ...input, source: input.source });
  revalidateAll();
  return created?.ref ?? null;
}

export async function staffUpdateAppointment(id: number, patch: AppointmentUpdate) {
  await updateAppointment(id, patch);
  revalidateAll();
}

export async function staffDeleteAppointment(id: number) {
  await deleteAppointment(id);
  revalidateAll();
}

/* ═══════════════════════════ staff: dentists ════════════════════════════ */

export async function staffUpdateDentist(slug: string, patch: DentistUpdate) {
  await updateDentist(slug, patch);
  revalidateAll();
}

export async function staffCreateDentist(input: NewDentistInput) {
  await createDentist(input);
  revalidateAll();
}

/* ═══════════════════════════ staff: patients ════════════════════════════ */

export async function staffUpsertPatient(input: {
  name: string;
  phone: string;
  address?: string;
  children?: { name: string }[];
}) {
  await upsertGuardian(input);
  revalidateAll();
}

export async function staffUpdatePatient(id: number, patch: { name?: string; phone?: string; address?: string }) {
  await updatePatient(id, patch);
  revalidateAll();
}

export async function staffAddChild(patientId: number, name: string) {
  await addChildToGuardian(patientId, name);
  revalidateAll();
}

/* ═══════════════════════════ staff: waitlist (queue) ════════════════════ */

export async function staffAddWaitlist(input: {
  childName: string;
  guardianPhone?: string;
  treatmentKey: IconKey;
  dentistId?: number | null;
  note?: string;
}) {
  await addWaitlist(input);
  revalidateAll();
}

export async function staffSetWaitlistStatus(id: number, status: WaitlistDTO["status"], dentistId?: number | null) {
  await updateWaitlistStatus(id, status, dentistId);
  revalidateAll();
}

export async function staffRemoveWaitlist(id: number) {
  await removeWaitlist(id);
  revalidateAll();
}

/* ═══════════════════════════ staff: prices & schedule ═══════════════════ */

export async function staffUpdatePrice(key: IconKey, price: number | null) {
  await updateTreatmentPrice(key, price);
  revalidateAll();
}

export async function staffUpdateDay(day: string, patch: { isOpen?: boolean; start?: string; end?: string }) {
  await updateClinicDay(day, patch);
  revalidateAll();
}

/** the /clinic page + home info card content */
export async function staffUpdateClinicInfo(patch: {
  phone?: string;
  phoneDisplay?: string;
  lineId?: string;
  lineUrl?: string;
  mapUrl?: string;
  directionsUrl?: string;
  addressTh?: string;
  addressEn?: string;
  landmarkTh?: string;
  landmarkEn?: string;
}) {
  await updateClinicInfo(patch);
  revalidateAll();
}

export async function staffAddHoliday(start: string, end: string, name: string) {
  await addHolidayRange(start, end, name);
  revalidateAll();
}

export async function staffRemoveHoliday(id: number) {
  await removeHoliday(id);
  revalidateAll();
}

/* ═══════════════════════════ staff: notifications ═══════════════════════ */

export async function staffMarkNotificationsRead() {
  await markNotificationsRead();
  revalidateStaff();
}

/** convenience read the staff console uses after mutations */
export async function staffPrices() {
  return priceMap();
}

/* ═══════════════════════════ staff bootstrap ════════════════════════════ */

/**
 * One round-trip that gives the staff console its entire working state.
 * Shapes are the UI's own (StaffAppointment, EditableDentist, PatientRecord…),
 * produced by the adapters in src/lib/staffConvert.ts, so the components keep
 * rendering exactly what they rendered against the old localStorage mock.
 */
export async function staffBootstrap() {
  const { toUIAppointments, toUIEditableDentists, toUIPatients, toUIWaitlist, toUINotifications } =
    await import("@/lib/staffConvert");
  const {
    listAppointmentsBetween,
    listDentists,
    listPatients,
    listWaitlist,
    listNotifications,
    listClinicDays,
    listHolidays,
    priceMap,
  } = await import("@/server/queries");

  const [appts, dentists, patients, waitlist, notifications, days, holidays, prices] =
    await Promise.all([
      listAppointmentsBetween("1970-01-01", "9999-12-31"),
      listDentists(),
      listPatients(),
      listWaitlist(),
      listNotifications(),
      listClinicDays(),
      listHolidays(),
      priceMap(),
    ]);

  return {
    today: (await import("@/lib/dates")).todayISO(),
    appointments: toUIAppointments(appts),
    dentists: toUIEditableDentists(dentists),
    patients: toUIPatients(patients),
    waitlist: toUIWaitlist(waitlist),
    notifications: toUINotifications(notifications),
    schedule: days,
    holidays,
    servicePrices: prices,
  };
}

export type StaffBootstrap = Awaited<ReturnType<typeof staffBootstrap>>;

/** wipe and re-seed the demo data (the staff console's reset button) */
export async function staffResetDemoData() {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  await run("pnpm", ["db:seed"], { cwd: process.cwd() });
  revalidateAll();
}
