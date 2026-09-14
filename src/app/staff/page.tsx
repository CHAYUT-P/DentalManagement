"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useStaff, type StaffAppointment } from "@/lib/staffStore";
import { addDays, weekday, daysFrom, fmtLong } from "@/lib/dates";
import { useT } from "@/i18n/lang";
import { BookingModal } from "@/components/staff/BookingModal";
import { AppointmentDetailModal } from "@/components/staff/AppointmentDetailModal";
import { AddWaitlistModal } from "@/components/staff/AddWaitlistModal";
import { ScheduleDatePicker } from "@/components/staff/ScheduleDatePicker";
import {
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconPlus,
  IconWalkIn,
  IconCheck,
  IconX,
  IconDentist,
  IconGrip,
} from "@/components/staff/staffIcons";

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00"
];

export default function StaffSchedulePage() {
  const {
    today,
    appointments,
    dentists,
    waitlist,
    showToast,
    rescheduleAppointment,
    updateWaitlistStatus,
    removeWaitlist,
    walkinOpen,
    setWalkinOpen,
  } = useStaff();
  const dict = useT();

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedAppt, setSelectedAppt] = useState<StaffAppointment | null>(null);
  const [newBookingSlot, setNewBookingSlot] = useState<{
    date: string;
    time: string;
    dentistSlug: string;
  } | null>(null);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [showOnlyOnDuty, setShowOnlyOnDuty] = useState(true);

  // Drag and drop states
  const [draggingApptId, setDraggingApptId] = useState<string | null>(null);
  const [dragOverSlotKey, setDragOverSlotKey] = useState<string | null>(null);

  // Check weekday
  const weekdayKey = weekday(selectedDate);
  const weekdayNum = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(weekdayKey);

  const isDentistWorking = useCallback(
    (dentist: (typeof dentists)[0]) => {
      const shift = dentist.shifts?.find((s) => s.weekday === weekdayNum);
      return shift ? shift.enabled : false;
    },
    [weekdayNum]
  );

  const getDentistShiftHours = (dentist: (typeof dentists)[0]) => {
    const shift = dentist.shifts?.find((s) => s.weekday === weekdayNum);
    return shift && shift.enabled ? `${shift.start} - ${shift.end}` : "หยุด";
  };

  // Dentists to show
  const displayedDentists = useMemo(() => {
    const active = dentists.filter((d) => d.isActive);
    if (!showOnlyOnDuty) return active;
    const onDuty = active.filter(isDentistWorking);
    return onDuty.length > 0 ? onDuty : active;
  }, [dentists, showOnlyOnDuty, isDentistWorking]);

  // Appointments on selected date
  const dayAppts = useMemo(
    () => appointments.filter((a) => a.date === selectedDate),
    [appointments, selectedDate]
  );

  /** live bookings per day — what the date picker draws under each day number */
  const apptCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of appointments) {
      if (a.status === "cancelled") continue;
      m[a.date] = (m[a.date] ?? 0) + 1;
    }
    return m;
  }, [appointments]);

  // Quick stats
  const confirmedCount = dayAppts.filter((a) => a.status === "confirmed").length;
  const completedCount = dayAppts.filter((a) => a.status === "completed").length;
  const cancelledCount = dayAppts.filter((a) => a.status === "cancelled").length;
  const waitingCount = waitlist.filter((w) => w.status === "waiting").length;

  const getSlotAppt = (dentistSlug: string, time: string) => {
    return dayAppts.find((a) => a.dentistSlug === dentistSlug && a.time === time);
  };

  const dayOffset = daysFrom(today, selectedDate);
  const dateLong = fmtLong(dict, selectedDate, "th");
  let dateTitle = dateLong;
  if (dayOffset === 0) dateTitle = `วันนี้ · ${dateLong}`;
  else if (dayOffset === 1) dateTitle = `พรุ่งนี้ · ${dateLong}`;
  else if (dayOffset === -1) dateTitle = `เมื่อวาน · ${dateLong}`;

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, appt: StaffAppointment) => {
    e.dataTransfer.setData("text/plain", appt.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingApptId(appt.id);
  };

  const handleDragEnd = () => {
    setDraggingApptId(null);
    setDragOverSlotKey(null);
  };

  const handleDragOver = (e: React.DragEvent, slotKey: string, isWorking: boolean) => {
    if (!isWorking) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverSlotKey !== slotKey) {
      setDragOverSlotKey(slotKey);
    }
  };

  const handleDragLeave = (slotKey: string) => {
    if (dragOverSlotKey === slotKey) {
      setDragOverSlotKey(null);
    }
  };

  const handleDrop = (
    e: React.DragEvent,
    targetDate: string,
    targetTime: string,
    targetDentistSlug: string,
    isWorking: boolean
  ) => {
    e.preventDefault();
    setDragOverSlotKey(null);
    setDraggingApptId(null);

    if (!isWorking) return;

    const apptId = e.dataTransfer.getData("text/plain") || draggingApptId;
    if (!apptId) return;

    const targetAppt = appointments.find((a) => a.id === apptId);
    if (!targetAppt) return;

    // Check if dropping on same slot
    if (
      targetAppt.date === targetDate &&
      targetAppt.time === targetTime &&
      targetAppt.dentistSlug === targetDentistSlug
    ) {
      return;
    }

    // Check if slot already has an appointment
    const existing = dayAppts.find(
      (a) => a.id !== apptId && a.dentistSlug === targetDentistSlug && a.time === targetTime && a.status === "confirmed"
    );

    if (existing) {
      showToast(`เวลานี้มีนัดหมายของ ${existing.childName} อยู่แล้ว`);
      return;
    }

    rescheduleAppointment(apptId, targetDate, targetTime, targetDentistSlug);

    const doc = dentists.find((d) => d.slug === targetDentistSlug);
    const docName = doc ? doc.text.th.name : "ทันตแพทย์";
    showToast(`ย้ายนัดหมาย ${targetAppt.childName} เป็น ${targetTime} น. (${docName}) สำเร็จ`);
  };

  return (
    <div className="staff-schedule-container">
      {/* ── Single-row Command Toolbar (Clean & Essential) ────────────────────────── */}
      <div className="schedule-toolbar">
        {/* Date Navigator */}
        <div className="schedule-date-nav">
          <button
            type="button"
            className="btn-date-nav"
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            title="วันก่อนหน้า"
          >
            <IconChevronLeft size={16} />
          </button>

          <button
            type="button"
            className={`btn-date-pill ${selectedDate === today ? "active" : ""}`}
            onClick={() => setSelectedDate(today)}
          >
            วันนี้
          </button>

          <button
            type="button"
            className={`btn-date-pill ${selectedDate === addDays(today, 1) ? "active" : ""}`}
            onClick={() => setSelectedDate(addDays(today, 1))}
          >
            พรุ่งนี้
          </button>

          <button
            type="button"
            className="btn-date-nav"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            title="วันถัดไป"
          >
            <IconChevronRight size={16} />
          </button>

          <ScheduleDatePicker
            today={today}
            value={selectedDate}
            onChange={setSelectedDate}
            counts={apptCounts}
          />

          <span className="schedule-current-date-title">{dateTitle}</span>
        </div>

        {/* Status Counters Strip */}
        <div className="schedule-stats-strip">
          <span className="stat-pill-item" title="นัดหมายทั้งหมดในวันนี้">
            <strong style={{ color: "var(--staff-primary)" }}>{dayAppts.length}</strong> นัดหมาย
          </span>
          <span className="stat-pill-divider">·</span>
          <span className="stat-pill-item" style={{ color: "var(--staff-status-confirmed-fg)" }}>
            <strong>{confirmedCount}</strong> รอรับการตรวจ
          </span>
          <span className="stat-pill-divider">·</span>
          <span className="stat-pill-item" style={{ color: "var(--staff-status-completed-fg)" }}>
            <strong>{completedCount}</strong> ตรวจเสร็จสิ้น
          </span>
          {cancelledCount > 0 && (
            <>
              <span className="stat-pill-divider">·</span>
              <span className="stat-pill-item" style={{ color: "var(--staff-status-cancelled-fg)" }}>
                <strong>{cancelledCount}</strong> ยกเลิก
              </span>
            </>
          )}
        </div>

        {/* Right Toolbar Controls */}
        <div className="schedule-toolbar-right">
          {/* On-duty doctor toggle */}
          <button
            type="button"
            className={`btn-seg-toggle ${showOnlyOnDuty ? "active" : ""}`}
            onClick={() => setShowOnlyOnDuty(!showOnlyOnDuty)}
            title="สลับการแสดงเฉพาะแพทย์ที่ลงตรวจ หรือแสดงแพทย์ทุกคน"
          >
            <IconDentist size={14} />
            <span>{showOnlyOnDuty ? `แพทย์ลงตรวจ (${displayedDentists.length})` : "แสดงแพทย์ทุกคน (5)"}</span>
          </button>

          {/* Walk-in Queue Drawer Toggle */}
          <button
            type="button"
            className={`btn-walkin-toggle ${walkinOpen ? "active" : ""}`}
            onClick={() => setWalkinOpen(!walkinOpen)}
          >
            <IconWalkIn size={15} />
            <span>คิว Walk-in</span>
            {waitingCount > 0 && <span className="walkin-badge">{waitingCount}</span>}
          </button>

          {/* New Booking Button */}
          <button
            type="button"
            className="btn-primary-staff"
            onClick={() =>
              setNewBookingSlot({
                date: selectedDate,
                time: "10:00",
                dentistSlug: displayedDentists[0]?.slug || "naree",
              })
            }
          >
            <IconPlus size={15} />
            <span>+ รับนัดหมายใหม่</span>
          </button>
        </div>
      </div>

      {/* ── Main Schedule Matrix (100% Full Width) ────────────────────── */}
      <div className="schedule-matrix-container">
        <div
          className="schedule-matrix-grid"
          style={{ "--doc-count": displayedDentists.length } as React.CSSProperties}
        >
          {/* Header Row: Doctors */}
          <div className="matrix-head-row">
            <div className="matrix-time-header">
              <IconClock size={14} />
              <span>เวลา</span>
            </div>

            {displayedDentists.map((d) => {
              const working = isDentistWorking(d);
              const shiftHours = getDentistShiftHours(d);

              return (
                <div key={d.slug} className={`matrix-doctor-header ${working ? "on-duty" : "off-duty"}`}>
                  <div className="matrix-doc-avatar-wrap">
                    <div
                      className="matrix-doc-avatar"
                      style={{
                        background: working ? "var(--staff-primary-light)" : "#e4e4e7",
                        color: working ? "var(--staff-primary)" : "#71717a",
                      }}
                    >
                      {d.text.th.name.split(" ")[1]?.[0] || "ท"}
                    </div>
                  </div>

                  <div className="matrix-doc-meta">
                    <div className="matrix-doc-fullname">{d.text.th.name}</div>
                    <div className="matrix-doc-specialty">{d.text.th.title}</div>
                    <div className="matrix-doc-shift-badge">
                      {working ? `เวรตรวจ ${shiftHours} น.` : "— หยุดประจำวัน —"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Slot Rows */}
          <div className="matrix-body-scroll">
            {TIME_SLOTS.map((time) => (
              <div key={time} className="matrix-slot-row">
                {/* Time Axis Column */}
                <div className="matrix-time-label">
                  <span>{time}</span>
                </div>

                {/* Dentist Slot Cells */}
                {displayedDentists.map((d) => {
                  const working = isDentistWorking(d);
                  const appt = getSlotAppt(d.slug, time);
                  const slotKey = `${d.slug}-${time}`;
                  const isDragOver = dragOverSlotKey === slotKey;

                  if (!working) {
                    return (
                      <div
                        key={slotKey}
                        className="matrix-cell off-duty"
                        title="แพทย์ไม่อยู่ในเวรตรวจวันนี้"
                      />
                    );
                  }

                  return (
                    <div
                      key={slotKey}
                      className={`matrix-cell ${isDragOver ? "drop-active" : ""}`}
                      onDragOver={(e) => handleDragOver(e, slotKey, working)}
                      onDragLeave={() => handleDragLeave(slotKey)}
                      onDrop={(e) => handleDrop(e, selectedDate, time, d.slug, working)}
                    >
                      {appt ? (
                        <div
                          draggable={appt.status === "confirmed"}
                          onDragStart={(e) => handleDragStart(e, appt)}
                          onDragEnd={handleDragEnd}
                          onClick={() => setSelectedAppt(appt)}
                          className={`appt-chip-card ${appt.status} ${
                            draggingApptId === appt.id ? "is-dragging" : ""
                          }`}
                          title="คลิกเพื่อดูรายละเอียด / ลากเพื่อย้ายเวลาหรือเปลี่ยนแพทย์"
                        >
                          <div className="appt-chip-header">
                            <div className="appt-chip-title">
                              <span className="drag-handle" title="ลากเพื่อย้ายเวลานัด">
                                <IconGrip size={12} />
                              </span>
                              <strong>{appt.childName}</strong>
                              {appt.childAge && <span className="child-age">({appt.childAge}ขวบ)</span>}
                              {appt.forSelf && (
                                <span
                                  className="child-age"
                                  style={{ background: "var(--staff-primary-light)", color: "var(--staff-primary)" }}
                                >
                                  ตนเอง
                                </span>
                              )}
                            </div>
                            <span className="appt-chip-ref">{appt.ref}</span>
                          </div>

                          <div className="appt-chip-body">
                            <span className="appt-treatment-name">
                              {dict.service[appt.treatmentKey] || appt.treatmentKey}
                            </span>
                            {appt.price ? <span className="appt-price">฿{appt.price}</span> : null}
                          </div>

                          <div className="appt-chip-footer">
                            <span className={`source-pill-micro ${appt.source}`}>
                              {appt.source === "online" && "LINE"}
                              {appt.source === "phone" && "TEL"}
                              {appt.source === "walkin" && "WALK"}
                            </span>
                            <span className="appt-phone-micro">{appt.phone}</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-cell-add"
                          onClick={() =>
                            setNewBookingSlot({
                              date: selectedDate,
                              time,
                              dentistSlug: d.slug,
                            })
                          }
                        >
                          <IconPlus size={12} />
                          <span>{isDragOver ? "ย้ายมาเวลานี้" : "ลงนัด"}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ── Slide-over Walk-in Queue Drawer ─────────────────────────── */}
        {walkinOpen && (
          <aside className="walkin-drawer">
            <div className="walkin-drawer-head">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <IconWalkIn size={18} color="var(--staff-primary)" />
                <strong>คิว Walk-in วันนี้ ({waitlist.length})</strong>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  className="btn-primary-staff"
                  style={{ padding: "4px 8px", fontSize: "11.5px" }}
                  onClick={() => setShowWaitlistModal(true)}
                >
                  <IconPlus size={12} />
                  <span>+ เพิ่ม</span>
                </button>
                <button
                  type="button"
                  className="btn-action-icon"
                  style={{ width: "26px", height: "26px" }}
                  onClick={() => setWalkinOpen(false)}
                >
                  <IconX size={14} />
                </button>
              </div>
            </div>

            <div className="walkin-drawer-body">
              {waitlist.length === 0 ? (
                <div className="walkin-empty-state">ยังไม่มีคิว Walk-in ในวันนี้</div>
              ) : (
                waitlist.map((w, idx) => (
                  <div
                    key={w.id}
                    className={`walkin-queue-card ${w.status === "in_chair" ? "in-chair" : ""}`}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="walkin-num-badge">{idx + 1}</span>
                        <strong>{w.childName}</strong>
                      </div>
                      <span className="walkin-time-text">มาถึง {w.arrivedAt} น.</span>
                    </div>

                    <div style={{ fontSize: "12px", color: "var(--staff-ink-2)" }}>
                      {dict.service[w.treatmentKey] || w.treatmentKey} · {w.guardianPhone}
                    </div>

                    {w.notes && (
                      <div style={{ fontSize: "11px", color: "var(--staff-ink-muted)", fontStyle: "italic" }}>
                        &ldquo;{w.notes}&rdquo;
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                      {w.status === "waiting" && (
                        <button
                          type="button"
                          className="btn-primary-staff"
                          style={{ flex: 1, padding: "4px 8px", fontSize: "11.5px", justifyContent: "center" }}
                          onClick={() => updateWaitlistStatus(w.id, "in_chair")}
                        >
                          <span>เรียกเข้าตรวจ</span>
                        </button>
                      )}

                      {w.status === "in_chair" && (
                        <button
                          type="button"
                          className="btn-primary-staff"
                          style={{ flex: 1, padding: "4px 8px", fontSize: "11.5px", background: "#2b8a3e", justifyContent: "center" }}
                          onClick={() => updateWaitlistStatus(w.id, "done")}
                        >
                          <IconCheck size={13} />
                          <span>ตรวจเสร็จสิ้น</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-action-icon"
                        style={{ width: "26px", height: "26px" }}
                        onClick={() => removeWaitlist(w.id)}
                        title="ลบออกจากคิว"
                      >
                        <IconX size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {selectedAppt && (
        <AppointmentDetailModal
          appointment={selectedAppt}
          onClose={() => setSelectedAppt(null)}
        />
      )}

      {newBookingSlot && (
        <BookingModal
          initialDate={newBookingSlot.date}
          initialTime={newBookingSlot.time}
          initialDentistSlug={newBookingSlot.dentistSlug}
          onClose={() => setNewBookingSlot(null)}
        />
      )}

      {showWaitlistModal && (
        <AddWaitlistModal onClose={() => setShowWaitlistModal(false)} />
      )}
    </div>
  );
}
