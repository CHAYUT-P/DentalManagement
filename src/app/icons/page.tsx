import type { Metadata } from "next";

import { IconsPage } from "@/components/IconsPage";
import "./icons.css";

export const metadata: Metadata = {
  title: "Denta Kids · ชุดไอคอนบริการ",
  description: "ไอคอนบริการทั้งหมดของแอป — หน้าอ้างอิงภายใน",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <IconsPage />;
}
