"use client";

import { useRouter } from "next/navigation";
import React from "react";

import { EditionNotice } from "./DeviceGate";
import { RoomPage } from "./RoomPage";
import { useStaff } from "@/lib/staffStore";

/**
 * The web console's room pages: /staff/rooms picks which dentist's room to
 * open, /staff/rooms/[slug] is the room itself. Both need a client wrapper —
 * RoomPage takes a navigation callback and this is where next/router lives.
 */
export function RoomsIndex() {
  const router = useRouter();
  const { edition } = useStaff();
  if (edition !== "full") return <EditionNotice feature="ห้องตรวจ" />;
  return (
    <RoomPage
      slug={null}
      onPickRoom={(s) => {
        if (s) router.push(`/staff/rooms/${s}`);
      }}
    />
  );
}

export function RoomRoute({ slug }: { slug: string }) {
  const router = useRouter();
  const { edition } = useStaff();
  if (edition !== "full") return <EditionNotice feature="ห้องตรวจ" />;
  return (
    <RoomPage
      slug={slug}
      onPickRoom={(s) => router.push(s ? `/staff/rooms/${s}` : "/staff/rooms")}
    />
  );
}
