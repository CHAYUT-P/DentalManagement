import { NextRequest, NextResponse } from "next/server";

import { todayISO } from "@/lib/dates";
import { clinicNowHHMM, queueDay, queueStatus, type QueueItemDTO } from "@/server/queries";

/** the queue-check site lives on another origin — the board is public data
 *  (a waiting-room screen shows the same names), so CORS stays open */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const byDentist = (list: QueueItemDTO[], slug: string | null) =>
  slug ? list.filter((i) => i.dentistSlug === slug) : list;

/**
 * GET /api/queue[?date=YYYY-MM-DD][&dentist=slug] — the day view: who's
 * booked, who's waiting, who's in the chair, who's done. `date` defaults to
 * today; walk-ins only ever appear on today.
 * GET /api/queue?ref=DK-4821 | ?ref=W-12 | ?phone=0812345678 [&date=…] —
 * where that family stands on that day.
 *
 * Deliberately thin: ref codes and child display names only — no phones,
 * guardian names, or notes leave this endpoint.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const dateParam = q.get("date");
  const date = dateParam && DATE_RE.test(dateParam) ? dateParam : todayISO();
  const doc = q.get("dentist");

  if (q.has("ref") || q.has("phone")) {
    const status = await queueStatus({
      date,
      ref: q.get("ref") ?? undefined,
      phone: q.get("phone") ?? undefined,
    });
    return NextResponse.json({ date, now: clinicNowHHMM(), ...status }, { headers: CORS });
  }

  const day = await queueDay(date);
  return NextResponse.json(
    {
      date,
      now: clinicNowHHMM(),
      isToday: date === todayISO(),
      dentists: day.dentists,
      scheduled: byDentist(day.scheduled, doc),
      serving: byDentist(day.serving, doc),
      waiting: byDentist(day.waiting, doc).map((w, i) => ({ ...w, position: i + 1 })),
      done: byDentist(day.done, doc),
    },
    { headers: CORS },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
