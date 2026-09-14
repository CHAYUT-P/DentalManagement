"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStaff } from "@/lib/staffStore";
import {
  IconCalendar,
  IconList,
  IconUsers,
  IconDentist,
  IconServices,
  IconSettings,
  IconBell,
  IconClock,
  IconExternal,
  IconWalkIn,
  IconZap,
} from "./staffIcons";

export function StaffSidebar() {
  const pathname = usePathname();
  const { today, appointments, waitlist, notifications, simulateOnlineBooking, setWalkinOpen } =
    useStaff();

  const waitingCount = waitlist.filter((w) => w.status === "waiting").length;
  const unreadNotifs = notifications.filter((n) => n.unread).length;
  const queueCount =
    appointments.filter((a) => a.date === today && (a.status === "arrived" || a.status === "in_chair"))
      .length + waitingCount;

  const navItems = [
    { href: "/staff", label: "ตารางนัดหมาย (Schedule)", icon: IconCalendar, exact: true },
    {
      href: "/staff/queue",
      label: "คิววันนี้ (Queue)",
      icon: IconClock,
      badge: queueCount > 0 ? `${queueCount}` : undefined,
    },
    { href: "/staff/appointments", label: "จัดการนัดทั้งหมด (Bookings)", icon: IconList },
    {
      // the queue is a drawer on the schedule page, so this jumps there and opens it
      href: "/staff",
      label: "คิว Walk-in วันนี้",
      icon: IconWalkIn,
      badge: waitingCount > 0 ? `${waitingCount} รอ` : undefined,
      action: () => setWalkinOpen(true),
    },
    { href: "/staff/dentists", label: "ทันตแพทย์ & เวรตรวจ", icon: IconDentist },
    { href: "/staff/patients", label: "ประวัติคนไข้ (Patients)", icon: IconUsers },
    { href: "/staff/services", label: "หัตถการ & ค่ารักษา", icon: IconServices },
    {
      href: "/staff/notifications",
      label: "การแจ้งเตือน & LINE",
      icon: IconBell,
      badge: unreadNotifs > 0 ? `${unreadNotifs}` : undefined,
    },
    { href: "/staff/settings", label: "ตั้งค่าคลินิก (Settings)", icon: IconSettings },
  ];

  return (
    <aside className="staff-sidebar">
      {/* Brand */}
      <div className="staff-brand">
        <div className="staff-brand-logo">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 6.9c-2 0-3-1-5-1-2.8 0-4.7 2.3-4.7 5.6 0 2.5.8 3.9 1.35 5.8.45 1.65.6 3.1.75 4.8.25 1.8.65 4 2.35 4 1.65 0 2-1.95 2.35-4 .3-1.7 1.2-2.15 2.85-2.15s2.55.45 2.85 2.15c.35 2.05.7 4 2.35 4 1.7 0 2.1-2.2 2.35-4 .15-1.7.3-3.15.75-4.8.55-1.9 1.35-3.3 1.35-5.8 0-3.3-1.9-5.6-4.7-5.6-2 0-2.85.9-4.85.9Z" fill="#fff" />
          </svg>
        </div>
        <div className="staff-brand-text">
          <h1>Denta Kids</h1>
          <span className="staff-brand-badge">Staff Web Console</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="staff-nav">
        {navItems.map((item) => {
          // action items (the walk-in queue) never highlight — they open a
          // drawer on the schedule page rather than being a page of their own
          const isActive = item.action
            ? false
            : item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

          const IconComponent = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={item.action}
              className={`staff-nav-item ${isActive ? "active" : ""}`}
            >
              <IconComponent size={18} />
              <span>{item.label}</span>
              {item.badge && <span className="staff-nav-badge">{item.badge}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="staff-sidebar-footer">
        {/* Simulation button */}
        <button
          type="button"
          className="btn-simulate-booking"
          onClick={simulateOnlineBooking}
          title="จำลองคนไข้จองคิวผ่าน LINE LIFF เพื่อทดสอบระบบแจ้งเตือนและลงตารางตรวจทันที"
        >
          <IconZap size={14} />
          <span>จำลองการจอง LINE LIFF</span>
        </button>

        {/* Link back to Patient Web */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" target="_blank" className="link-patient-view">
            <span>หน้าเว็บคนไข้ (Patient Web)</span>
            <IconExternal size={12} />
          </Link>
        </div>

        {/* User profile */}
        <div className="staff-user-card">
          <div className="staff-avatar">ข</div>
          <div className="staff-user-info">
            <div className="staff-user-name">พยาบาลขวัญใจ (Kwan)</div>
            <div className="staff-user-role">Front Desk & Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
