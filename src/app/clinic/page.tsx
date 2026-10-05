import type { Metadata } from "next";
import { connection } from "next/server";

import { ClinicPage } from "@/components/patient/ClinicPage";
import { todayISO } from "@/lib/dates";
import { getClinicInfo, listClinicDays } from "@/server/queries";

export const metadata: Metadata = {
  title: "Denta Kids · เกี่ยวกับคลินิก",
  description: "ข้อมูลคลินิก เวลาทำการ ช่องทางติดต่อ และที่ตั้ง",
};

/**
 * Everything factual on this page — opening hours, phone, LINE, map pin,
 * address — comes from Postgres (clinic_day + clinic_info), so the staff
 * settings page edits what patients read.
 */
export default async function Page() {
  await connection();
  const [days, info] = await Promise.all([listClinicDays(), getClinicInfo()]);
  return <ClinicPage today={todayISO()} days={days} info={info} />;
}
