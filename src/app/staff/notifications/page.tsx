"use client";

import React from "react";
import { useStaff } from "@/lib/staffStore";
import {
  IconBell,
  IconCalendar,
  IconCheck,
  IconZap,
  IconClock,
  IconSmartphone,
  IconWalkIn,
} from "@/components/staff/staffIcons";

export default function StaffNotificationsPage() {
  const { notifications, markAllNotificationsRead, simulateOnlineBooking } = useStaff();

  return (
    <div className="staff-container">
      <div className="staff-page-header">
        <div>
          <h2>ศูนย์การแจ้งเตือน & ข้อความ LINE (Notifications & LINE Logs)</h2>
          <p>ประวัติการจองออนไลน์ที่ส่งเข้ามา การแจ้งเตือนคนไข้ และข้อความเตือนนัดหมายอัตโนมัติ</p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="btn-simulate-booking"
            onClick={simulateOnlineBooking}
          >
            <IconZap size={14} />
            <span>+ ทดสอบจำลองการจอง LINE</span>
          </button>

          <button
            type="button"
            className="btn-secondary-staff"
            onClick={markAllNotificationsRead}
          >
            <IconCheck size={14} />
            <span>อ่านทั้งหมดแล้ว</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {notifications.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "50px",
              background: "#fff",
              borderRadius: "12px",
              border: "1px solid var(--staff-border)",
              color: "var(--staff-ink-muted)",
            }}
          >
            ไม่มีการแจ้งเตือนในขณะนี้
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              style={{
                background: n.unread ? "#ffffff" : "var(--staff-surface-subtle)",
                border: "1px solid",
                borderColor: n.unread ? "var(--staff-primary)" : "var(--staff-border)",
                borderRadius: "12px",
                padding: "16px 20px",
                display: "flex",
                alignItems: "flex-start",
                gap: "14px",
                boxShadow: n.unread ? "var(--staff-shadow-sm)" : "none",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background:
                    n.type === "online_booking"
                      ? "#06c755"
                      : n.type === "check_in"
                      ? "#f59f00"
                      : "var(--staff-primary-light)",
                  color:
                    n.type === "online_booking" || n.type === "check_in"
                      ? "#fff"
                      : "var(--staff-primary)",
                  display: "grid",
                  placeItems: "center",
                  flex: "none",
                }}
              >
                {n.type === "online_booking" && <IconSmartphone size={18} color="#fff" />}
                {n.type === "check_in" && <IconWalkIn size={18} color="#fff" />}
                {n.type === "reminder" && <IconBell size={16} />}
                {n.type === "reschedule" && <IconCalendar size={16} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <strong style={{ fontSize: "14px", color: "var(--staff-ink)" }}>
                      {n.title}
                    </strong>
                    {n.unread && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "700",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: "var(--staff-accent-rose)",
                          color: "#fff",
                        }}
                      >
                        ใหม่
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "11.5px", color: "var(--staff-ink-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <IconClock size={12} /> {n.time}
                  </span>
                </div>

                <p style={{ fontSize: "13px", color: "var(--staff-ink-2)", margin: "4px 0 0 0" }}>
                  {n.body}
                </p>

                {n.refCode && (
                  <div style={{ marginTop: "8px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        background: "var(--staff-surface-hover)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        color: "var(--staff-primary)",
                      }}
                    >
                      รหัสอ้างอิง: {n.refCode}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
