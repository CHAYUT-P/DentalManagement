import { NextRequest, NextResponse } from "next/server";

import { getDisplay } from "@/server/billing";

/**
 * GET /api/display?c=<code> — what the customer-facing screen (จอลูกค้า)
 * shows right now. The code pairs a screen with the clinic; the payload is
 * what a family at the counter sees anyway (name, lines, totals, QR) — no
 * phone numbers or notes.
 */
export async function GET(request: NextRequest) {
  const state = await getDisplay(request.nextUrl.searchParams.get("c") ?? "");
  if (!state) return NextResponse.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}
