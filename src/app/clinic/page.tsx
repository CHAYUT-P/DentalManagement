import type { Metadata } from "next";
import { connection } from "next/server";

import { ClinicPage } from "@/components/ClinicPage";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Denta Kids · เกี่ยวกับคลินิก",
  description: "เวลาทำการ เบอร์โทร LINE แผนที่ และสิ่งอำนวยความสะดวกของคลินิก",
};

/** today's row in the opening-hours table is highlighted, so this waits for the
 *  request rather than freezing a weekday into the build */
export default async function Page() {
  await connection();
  return <ClinicPage today={todayISO()} />;
}
