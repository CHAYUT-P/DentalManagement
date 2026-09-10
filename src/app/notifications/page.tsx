import type { Metadata } from "next";
import { connection } from "next/server";

import { NoticesPage } from "@/components/NoticesPage";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Denta Kids · การแจ้งเตือน",
  description: "ข่าวสารและการแจ้งเตือนนัดหมายจากคลินิก",
};

export default async function Page() {
  await connection();
  return <NoticesPage today={todayISO()} />;
}
