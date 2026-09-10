"use client";

import React, { useState, useEffect } from "react";
import { useStaff } from "@/lib/staffStore";
import { useT } from "@/i18n/lang";
import { fmtLong } from "@/lib/dates";
import { BookingModal } from "./BookingModal";
import { AddWaitlistModal } from "./AddWaitlistModal";
import { IconPlus, IconWalkIn, IconClock, IconCheck, IconAlertTriangle } from "./staffIcons";

export function StaffTopbar() {
  const { today, toast } = useStaff();
  const t = useT();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isWarningToast =
    toast &&
    (toast.includes("อยู่แล้ว") ||
      toast.includes("ข้อผิดพลาด") ||
      toast.includes("ล้มเหลว") ||
      toast.includes("ไม่สำเร็จ"));

  return (
    <>
      <header className="staff-topbar">
        <div className="staff-topbar-left">
          <div className="staff-date-badge">
            <IconClock size={15} />
            <span>{fmtLong(t, today, "th")}</span>
            <span style={{ color: "var(--staff-primary)", fontWeight: "700" }}>{timeStr}</span>
          </div>
        </div>

        <div className="staff-topbar-actions">
          <button
            type="button"
            className="btn-secondary-staff"
            onClick={() => setShowWaitlistModal(true)}
          >
            <IconWalkIn size={15} />
            <span>+ ลงชื่อ Walk-in</span>
          </button>

          <button
            type="button"
            className="btn-primary-staff"
            onClick={() => setShowBookingModal(true)}
          >
            <IconPlus size={15} />
            <span>+ รับนัดใหม่ (New Booking)</span>
          </button>
        </div>
      </header>

      {/* Floating Toast with SVG status icon */}
      {toast && (
        <div className="staff-floating-toast">
          {isWarningToast ? (
            <IconAlertTriangle size={16} color="#ffd43b" />
          ) : (
            <IconCheck size={16} color="#51cf66" />
          )}
          <span>{toast}</span>
        </div>
      )}

      {showBookingModal && (
        <BookingModal onClose={() => setShowBookingModal(false)} />
      )}

      {showWaitlistModal && (
        <AddWaitlistModal onClose={() => setShowWaitlistModal(false)} />
      )}
    </>
  );
}
