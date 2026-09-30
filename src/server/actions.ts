"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

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
  updateAppointment,
  updateClinicDay,
  updateClinicInfo,
  updateDentist,
  updatePatient,
  updateTreatmentPrice,
  updateWaitlistStatus,
  upsertGuardian,
  clinicNowHHMM,
  type AppointmentUpdate,
  type ChildInput,
  type CreatePatientInput,
  type DentistUpdate,
  type NewDentistInput,
} from "@/server/queries";
import type { WaitlistDTO } from "@/server/queries";
import type { VisitRecordInput } from "@/lib/staffTypes";

export type { VisitRecordInput } from "@/lib/staffTypes";

/**
 * Server Actions — the mutation API for both UIs.
 *
 * Every write the patient site or the staff console performs goes through
 * here. Actions revalidate the pages whose data they change, so both UIs
 * refresh without a redeploy or a manual reload.
 *
 * NOTE ON AUTH: every `staff*` action checks the staff cookie first
 * (`requireStaff` in staffAuth.ts) — server actions are plain POST endpoints,
 * so the page gate alone would leave them callable. Patient-facing actions
 * stay public by design (booking works without an account) but are throttled
 * per IP via `limited()` below.
 */

/** true = over the limit; the caller should refuse the action */
async function limited(scope: string, limit: number, windowSec: number): Promise<boolean> {
  let ip: string;
  try {
    const h = await headers();
    ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim();
  } catch {
    return false; // no request scope — local script, never throttled
  }
  if (!ip) return false;
  const { checkRate } = await import("@/server/queries");
  return !(await checkRate(`${scope}:${ip}`, limit, windowSec));
}

/** gate every staff* action — see the NOTE ON AUTH above */
async function guard() {
  const { requireStaff } = await import("@/server/staffAuth");
  await requireStaff();
}

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

/**
 * Slot-only validation shared by `holdSlot` and `bookAppointment`. "ok" means
 * the slot may be held or booked right now: in range, on a shift a capable
 * dentist works, and either that dentist is free (named) or the chairs aren't
 * full (pool). Active holds count as taken/at-capacity everywhere.
 */
async function slotVerdict(
  date: string,
  time: string,
  treatmentKey: IconKey,
  dentistId: number | null,
): Promise<"ok" | "invalid" | "slot_taken"> {
  const { todayISO, nowMinutes, minutesOf } = await import("@/lib/dates");
  const today = todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) return "invalid";
  if (!/^\d{2}:\d{2}$/.test(time)) return "invalid";
  // never bookable: a past date, or today with under an hour to spare —
  // the same lead the calendar enforces
  if (date === today && minutesOf(time) < nowMinutes() + 60) return "invalid";

  const { getChairs, liveAtSlot, activeHoldsAtSlot, slotsForDate, capableDentistIds } =
    await import("@/server/queries");

  // "any dentist": the booking joins the pool (dentist_id NULL) while the
  // slot holds fewer live rows — bookings + active holds — than there are
  // chairs. Pooling into a slot no capable dentist covers would wait forever.
  if (dentistId === null) {
    const [chairs, live, holds, rows, capable] = await Promise.all([
      getChairs(),
      liveAtSlot(date, time),
      activeHoldsAtSlot(date, time),
      slotsForDate(date),
      capableDentistIds(treatmentKey),
    ]);
    if (live.length + holds >= chairs) return "slot_taken";
    const capableSet = new Set(capable);
    const covered = rows.some((r) => r.time === time && capableSet.has(r.dentistId));
    if (!covered) return "slot_taken";
    return "ok";
  }

  // a named dentist must take this treatment AND be on shift at that slot —
  // slotsForDate rows only exist inside enabled shifts on open days, and an
  // active hold marks the slot taken exactly like a booking
  const [capable, rows] = await Promise.all([
    capableDentistIds(treatmentKey),
    slotsForDate(date),
  ]);
  if (!capable.includes(dentistId)) return "invalid";
  const slot = rows.find((r) => r.dentistId === dentistId && r.time === time);
  if (!slot || slot.taken) return "slot_taken";
  return "ok";
}

/**
 * Hold-then-confirm, step one: reserve the picked slot for HOLD_MINUTES so it
 * can't be taken while the family types contact details. Returns the token
 * the client must pass to `bookAppointment`. Same validation as a booking —
 * a slot you can't book can't be held.
 */
export async function holdSlot(input: {
  date: string;
  time: string;
  treatmentKey: IconKey;
  /** dentist id, or null for "any dentist" — holds a chair */
  dentistId: number | null;
}): Promise<{ ok: boolean; token?: string; expiresAt?: string }> {
  if (await limited("hold", 30, 600)) return { ok: false };
  if (!input.date || !input.time || !input.treatmentKey) return { ok: false };
  if ((await slotVerdict(input.date, input.time, input.treatmentKey, input.dentistId)) !== "ok") {
    return { ok: false };
  }
  const { createHold } = await import("@/server/queries");
  const hold = await createHold(input);
  if (!hold) return { ok: false }; // an active hold landed mid-flight
  return { ok: true, token: hold.token, expiresAt: hold.expiresAt.toISOString() };
}

/** release a hold early — the family picked a different slot or backed out */
export async function releaseSlotHold(token: string): Promise<void> {
  if (!token) return;
  const { releaseHold } = await import("@/server/queries");
  await releaseHold(token);
}

export async function bookAppointment(input: {
  date: string;
  time: string;
  treatmentKey: IconKey;
  /** dentist id, or null for "any dentist" */
  dentistId: number | null;
  /** the name the family gives at the desk — a nickname is enough */
  childName: string;
  /** legacy: older clients sent a separate contact name; the booking name is used when absent */
  guardianName?: string;
  phone: string;
  forSelf?: boolean;
  /** token from holdSlot — the slot reservation being confirmed */
  holdToken?: string;
  /** LIFF ID token when the page runs inside LINE — verified server-side */
  lineIdToken?: string;
}): Promise<BookResult> {
  // minimal validation — never trust the client, even ours
  if (await limited("book", 20, 600)) return { ok: false, error: "invalid" };
  const name = input.childName?.trim() ?? "";
  if (!input.date || !input.time || !input.treatmentKey || !input.phone || !name) {
    return { ok: false, error: "invalid" };
  }
  if (!/^[0-9]{9,10}$/.test(input.phone.replace(/\D/g, ""))) {
    return { ok: false, error: "invalid" };
  }

  // consume the caller's hold first — deleting it means our own reservation
  // can't trip the checks below; if it lapsed and someone grabbed the slot
  // meanwhile, the normal validation still fails honestly
  const dentistId = input.dentistId;
  if (input.holdToken) {
    const { releaseHold } = await import("@/server/queries");
    await releaseHold(input.holdToken);
  }

  // verify LINE identity up front — the booking is stamped with the account
  // (that is how "my bookings" finds it inside LINE) and it gets the push
  // confirmation after
  const { verifyLineIdToken } = await import("@/server/line");
  const identity = input.lineIdToken ? await verifyLineIdToken(input.lineIdToken) : null;

  const verdict = await slotVerdict(input.date, input.time, input.treatmentKey, dentistId);
  if (verdict !== "ok") {
    // at capacity the pressure valve runs first — the oldest pooled booking
    // takes a remaining free dentist — and the newcomer is turned away either way
    if (dentistId === null && verdict === "slot_taken") {
      const { settlePool } = await import("@/server/queries");
      await settlePool(input.date, input.time);
    }
    return { ok: false, error: verdict };
  }

  const created = await createAppointment({
    date: input.date,
    time: input.time,
    treatmentKey: input.treatmentKey,
    dentistId,
    childName: name,
    guardianName: input.guardianName?.trim() || name,
    phone: input.phone,
    forSelf: input.forSelf ?? false,
    source: "online",
    price: null,
    lineUserId: identity?.userId,
    lineName: identity?.displayName,
    // nickname + phone only — no guardian/child records from the patient site
    register: false,
  });

  if (!created) return { ok: false, error: "slot_taken" };

  const { settlePool } = await import("@/server/queries");
  await settlePool(input.date, input.time);

  // confirm in their chat — any LINE failure degrades to a normal booking,
  // never a failed one
  if (identity) {
    const { pushLineText } = await import("@/server/line");
    await pushLineText(
      identity.userId,
      `จองคิวสำเร็จ ✓\nรหัสจอง: ${created.ref}\nวันที่ ${input.date} เวลา ${input.time}\nขอบคุณที่ใช้บริการ DentaKids ค่ะ`,
    );
  }

  revalidateAll();
  return { ok: true, ref: created.ref };
}

/**
 * Staff hands a pooled booking to a dentist. Guarded: the dentist must be
 * free and capable at that slot — first-come still wins over the pool, so a
 * specific booking that landed mid-flight keeps its chair.
 */
export async function assignPoolDentist(
  id: number,
  dentistId: number,
): Promise<{ ok: boolean; error?: "taken" | "invalid" }> {
  await guard();
  const { freeCapableAtSlot, updateAppointment } = await import("@/server/queries");
  const all = await listAppointmentsBetween("1970-01-01", "9999-12-31");
  const target = all.find((a) => a.id === id);
  if (!target || target.status === "cancelled" || target.dentistId !== null) {
    return { ok: false, error: "invalid" };
  }
  const free = await freeCapableAtSlot(target.date, target.time, target.treatmentKey);
  if (!free.some((f) => f.id === dentistId)) return { ok: false, error: "taken" };
  await updateAppointment(id, { dentistId });
  const { settlePool } = await import("@/server/queries");
  await settlePool(target.date, target.time);
  revalidateAll();
  return { ok: true };
}

/** the patient-site "my bookings" list — everything under one phone number */
export async function myBookings(phone: string) {
  if (await limited("lookup", 40, 600)) return [];
  return listAppointmentsBetween("1970-01-01", "9999-12-31").then((all) =>
    all
      .filter((a) => a.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""))
      .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1)),
  );
}

/**
 * The LINE path for the same page — the LIFF ID token is verified server-side
 * and every booking that account made comes back. null = token rejected or
 * LINE not configured (caller falls back to the phone view); [] = verified but
 * nothing booked from this account yet.
 */
export async function myBookingsByLine(lineIdToken: string) {
  if (await limited("lookup", 40, 600)) return null;
  const { verifyLineIdToken } = await import("@/server/line");
  const { listAppointmentsForLine } = await import("@/server/queries");
  const identity = await verifyLineIdToken(lineIdToken);
  if (!identity) return null;
  return listAppointmentsForLine(identity.userId);
}

/** the booking flow's returning-family lookup (read-only action) */
export async function familyByPhone(phone: string) {
  if (await limited("lookup", 40, 600)) return [];
  // a lookup only means something once the phone looks complete; the caller
  // clears its own state otherwise
  if (phone.replace(/\D/g, "").length < 9) return [];
  const fams = await findFamilyByPhone(phone);
  return fams.map((f) => ({
    name: f.name,
    children: f.children.map((c) => ({ id: c.id, name: c.name })),
  }));
}

/**
 * The patient cancelled their own booking. The ref alone is guessable
 * (DK-XXXX is ~9k values), so the caller must also know the booking's phone —
 * the page only learns the ref after a verified LINE view or a phone match.
 */
export async function cancelBooking(ref: string, phone: string) {
  if (await limited("cancel", 10, 600)) return;
  if (!ref || !phone) return;
  const rows = await listAppointmentsBetween("1970-01-01", "9999-12-31");
  const target = rows.find((a) => a.ref === ref);
  if (!target) return;
  if (target.phone.replace(/\D/g, "") !== phone.replace(/\D/g, "")) return;
  await updateAppointment(target.id, { status: "cancelled" });
  // a freed chair can home a pooled booking still waiting at that slot
  const { settlePool } = await import("@/server/queries");
  await settlePool(target.date, target.time);
  await dbInsertCancellationNotice(target.ref, target.childName, target.date, target.time);
  revalidateAll();
}

/**
 * The patient postponed their own booking: the same appointment row moves to
 * a new date/time — same ref, treatment, dentist and child — so the old slot
 * frees up and the family never ends up holding two bookings. Same proof as
 * `cancelBooking` (ref + the booking's phone), same slot rules as a new
 * booking (`slotVerdict`), and the unique slot index still guards the race.
 */
export async function rescheduleBooking(input: {
  ref: string;
  phone: string;
  date: string;
  time: string;
  /** token from holdSlot — the new slot's reservation being confirmed */
  holdToken?: string;
}): Promise<BookResult> {
  if (await limited("reschedule", 10, 600)) return { ok: false, error: "invalid" };
  if (!input.ref || !input.phone || !input.date || !input.time) return { ok: false, error: "invalid" };

  const rows = await listAppointmentsBetween("1970-01-01", "9999-12-31");
  const target = rows.find((a) => a.ref === input.ref);
  if (!target) return { ok: false, error: "invalid" };
  if (target.phone.replace(/\D/g, "") !== input.phone.replace(/\D/g, "")) return { ok: false, error: "invalid" };
  // only a booking still waiting to happen can move — not one already checked
  // in, finished, cancelled or in the past
  const { todayISO } = await import("@/lib/dates");
  if (target.status !== "confirmed" || target.date < todayISO()) return { ok: false, error: "invalid" };
  if (target.date === input.date && target.time === input.time) return { ok: true, ref: target.ref };

  if (input.holdToken) {
    const { releaseHold } = await import("@/server/queries");
    await releaseHold(input.holdToken);
  }

  const verdict = await slotVerdict(input.date, input.time, target.treatmentKey, target.dentistId);
  if (verdict !== "ok") return { ok: false, error: verdict };

  try {
    await updateAppointment(target.id, { date: input.date, time: input.time });
  } catch {
    // the unique slot index fired — someone took that dentist's slot mid-flight
    return { ok: false, error: "slot_taken" };
  }

  const { settlePool } = await import("@/server/queries");
  await settlePool(target.date, target.time); // the old slot may home a pooled booking
  await settlePool(input.date, input.time);

  // a reminder already sent for the old date must not stop the new date's one
  const { messageLog } = await import("@/db/schema");
  const { and, eq, like } = await import("drizzle-orm");
  await db
    .delete(messageLog)
    .where(and(eq(messageLog.appointmentId, target.id), like(messageLog.kind, "reminder_%")));

  await db.insert(staffNotification).values({
    type: "reschedule",
    title: "ผู้ปกครองเลื่อนนัดหมาย",
    body: `${target.childName} เลื่อนนัดจาก ${target.date} ${target.time} น. เป็น ${input.date} ${input.time} น. (${target.ref})`,
    refCode: target.ref,
  });

  {
    const { lineTargetForAppointment } = await import("@/server/queries");
    const { pushLineText } = await import("@/server/line");
    const to = await lineTargetForAppointment(target.id);
    if (to) {
      await pushLineText(
        to,
        `เลื่อนนัดสำเร็จ ✓\nรหัสจอง: ${target.ref}\nนัดใหม่ วันที่ ${input.date} เวลา ${input.time}\nขอบคุณที่ใช้บริการ DentaKids ค่ะ`,
      );
    }
  }

  revalidateAll();
  return { ok: true, ref: target.ref };
}

/* ═══════════════════════════ staff: login ═══════════════════════════════ */

/**
 * The PIN gate — throttled hard because the PIN is short. A good PIN sets the
 * httpOnly cookie every staff action checks; the raw PIN never leaves this
 * function.
 */
export async function staffLogin(pin: string): Promise<{ ok: boolean }> {
  if (await limited("stafflogin", 5, 600)) return { ok: false };
  const { staffPinOk, staffGrantCookie } = await import("@/server/staffAuth");
  if (!staffPinOk(pin)) return { ok: false };
  await staffGrantCookie();
  return { ok: true };
}

export async function staffLogout(): Promise<void> {
  const { staffClearCookie } = await import("@/server/staffAuth");
  await staffClearCookie();
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
  await guard();
  const created = await createAppointment({ ...input, source: input.source });
  revalidateAll();
  return created?.ref ?? null;
}

export async function staffUpdateAppointment(id: number, patch: AppointmentUpdate) {
  await guard();
  const touchesSlot =
    patch.status !== undefined ||
    patch.date !== undefined ||
    patch.time !== undefined ||
    patch.dentistId !== undefined;
  const before = touchesSlot
    ? (await listAppointmentsBetween("1970-01-01", "9999-12-31")).find((a) => a.id === id)
    : undefined;
  await updateAppointment(id, patch);
  // cancelling, moving or (un)assigning can home a pooled booking waiting
  // at the affected slot — run the pressure valve on both ends of a move
  if (touchesSlot) {
    const { settlePool } = await import("@/server/queries");
    const rows = await listAppointmentsBetween("1970-01-01", "9999-12-31");
    const after = rows.find((a) => a.id === id);
    if (before) await settlePool(before.date, before.time);
    if (after && (!before || after.date !== before.date || after.time !== before.time)) {
      await settlePool(after.date, after.time);
    }
  }
  revalidateAll();
}

/**
 * The queue board's transitions: confirmed → arrived (check-in stamps the
 * clinic clock — it is the queue order key) → in_chair → completed, or
 * no_show when the family never turned up. None of these free the slot, so
 * no settlePool — only `cancelled` does, and it goes through
 * staffUpdateAppointment.
 */
export async function staffSetQueueStatus(
  id: number,
  status: "arrived" | "in_chair" | "completed" | "no_show",
) {
  await guard();
  await updateAppointment(id, {
    status,
    ...(status === "arrived" ? { checkedInAt: clinicNowHHMM() } : {}),
  });
  revalidateAll();
}

/** the booking-rules knob (chairs) the settings page owns */
export async function staffUpdateChairs(chairs: number) {
  await guard();
  const { setChairs } = await import("@/server/queries");
  await setChairs(chairs);
  revalidateAll();
}

export async function staffDeleteAppointment(id: number) {
  await guard();
  const rows = await listAppointmentsBetween("1970-01-01", "9999-12-31");
  const target = rows.find((a) => a.id === id);
  await deleteAppointment(id);
  if (target) {
    const { settlePool } = await import("@/server/queries");
    await settlePool(target.date, target.time);
  }
  revalidateAll();
}

/* ═══════════════════════════ staff: dentists ════════════════════════════ */

export async function staffUpdateDentist(slug: string, patch: DentistUpdate) {
  await guard();
  await updateDentist(slug, patch);
  revalidateAll();
}

export async function staffCreateDentist(input: NewDentistInput) {
  await guard();
  await createDentist(input);
  revalidateAll();
}

/* ═══════════════════════════ staff: patients ════════════════════════════ */

export async function staffUpsertPatient(input: CreatePatientInput) {
  await guard();
  await upsertGuardian(input);
  revalidateAll();
}

export async function staffUpdatePatient(id: number, patch: Partial<CreatePatientInput>) {
  await guard();
  await updatePatient(id, patch);
  revalidateAll();
}

export async function staffAddChild(patientId: number, child: string | ChildInput) {
  await guard();
  await addChildToGuardian(patientId, child);
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
  await guard();
  await addWaitlist(input);
  revalidateAll();
}

/* ═══════════════════ staff: visit records (room page) ═══════════════════ */

/** save the dentist's record without closing the visit (mid-treatment edits) */
export async function staffSaveVisitRecord(input: VisitRecordInput) {
  await guard();
  const { upsertVisitRecord } = await import("@/server/queries");
  await upsertVisitRecord(input);
  revalidateAll();
}

/**
 * One tap on the room page: save the record AND close the visit — booking →
 * "completed", walk-in → "done". One round-trip so the chair frees at once.
 */
export async function staffFinishVisit(input: VisitRecordInput) {
  await guard();
  const { upsertVisitRecord, updateWaitlistStatus } = await import("@/server/queries");
  await upsertVisitRecord(input);
  if (input.appointmentId != null) {
    await updateAppointment(input.appointmentId, { status: "completed" });
  } else if (input.waitlistId != null) {
    await updateWaitlistStatus(input.waitlistId, "done");
  }
  revalidateAll();
}

export async function staffSetWaitlistStatus(id: number, status: WaitlistDTO["status"], dentistId?: number | null) {
  await guard();
  await updateWaitlistStatus(id, status, dentistId);
  revalidateAll();
}

export async function staffRemoveWaitlist(id: number) {
  await guard();
  await removeWaitlist(id);
  revalidateAll();
}

/* ═══════════════════════════ staff: prices & schedule ═══════════════════ */

export async function staffUpdatePrice(key: IconKey, price: number | null) {
  await guard();
  await updateTreatmentPrice(key, price);
  revalidateAll();
}

export async function staffUpdateDay(day: string, patch: { isOpen?: boolean; start?: string; end?: string }) {
  await guard();
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
  await guard();
  await updateClinicInfo(patch);
  revalidateAll();
}

export async function staffAddHoliday(start: string, end: string, name: string) {
  await guard();
  await addHolidayRange(start, end, name);
  revalidateAll();
}

export async function staffRemoveHoliday(id: number) {
  await guard();
  await removeHoliday(id);
  revalidateAll();
}

/* ═══════════════════════════ staff: notifications ═══════════════════════ */

export async function staffMarkNotificationsRead() {
  await guard();
  await markNotificationsRead();
  revalidateStaff();
}

/** convenience read the staff console uses after mutations */
export async function staffPrices() {
  await guard();
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
  await guard();
  const {
    toUIAppointments,
    toUIEditableDentists,
    toUIPatients,
    toUIVisitRecords,
    toUIWaitlist,
    toUINotifications,
  } = await import("@/lib/staffConvert");
  const {
    listAppointmentsBetween,
    listDentists,
    listPatients,
    listWaitlist,
    listVisitRecordsForDate,
    listNotifications,
    listClinicDays,
    listHolidays,
    priceMap,
    getChairs,
  } = await import("@/server/queries");

  const today = (await import("@/lib/dates")).todayISO();

  const [appts, dentists, patients, waitlist, visitRecords, notifications, days, holidays, prices, chairs] =
    await Promise.all([
      listAppointmentsBetween("1970-01-01", "9999-12-31"),
      listDentists(),
      listPatients(),
      listWaitlist(),
      listVisitRecordsForDate(today),
      listNotifications(),
      listClinicDays(),
      listHolidays(),
      priceMap(),
      getChairs(),
    ]);

  return {
    today,
    appointments: toUIAppointments(appts),
    dentists: toUIEditableDentists(dentists),
    patients: toUIPatients(patients),
    waitlist: toUIWaitlist(waitlist),
    visitRecords: toUIVisitRecords(visitRecords),
    notifications: toUINotifications(notifications),
    schedule: days,
    holidays,
    servicePrices: prices,
    settings: { chairs },
  };
}

export type StaffBootstrap = Awaited<ReturnType<typeof staffBootstrap>>;

/** wipe and re-seed the demo data (the staff console's reset button) */
export async function staffResetDemoData() {
  await guard();
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  await run("pnpm", ["db:seed"], { cwd: process.cwd() });
  revalidateAll();
}
