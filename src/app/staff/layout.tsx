import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { DeviceGate } from "@/components/staff/shell/DeviceGate";
import { StaffLoginGate } from "@/components/staff/shell/StaffLoginGate";
import { StaffSidebar } from "@/components/staff/shell/StaffSidebar";
import { StaffTopbar } from "@/components/staff/shell/StaffTopbar";
import { staffBootstrap } from "@/server/actions";
import { isStaffAuthed } from "@/server/staffAuth";
import { StaffUserGate } from "@/lib/staffUser";
import { StaffProvider } from "@/lib/staffStore";
import "./staff.css";

export const metadata: Metadata = {
  title: "Denta Kids · Staff Console (ระบบจัดการคลินิก)",
  description: "ระบบบริหารจัดการนัดหมาย ทันตแพทย์ และคนไข้คลินิกทันตกรรมเด็ก Denta Kids",
};

/**
 * The staff console renders from Postgres: the layout fetches the whole working
 * state once (appointments, dentists, patients, waitlist, prices, schedule) and
 * hands it to the provider. Mutations go through Server Actions which
 * revalidate these routes, so navigating between pages re-reads fresh data.
 *
 * `connection()` pins every /staff route to request time: the data comes from
 * Postgres and must never be prerendered at build (route segment config set in
 * a client page does not apply — the layout carries it instead).
 */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await connection();
  /**
   * The staff console is the desktop app — the web URL 404s in production so
   * there's no findable staff surface at all. Escape hatch: STAFF_WEB=1
   * re-enables the pages behind the PIN gate (e.g. the app is broken and the
   * desk needs the schedule from a browser). Dev mode renders freely.
   */
  if (process.env.NODE_ENV === "production" && process.env.STAFF_WEB !== "1") notFound();
  if (process.env.STAFF_WEB === "1" && !(await isStaffAuthed())) return <StaffLoginGate />;
  const initial = await staffBootstrap();

  /**
   * The web console ships the same edition split as the desktop builds:
   * STAFF_EDITION=full exposes patients + room pages (the "full" install);
   * anything else is the lean queue console.
   */
  const edition = process.env.STAFF_EDITION === "full" ? "full" : "queue";

  return (
    <StaffProvider initial={initial} edition={edition}>
      <StaffUserGate>
      <DeviceGate>
        <div className="staff-root">
          <StaffSidebar />
          <div className="staff-main">
            <StaffTopbar />
            {children}
          </div>
        </div>
      </DeviceGate>
      </StaffUserGate>
    </StaffProvider>
  );
}
