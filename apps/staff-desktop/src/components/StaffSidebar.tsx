import React from "react";
import { NavLink, useLocation } from "react-router-dom";

import { useStaff } from "@/lib/staffStore";
import { railItems, RailLogo } from "@/components/staff/staffRail";

/**
 * The web console's menu rail, ported: next/link + usePathname become NavLink +
 * useLocation, and the /staff/… hrefs become app-relative. The entries come
 * from the same `railItems` the web uses, so the two can't drift apart.
 */
export function StaffSidebar() {
  const { pathname } = useLocation();
  const staff = useStaff();
  const items = railItems(staff, "");

  return (
    <nav className="staff-rail" aria-label="เมนูหลัก">
      <RailLogo />
      {items.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <NavLink
            key={item.href}
            to={item.href}
            className={`staff-rail-item ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={22} />
            <span>{item.label}</span>
            {item.badge ? <span className="staff-rail-badge">{item.badge}</span> : null}
          </NavLink>
        );
      })}
      <div className="staff-rail-foot">หน้าเคาน์เตอร์</div>
    </nav>
  );
}
