import { NextRequest, NextResponse } from "next/server";

import { todayISO } from "@/lib/dates";
import { checkRate, clinicNowHHMM, queueDay, queueStatus, type QueueItemDTO } from "@/server/queries";

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
 * The waiting-room name as the public may see it: the first letter and a
 * mask ("น้องภ•••"), since the board is readable by anyone with the link. The
 * family finds themselves by their booking code, which the board shows.
 */
function mask(name: string): string {
  // most names start with "น้อง" — keep it, and show the first letter after it
  const m = /^(น้อง\s*)?(.*)$/.exec(name.trim())!;
  const first = [...new Intl.Segmenter("th", { granularity: "grapheme" }).segment(m[2])][0]?.segment ?? "";
  return `${m[1]?.trim() ?? ""}${first}•••`;
}
const masked = <T extends { name: string }>(list: T[]) => list.map((i) => ({ ...i, name: mask(i.name) }));

/**
 * GET /api/queue[?dentist=slug] — today's board: who's booked, who's waiting,
 * who's in the chair, who's done. Only today: any other ?date= comes back
 * empty, so nobody can page through the clinic's past or future visits.
 * GET /api/queue?ref=DK-482193 | ?ref=W-12 — where that booking stands today.
 *
 * Deliberately thin: ref codes and masked names only — no phones, guardian
 * names or notes leave this endpoint, and lookups are rate-limited per IP.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const today = todayISO();
  const dateParam = q.get("date");
  const date = dateParam && DATE_RE.test(dateParam) ? dateParam : today;
  const doc = q.get("dentist");

  if (q.has("ref") || q.has("phone")) {
    const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    if (!(await checkRate(`queue:${ip}`, 30, 600))) {
      return NextResponse.json({ date, found: false }, { status: 429, headers: CORS });
    }
    const ref = q.get("ref") ?? "";
    const status = date === today && ref ? await queueStatus({ date, ref }) : { found: false };
    return NextResponse.json(
      { date, now: clinicNowHHMM(), ...status, ...(status.name ? { name: mask(status.name) } : {}) },
      { headers: CORS },
    );
  }

  if (date !== today) {
    return NextResponse.json(
      { date, now: clinicNowHHMM(), isToday: false, dentists: [], scheduled: [], serving: [], waiting: [], done: [] },
      { headers: CORS },
    );
  }

  const day = await queueDay(date);
  return NextResponse.json(
    {
      date,
      now: clinicNowHHMM(),
      isToday: true,
      dentists: day.dentists,
      scheduled: masked(byDentist(day.scheduled, doc)),
      serving: masked(byDentist(day.serving, doc)),
      waiting: masked(byDentist(day.waiting, doc)).map((w, i) => ({ ...w, position: i + 1 })),
      done: masked(byDentist(day.done, doc)),
    },
    { headers: CORS },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
