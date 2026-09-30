import { NextResponse, type NextRequest } from "next/server";

import * as actions from "@/server/actions";
import { staffTokenOk, withStaffToken } from "@/server/staffAuth";

/**
 * The desktop app's whole API: POST { action, args } with a bearer token from
 * /api/staff/login. The allowlist below maps names onto the same server
 * actions the web console uses — verified once here, then run inside
 * withStaffToken so each action's own guard passes. Single implementation,
 * two doors.
 */

const OPS: Record<string, (...args: never[]) => Promise<unknown>> = {
  bootstrap: actions.staffBootstrap,
  prices: actions.staffPrices,
  createAppointment: actions.staffCreateAppointment,
  updateAppointment: actions.staffUpdateAppointment,
  deleteAppointment: actions.staffDeleteAppointment,
  setQueueStatus: actions.staffSetQueueStatus,
  assignPoolDentist: actions.assignPoolDentist,
  updateChairs: actions.staffUpdateChairs,
  updateDentist: actions.staffUpdateDentist,
  createDentist: actions.staffCreateDentist,
  upsertPatient: actions.staffUpsertPatient,
  updatePatient: actions.staffUpdatePatient,
  addChild: actions.staffAddChild,
  addWaitlist: actions.staffAddWaitlist,
  setWaitlistStatus: actions.staffSetWaitlistStatus,
  removeWaitlist: actions.staffRemoveWaitlist,
  saveVisitRecord: actions.staffSaveVisitRecord,
  finishVisit: actions.staffFinishVisit,
  updatePrice: actions.staffUpdatePrice,
  updateDay: actions.staffUpdateDay,
  updateClinicInfo: actions.staffUpdateClinicInfo,
  addHoliday: actions.staffAddHoliday,
  removeHoliday: actions.staffRemoveHoliday,
  markNotificationsRead: actions.staffMarkNotificationsRead,
  resetDemoData: actions.staffResetDemoData,
};

const CORS = {
  // the caller must still present a valid token — a permissive origin only
  // lets the Tauri webview (tauri://localhost) reach the API at all
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!staffTokenOk(token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: CORS });
  }
  let body: { action?: string; args?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400, headers: CORS });
  }
  const fn = body.action ? OPS[body.action] : undefined;
  if (!fn) {
    return NextResponse.json({ error: "unknown_action" }, { status: 400, headers: CORS });
  }
  try {
    const result = await withStaffToken(() => fn(...(body.args ?? []) as never[]));
    return NextResponse.json({ ok: true, result }, { headers: CORS });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal" },
      { status: 500, headers: CORS },
    );
  }
}
