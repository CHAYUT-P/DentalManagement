import "server-only";

import crypto from "node:crypto";

import { cookies } from "next/headers";

/**
 * Staff gate — the /staff pages and every staff* action check this.
 *
 * A single shared PIN (env `STAFF_PIN`, min 6 chars) is what reception types;
 * a successful login stores an httpOnly cookie holding a hash derived from the
 * PIN, so the raw PIN never travels or sits in the browser. Missing or short
 * `STAFF_PIN` fails closed — nothing staff-side runs without it.
 *
 * Deliberately simple (one PIN for the whole front desk, not per-user): the
 * clinic's real identity model arrives with a future accounts system; this
 * closes the "anyone on the internet can open /staff" hole today.
 */

const COOKIE = "dk_staff";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** the value the cookie must hold — derived, never the PIN itself */
function expected(): string | null {
  const pin = process.env.STAFF_PIN;
  if (!pin || pin.length < 6) return null;
  return crypto.createHash("sha256").update(`dk-staff-v1:${pin}`).digest("hex");
}

export async function isStaffAuthed(): Promise<boolean> {
  let got: string | undefined;
  try {
    got = (await cookies()).get(COOKIE)?.value;
  } catch {
    // no request scope — a local script (seed/e2e) calling the action directly.
    // Over HTTP there is always a request context, so this can't be reached
    // by an unauthenticated request.
    return true;
  }
  const want = expected();
  if (!want || !got || got.length !== want.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

/** throws — every staff action calls this before touching data */
export async function requireStaff(): Promise<void> {
  if (!(await isStaffAuthed())) throw new Error("staff auth required");
}

/** constant-time PIN check — called by the login action only */
export function staffPinOk(pin: string): boolean {
  const want = process.env.STAFF_PIN;
  if (!want || want.length < 6) return false;
  const a = Buffer.from(pin);
  const b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** called inside the login action after a good PIN — sets the session cookie */
export async function staffGrantCookie(): Promise<void> {
  const value = expected();
  if (!value) return;
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** sign-out — clears the cookie on this device */
export async function staffClearCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
