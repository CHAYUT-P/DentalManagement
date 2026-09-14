import type { Metadata } from "next";

import { DentistsPage } from "@/components/DentistsPage";
import { toUIDentists } from "@/lib/convert";
import { listActiveDentists } from "@/server/queries";

export const metadata: Metadata = {
  title: "Denta Kids · ทีมทันตแพทย์",
  description: "ทันตแพทย์ของคลินิก ประวัติ ความเชี่ยวชาญ และวันออกตรวจ",
};

/** the roster is DB data — never prerender it */
export const dynamic = "force-dynamic";

export default async function Page() {
  const dentists = toUIDentists(await listActiveDentists());
  return <DentistsPage dentists={dentists} />;
}
