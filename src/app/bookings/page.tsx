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
 * LINE login is not wired yet, so "this patient" is the demo family: the same
 * phone number the seed gave คุณแม่มณฑิรา. When LIFF arrives, the verified
 * LINE userId picks the guardian row instead and this page changes one lookup.
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
