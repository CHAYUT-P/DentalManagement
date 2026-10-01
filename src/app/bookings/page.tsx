import type { Metadata } from "next";
import { connection } from "next/server";

import { BookingsPage } from "@/components/BookingsPage";
import { todayISO } from "@/lib/dates";
import { TreatmentsProvider } from "@/lib/treatmentsContext";
import { listTreatmentCatalog } from "@/server/queries";

export const metadata: Metadata = {
  title: "Denta Kids · ประวัติการจอง",
  description: "นัดหมายที่กำลังจะถึงและนัดหมายที่ผ่านมา",
};

/**
 * Identity arrives on the client, not here — inside LIFF the verified LINE
 * userId picks the guardian's bookings; anywhere else the visitor types the
 * booking phone. No rows are preloaded: with nobody identified, the page has
 * nothing of anybody's to show.
 */
export default async function Page() {
  await connection();
  // every treatment, hidden ones too — an old booking still shows its name
  const catalog = await listTreatmentCatalog();
  return (
    <TreatmentsProvider list={catalog}>
      <BookingsPage today={todayISO()} />
    </TreatmentsProvider>
  );
}
