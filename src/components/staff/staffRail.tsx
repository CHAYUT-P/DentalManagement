import React from "react";
import type { StaffContextType } from "@/lib/staffStore";
import { IconBuilding, IconCalendar, IconClock, IconDollar, IconFilter, IconList, IconSettings, IconSmartphone, IconUsers } from "./staffIcons";

import type { Perm } from "@/lib/roles";

export interface RailItem {
  href: string;
  label: string;
  icon: (p: { size?: number }) => React.ReactElement;
  badge?: string;
  /** whether this entry owns the current path (old routes fold into the new ones) */
  match: (pathname: string) => boolean;
}

/**
 * The rail's entries, shared by the web console (`/staff` prefix, next/link)
 * and the desktop app (no prefix, react-router). Old addresses still light up
 * the entry that absorbed them: queue → วันนี้, bookings → ตารางนัด,
 * roster / prices / notifications → ตั้งค่า.
 */
export function railItems(
  s: Pick<StaffContextType, "edition" | "today" | "appointments" | "waitlist" | "lineUnread">,
  prefix: string,
  /** the signed-in role's permissions (full edition) — the queue edition shows all */
  allow: (perm: Perm) => boolean = () => true,
): RailItem[] {
  const at = (p: string) => `${prefix}${p}` || "/";
  const under = (pathname: string, ...paths: string[]) =>
    paths.some((p) => pathname === at(p) || pathname.startsWith(`${at(p)}/`));

  // people in the building who still need the desk: checked in, in the chair,
  // or a walk-in waiting
  const inClinic =
    s.appointments.filter((a) => a.date === s.today && (a.status === "arrived" || a.status === "in_chair")).length +
    s.waitlist.filter((w) => w.status === "waiting" || w.status === "in_chair").length;

  const items: (RailItem & { full?: boolean; perm?: Perm })[] = [
    {
      href: at("") || "/",
      label: "วันนี้",
      icon: IconClock,
      badge: inClinic > 0 ? String(inClinic) : undefined,
      match: (p) => p === (at("") || "/") || under(p, "/queue"),
    },
    { href: at("/schedule"), label: "ตารางนัด", icon: IconCalendar, match: (p) => under(p, "/schedule", "/appointments") },
    { href: at("/patients"), label: "คนไข้", icon: IconUsers, full: true, perm: "patients", match: (p) => under(p, "/patients") },
    { href: at("/rooms"), label: "ห้องตรวจ", icon: IconBuilding, full: true, perm: "rooms", match: (p) => under(p, "/rooms") },
    {
      href: at("/chat"),
      label: "แชท LINE",
      icon: IconSmartphone,
      full: true,
      perm: "chat",
      badge: s.lineUnread > 0 ? String(s.lineUnread) : undefined,
      match: (p) => under(p, "/chat"),
    },
    { href: at("/cashier"), label: "การเงิน", icon: IconDollar, full: true, perm: "cashier", match: (p) => under(p, "/cashier") },
    { href: at("/stock"), label: "คลัง & แลป", icon: IconList, full: true, perm: "stock", match: (p) => under(p, "/stock") },
    { href: at("/reports"), label: "รายงาน", icon: IconFilter, full: true, perm: "reports", match: (p) => under(p, "/reports") },
    {
      href: at("/settings"),
      label: "ตั้งค่า",
      icon: IconSettings,
      perm: "settings",
      match: (p) => under(p, "/settings", "/dentists", "/services", "/notifications"),
    },
  ];
  return items.filter((i) => (s.edition === "full" || !i.full) && (!i.perm || allow(i.perm)));
}

export function RailLogo() {
  return (
    <div className="staff-rail-logo" aria-label="Denta Kids">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
        <path d="M12 5.2c-1.6 0-2.6-1.2-4.6-1.2C4.9 4 3.5 6.1 3.5 8.6c0 2 .6 3.8 1.3 5.6.8 2 1.3 5.8 3 5.8 1.6 0 1.7-3.6 3.1-3.6h2.2c1.4 0 1.5 3.6 3.1 3.6 1.7 0 2.2-3.8 3-5.8.7-1.8 1.3-3.6 1.3-5.6C20.5 6.1 19.1 4 16.6 4c-2 0-3 1.2-4.6 1.2Z" />
      </svg>
    </div>
  );
}
