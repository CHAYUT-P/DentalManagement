import type { Metadata } from "next";
import { connection } from "next/server";

import { BookingsPage, type BookingView } from "@/components/BookingsPage";
import { todayISO } from "@/lib/dates";
import { myBookings } from "@/server/actions";

export const metadata: Metadata = {
  title: "Denta Kids · ประวัติการจอง",
  description: "นัดหมายที่กำลังจะถึงและนัดหมายที่ผ่านมา",
};

/**
 * Outside LINE there is no patient identity, so the server view is the demo
 * family (the seed's คุณแม่มณฑิรา phone). Inside LIFF the client swaps this
 * prop for the verified account's bookings — see BookingsPage.
 */
const DEMO_PHONE = "0812345678";

export default async function Page() {
  await connection();
  const rows = await myBookings(DEMO_PHONE);
  const bookings: BookingView[] = rows.map((a) => ({
    ref: a.ref,
    date: a.date,
    time: a.time,
    treatmentKey: a.treatmentKey,
    dentistSlug: a.dentistSlug || null,
    status: a.status,
    childName: a.childName,
  }));
  return <BookingsPage today={todayISO()} bookings={bookings} />;
}
