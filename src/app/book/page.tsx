import type { Metadata } from "next";
import { connection } from "next/server";

import { isIconKey } from "@/data/icons";
import { services } from "@/data/services";
import { nowMinutes, addDays, todayISO } from "@/lib/dates";
import { toUIDentists } from "@/lib/convert";
import { listClinicDays, listDentists, listHolidays, listTreatments, slotsForDate, slotLoadForDates, getChairs } from "@/server/queries";
import { BookingFlow } from "@/components/BookingFlow";

export const metadata: Metadata = {
  title: "Denta Kids · จองนัดหมาย",
  description: "เลือกบริการ เลือกทันตแพทย์ แล้วเลือกวันและเวลาที่สะดวก",
};

/** the booking window the calendar shows — must match BookingFlow's WINDOW_DAYS */
const WINDOW_DAYS = 14;

/**
 * `?t=` preselects a treatment (the home tiles and the services list link in
 * that way) and `?d=` a dentist (from a dentist's profile).
 *
 * All booking decisions come from Postgres: the roster, the open days, the
 * holidays, and per-date slot occupancy for the whole window. `connection()`
 * holds rendering until request time because "today" and slot fullness must be
 * the clinic's now, not a prerendered snapshot.
 */
export default async function Page({ searchParams }: PageProps<"/book">) {
  await connection();
  const q = await searchParams;
  const rawT = typeof q.t === "string" ? q.t : undefined;
  const rawD = typeof q.d === "string" ? q.d : undefined;

  const today = todayISO();
  const [dentistRows, clinicDays, holidays] = await Promise.all([
    listDentists(),
    listClinicDays(),
    listHolidays(),
  ]);

  // slot occupancy for every day the calendar can show
  const dates = Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(today, i));
  const slotLists = await Promise.all(dates.map((d) => slotsForDate(d)));
  const slots: Record<string, Awaited<ReturnType<typeof slotsForDate>>> = {};
  dates.forEach((d, i) => {
    slots[d] = slotLists[i];
  });

  // chair load per day/time for "any dentist" mode (admits while live < chairs)
  // plus the chair count itself — one batch read for the whole window
  const [load, chairs] = await Promise.all([slotLoadForDates(dates), getChairs()]);

  // prices for the compact labels
  const prices: Partial<Record<string, number | null>> = {};
  for (const t of await listTreatments()) {
    prices[t.key] = t.price;
  }

  const popular = services.map((s) => s.key).filter((k) => k !== "more" && isIconKey(k));

  return (
    <BookingFlow
      today={today}
      nowMin={nowMinutes()}
      dentists={toUIDentists(dentistRows)}
      openDays={clinicDays.map((c) => ({ day: c.day, isOpen: c.isOpen }))}
      holidays={holidays.map((h) => ({ start: h.start, end: h.end, name: h.name }))}
      slots={slots}
      load={load}
      chairs={chairs}
      prices={prices}
      popular={popular}
      preTreatment={rawT && isIconKey(rawT) ? rawT : undefined}
      preDentist={rawD && dentistRows.some((d) => d.slug === rawD) ? rawD : undefined}
    />
  );
}
