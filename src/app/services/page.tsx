import type { Metadata } from "next";

import { ServicesPage } from "@/components/ServicesPage";
import { listTreatmentCatalog } from "@/server/queries";

export const metadata: Metadata = {
  title: "Denta Kids · บริการทั้งหมด",
  description: "บริการทันตกรรมสำหรับเด็กทั้งหมดของคลินิก พร้อมราคาเริ่มต้น",
};

/** names, icons, prices and show/hide are staff-editable — read the table, never prerender */
export const dynamic = "force-dynamic";

export default async function Page() {
  // only what the clinic shows on the website (ตั้งค่า → บริการ & ราคา)
  const treatments = (await listTreatmentCatalog()).filter((t) => t.isActive);
  return <ServicesPage treatments={treatments} />;
}
