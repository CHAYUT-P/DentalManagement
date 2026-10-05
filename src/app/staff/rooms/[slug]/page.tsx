import { RoomRoute } from "@/components/staff/rooms/RoomRoute";

/**
 * One dentist's room — the page a treatment-room PC stays on all day.
 * (Plain `params: Promise` rather than PageProps<> — the desktop app's
 * tsconfig globs this file too and Next's generated globals don't exist there.)
 */
export default async function StaffRoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RoomRoute slug={slug} />;
}
