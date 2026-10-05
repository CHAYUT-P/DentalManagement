"use client";

import React, { useState } from "react";
import {
  useStaff,
  type EditableDentist,
  type StaffAppointment,
} from "@/lib/staffStore";
import { useTreatments } from "@/lib/treatmentsContext";
import { RangeCalendar, dayCount, fmtHolidayRange } from "@/components/staff/schedule/RangeCalendar";
import { AppointmentDetailModal } from "@/components/staff/schedule/AppointmentDetailModal";
import { IconCalendar, IconCheck, IconX } from "@/components/staff/shell/staffIcons";

/**
 * วันลา — pick the days a dentist is away. Those days drop out of online
 * booking at once. Bookings already on them are listed (not cancelled), so the
 * desk can open each one and move or cancel it, and tell the family.
 */
export function DentistLeaveModal({
  dentist,
  onClose,
}: {
  dentist: EditableDentist;
  onClose: () => void;
}) {
  const {
    today,
    appointments,
    dentistLeaves,
    addDentistLeave,
    removeDentistLeave,
  } = useStaff();
  const tr = useTreatments();
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [opened, setOpened] = useState<StaffAppointment | null>(null);

  const mine = dentistLeaves.filter(
    (l) => l.dentistSlug === dentist.slug && l.end >= today,
  );
  const marked = mine.map((l) => ({
    id: l.id,
    start: l.start,
    end: l.end,
    name: l.note || "ลา",
  }));

  const pick = (iso: string) => {
    if (!selStart || selEnd) {
      setSelStart(iso);
      setSelEnd(null);
    } else if (iso === selStart) {
      setSelEnd(iso);
    } else if (iso < selStart) {
      setSelEnd(selStart);
      setSelStart(iso);
    } else {
      setSelEnd(iso);
    }
  };

  const range = selStart ? { start: selStart, end: selEnd ?? selStart } : null;

  /* bookings this dentist already has on those days — nothing is cancelled for them */
  const clashesIn = (start: string, end: string) =>
    appointments
      .filter(
        (a) =>
          a.dentistSlug === dentist.slug &&
          a.date >= start &&
          a.date <= end &&
          (a.status === "confirmed" || a.status === "arrived"),
      )
      .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  const clashes = range ? clashesIn(range.start, range.end) : [];

  const clashRow = (a: StaffAppointment) => (
    <button
      key={a.id}
      type="button"
      className="leave-clash-row"
      onClick={() => setOpened(a)}
    >
      <span>
        {a.date.split("-").reverse().slice(0, 2).join("/")} · {a.time}
      </span>
      <span className="lcr-name">{a.childName}</span>
      <span className="lcr-sub">{tr.name(a.treatmentKey)}</span>
    </button>
  );

  const save = () => {
    if (!range) return;
    addDentistLeave(dentist.slug, range.start, range.end, note);
    setSelStart(null);
    setSelEnd(null);
    setNote("");
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-card modal-card-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h3>วันลา · {dentist.text.th.name}</h3>
            <button
              type="button"
              className="btn-action-icon"
              aria-label="ปิด"
              onClick={onClose}
            >
              <IconX size={16} />
            </button>
          </div>

          <div className="modal-body leave-body">
            <div className="leave-cal">
              <RangeCalendar
                today={today}
                marked={marked}
                markedLabel="วันลาที่บันทึกแล้ว"
                markedTitle="ลา"
                selStart={selStart}
                selEnd={selEnd}
                hover={hover}
                onHover={setHover}
                onPick={pick}
              />
            </div>

            <div className="leave-side">
              <div className="leave-pick">
                {range ? (
                  <strong>
                    {fmtHolidayRange(range)}
                    {range.start !== range.end
                      ? ` (${dayCount(range.start, range.end)} วัน)`
                      : ""}
                  </strong>
                ) : (
                  <span className="leave-hint">
                    แตะวันที่ในปฏิทิน — แตะสองวันเพื่อเลือกเป็นช่วง
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="leave-note">หมายเหตุ (ไม่บังคับ)</label>
                <input
                  id="leave-note"
                  className="form-control"
                  value={note}
                  placeholder="เช่น ลาพักร้อน, ประชุมวิชาการ"
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {range && clashes.length > 0 ? (
                <div className="leave-clash">
                  <strong>มีนัดในช่วงนี้แล้ว {clashes.length} รายการ</strong>
                  <span>
                    นัดเหล่านี้จะไม่ถูกยกเลิกเอง แตะเพื่อเลื่อนหรือยกเลิก
                    และแจ้งผู้ปกครอง
                  </span>
                  {clashes.map(clashRow)}
                </div>
              ) : null}

              <button
                type="button"
                className="btn-primary-staff btn-lg"
                disabled={!range}
                onClick={save}
              >
                <IconCheck size={16} />
                <span>บันทึกวันลา</span>
              </button>

              <div className="leave-list">
                <span className="tm-label">วันลาที่จะถึง</span>
                {mine.length === 0 ? (
                  <span className="leave-hint">ยังไม่มีวันลา</span>
                ) : null}
                {mine.map((l) => {
                  const left = clashesIn(l.start, l.end);
                  return (
                    <React.Fragment key={l.id}>
                      <div className="leave-item">
                        <IconCalendar size={15} />
                        <span className="li-text">
                          {fmtHolidayRange(l)}
                          {l.note ? (
                            <span className="li-note"> · {l.note}</span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          className="btn-action-icon danger"
                          aria-label={`ลบวันลา ${fmtHolidayRange(l)}`}
                          onClick={() => removeDentistLeave(l.id)}
                        >
                          <IconX size={14} />
                        </button>
                      </div>
                      {left.length > 0 ? (
                        <div className="leave-clash">
                          <span>
                            ยังมีนัด {left.length} รายการในวันลานี้ —
                            แตะเพื่อเลื่อนหรือยกเลิก
                          </span>
                          {left.map(clashRow)}
                        </div>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* outside the overlay, so its clicks don't close this dialog too */}
      {opened ? (
        <AppointmentDetailModal
          appointment={opened}
          onClose={() => setOpened(null)}
        />
      ) : null}
    </>
  );
}
