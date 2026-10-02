"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStaff } from "@/lib/staffStore";
import { useStaffUser } from "@/lib/staffUser";
import { railItems, RailLogo } from "./staffRail";

/**
 * The web console's menu rail — three entries (วันนี้ · ตารางนัด · ตั้งค่า),
 * plus patients and rooms in the full edition. The desktop app renders the
 * same items through react-router (apps/staff-desktop/src/components/StaffSidebar).
 */
export function StaffSidebar() {
  const pathname = usePathname();
  const staff = useStaff();
  const { can } = useStaffUser();
  const items = railItems(staff, "/staff", can);

  return (
    <nav className="staff-rail" aria-label="เมนูหลัก">
      <RailLogo />
      {items.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`staff-rail-item ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={22} />
            <span>{item.label}</span>
            {item.badge ? <span className="staff-rail-badge">{item.badge}</span> : null}
          </Link>
        );
      })}
      <div className="staff-rail-foot">หน้าเคาน์เตอร์</div>
    </nav>
  );
}
