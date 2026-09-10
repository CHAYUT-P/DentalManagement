import type { Metadata } from "next";

import { StaffSidebar } from "@/components/staff/StaffSidebar";
import { StaffTopbar } from "@/components/staff/StaffTopbar";
import { staffBootstrap } from "@/server/actions";
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
 */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
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
