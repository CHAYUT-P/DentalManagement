import { HomePage } from "@/components/HomePage";
import { toUIDentists } from "@/lib/convert";
import { weekday, todayISO } from "@/lib/dates";
import { getClinicInfo, listActiveDentists, listClinicDays, listTreatmentCatalog } from "@/server/queries";
import { TreatmentsProvider } from "@/lib/treatmentsContext";

/** every fact on this page is DB data — never prerender it */
export const dynamic = "force-dynamic";

/**
 * The home screen. The dentist strip, today's hours, phone and address all
 * come from Postgres, so the staff console edits what patients see here.
 */
export default async function Home() {
  const [dentistRows, days, info, catalog] = await Promise.all([
    listActiveDentists(),
    listClinicDays(),
    getClinicInfo(),
    listTreatmentCatalog(),
  ]);

  return (
    <TreatmentsProvider list={catalog}>
    <HomePage
      dentists={toUIDentists(dentistRows)}
      hours={days.map((d) => ({ day: d.day, isOpen: d.isOpen, start: d.start, end: d.end }))}
      info={info}
      todayKey={weekday(todayISO())}
    />
    </TreatmentsProvider>
  );
}
