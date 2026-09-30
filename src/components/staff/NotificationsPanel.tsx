"use client";

import React, { useEffect } from "react";
import { useStaff, type StaffAppointment } from "@/lib/staffStore";
import { IconZap } from "./staffIcons";

/**
 * The bell's drop-down — what used to be the การแจ้งเตือน page. New items
 * first under their own label, then the rest; a row that carries a booking
 * ref opens that booking.
 *
 * The LINE-booking simulator is a testing tool, so it only shows in
 * development builds — never on the clinic's own machines.
 */
const SHOW_TEST_TOOLS = typeof process !== "undefined" && process.env.NODE_ENV === "development";

export function NotificationsPanel({
  onClose,
  onOpenAppointment,
}: {
  onClose: () => void;
  onOpenAppointment: (a: StaffAppointment) => void;
}) {
  const { notifications, appointments, markAllNotificationsRead, simulateOnlineBooking } = useStaff();
  const fresh = notifications.filter((n) => n.unread);
  const earlier = notifications.filter((n) => !n.unread);

  // Esc closes it, like the search drop-down beside it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const open = (ref?: string) => {
    if (!ref) return;
    const appt = appointments.find((a) => a.ref === ref);
    if (!appt) return;
    onOpenAppointment(appt);
    onClose();
  };

  const row = (n: (typeof notifications)[number]) => (
    <button
      key={n.id}
      type="button"
      className={`notif-row ${n.unread ? "unread" : ""}`}
      onClick={() => open(n.refCode)}
      disabled={!n.refCode}
    >
      <span className="notif-dot" aria-hidden="true" />
      <span className="notif-text">
        <span className="notif-title">{n.title}</span>
        <span className="notif-body">{n.body}</span>
        <span className="notif-meta">
          {n.refCode ? `${n.refCode} · ` : ""}
          {n.time}
        </span>
      </span>
    </button>
  );

  return (
    <>
      <div className="staff-popover-scrim" onClick={onClose} aria-hidden="true" />
      <section className="notif-panel" aria-label="การแจ้งเตือน">
        <header className="notif-head">
          <h2>การแจ้งเตือน</h2>
          {fresh.length > 0 ? <span className="notif-new">ใหม่ {fresh.length}</span> : null}
          <span style={{ flex: 1 }} />
          {fresh.length > 0 ? (
            <button type="button" className="btn-secondary-staff" onClick={markAllNotificationsRead}>
              อ่านทั้งหมด
            </button>
          ) : null}
        </header>
        <div className="notif-list">
          {notifications.length === 0 ? <div className="notif-empty">ยังไม่มีการแจ้งเตือน</div> : null}
          {fresh.length > 0 ? <div className="notif-group">ใหม่</div> : null}
          {fresh.map(row)}
          {earlier.length > 0 ? <div className="notif-group">ก่อนหน้านี้</div> : null}
          {earlier.map(row)}
        </div>
        {SHOW_TEST_TOOLS ? (
          <footer className="notif-foot">
            <button type="button" className="btn-simulate-booking" onClick={simulateOnlineBooking}>
              <IconZap size={14} />
              <span>ทดสอบ: จำลองการจองผ่าน LINE</span>
            </button>
          </footer>
        ) : null}
      </section>
    </>
  );
}
