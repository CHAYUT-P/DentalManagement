import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { StaffLoginGate } from "@/components/staff/StaffLoginGate";
import { StaffSidebar } from "@/components/staff/StaffSidebar";
import { StaffTopbar } from "@/components/staff/StaffTopbar";
import { staffBootstrap } from "@/server/actions";
import { isStaffAuthed } from "@/server/staffAuth";
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

  return (
    <StaffProvider initial={initial}>
      <div className="staff-root">
        <StaffSidebar />
        <div className="staff-main">
          <StaffTopbar />
          {children}
        </div>
      </div>
    </StaffProvider>
  );
}
