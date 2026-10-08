import type { Metadata } from "next";

import { NoticesPage } from "@/components/patient/NoticesPage";

export const metadata: Metadata = {
  title: "Denta Kids · การแจ้งเตือน",
  description: "ข้อความที่คลินิกส่งถึงคุณทาง LINE",
};

/** the family's messages load on the client, after their LINE sign-in */
export default function Page() {
  return <NoticesPage />;
}
