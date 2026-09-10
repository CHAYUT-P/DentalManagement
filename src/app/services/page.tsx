import type { Metadata } from "next";

import { ServicesPage } from "@/components/ServicesPage";

export const metadata: Metadata = {
  title: "Denta Kids · บริการทั้งหมด",
  description: "บริการทันตกรรมสำหรับเด็กทั้งหมดของคลินิก พร้อมราคาเริ่มต้น",
};

export default function Page() {
  return <ServicesPage />;
}
