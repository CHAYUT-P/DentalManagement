import type { Metadata } from "next";

import { ServicesPage } from "@/components/ServicesPage";
import { listTreatments } from "@/server/queries";

export const metadata: Metadata = {
  title: "Denta Kids · บริการทั้งหมด",
  description: "บริการทันตกรรมสำหรับเด็กทั้งหมดของคลินิก พร้อมราคาเริ่มต้น",
};

/** prices are staff-editable data — read the treatment table, never prerender */
export const dynamic = "force-dynamic";

export default async function Page() {
  const prices: Partial<Record<string, number | null>> = {};
  for (const t of await listTreatments()) prices[t.key] = t.price;
  return <ServicesPage prices={prices} />;
}
