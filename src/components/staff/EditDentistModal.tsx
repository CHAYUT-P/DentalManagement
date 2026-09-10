"use client";

import React, { useState } from "react";
import { useStaff, type EditableDentist, type ShiftHour } from "@/lib/staffStore";
import { IconX, IconCheck } from "./staffIcons";

interface EditDentistModalProps {
  dentist: EditableDentist;
  onClose: () => void;
}

const WEEKDAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

export function EditDentistModal({ dentist, onClose }: EditDentistModalProps) {
  const { updateDentist } = useStaff();

  const [thName, setThName] = useState(dentist.text.th.name);
  const [enName, setEnName] = useState(dentist.text.en.name);
  const [thTitle, setThTitle] = useState(dentist.text.th.title);
  const [enTitle, setEnTitle] = useState(dentist.text.en.title);
  const [thBlurb, setThBlurb] = useState(dentist.text.th.blurb);
  const [isActive, setIsActive] = useState(dentist.isActive);
  const [shifts, setShifts] = useState<ShiftHour[]>(dentist.shifts);

  const toggleDay = (w: number) => {
    setShifts((prev) =>
      prev.map((s) => (s.weekday === w ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const updateShiftTimes = (w: number, field: "start" | "end", val: string) => {
    setShifts((prev) =>
      prev.map((s) => (s.weekday === w ? { ...s, [field]: val } : s))
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // build working days text
    const activeDaysTh = shifts
      .filter((s) => s.enabled)
      .map((s) => WEEKDAY_NAMES[s.weekday])
      .join(", ");

    updateDentist(dentist.slug, {
      isActive,
      shifts,
      text: {
        ...dentist.text,
        th: {
          ...dentist.text.th,
          name: thName,
          title: thTitle,
          blurb: thBlurb,
          days: activeDaysTh || "ตามนัดหมาย",
        },
        en: {
          ...dentist.text.en,
          name: enName,
          title: enTitle,
        },
      },
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>แก้ไขข้อมูลและตารางตรวจทันตแพทย์</h3>
          <button type="button" className="btn-action-icon" onClick={onClose}>
            <IconX size={16} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Status toggle */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--staff-surface-subtle)", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--staff-border)" }}>
              <div>
                <strong style={{ fontSize: "14px" }}>สถานะการรับนัด (Active Status)</strong>
                <div style={{ fontSize: "12px", color: "var(--staff-ink-muted)" }}>
                  เปิดให้ผู้ปกครองจองนัดหมายออนไลน์และลงตารางตรวจ
                </div>
              </div>
              <button
                type="button"
                className={`staff-pill-btn ${isActive ? "active" : ""}`}
                style={{ background: isActive ? "#ebfbee" : "#fff5f5", color: isActive ? "#2b8a3e" : "#e03131", border: `1px solid ${isActive ? "#b2f2bb" : "#ffc9c9"}` }}
                onClick={() => setIsActive(!isActive)}
              >
                {isActive ? (
                  <>
                    <IconCheck size={12} />
                    <span>เปิดรับนัด (Active)</span>
                  </>
                ) : (
                  <>
                    <IconX size={12} />
                    <span>พักงาน / ลา (Inactive)</span>
                  </>
                )}
              </button>
            </div>

            {/* Names */}
            <div className="form-row-2">
              <div className="form-group">
                <label>ชื่อ-นามสกุล (ภาษาไทย) *</label>
                <input
                  type="text"
                  className="form-control"
                  value={thName}
                  onChange={(e) => setThName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Name (English) *</label>
                <input
                  type="text"
                  className="form-control"
                  value={enName}
                  onChange={(e) => setEnName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Titles */}
            <div className="form-row-2">
              <div className="form-group">
                <label>ความเชี่ยวชาญ (ไทย)</label>
                <input
                  type="text"
                  className="form-control"
                  value={thTitle}
                  onChange={(e) => setThTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Specialty (English)</label>
                <input
                  type="text"
                  className="form-control"
                  value={enTitle}
                  onChange={(e) => setEnTitle(e.target.value)}
                />
              </div>
            </div>

            {/* Blurb */}
            <div className="form-group">
              <label>คำแนะนำสั้นๆ (แสดงบนหน้ารายชื่อแพทย์)</label>
              <input
                type="text"
                className="form-control"
                value={thBlurb}
                onChange={(e) => setThBlurb(e.target.value)}
              />
            </div>

            {/* Weekly Shift Hours */}
            <div className="form-group">
              <label style={{ marginBottom: "8px" }}>ตารางเวลาลงตรวจประจำสัปดาห์ (Weekly Shifts)</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {shifts.map((s) => (
                  <div
                    key={s.weekday}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: s.enabled ? "#ffffff" : "var(--staff-surface-subtle)",
                      border: "1px solid var(--staff-border)",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", width: "130px", fontWeight: "600", fontSize: "13px" }}>
                      <input
                        type="checkbox"
                        checked={s.enabled}
                        onChange={() => toggleDay(s.weekday)}
                      />
                      <span>{WEEKDAY_NAMES[s.weekday]}</span>
                    </label>

                    {s.enabled ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px" }}>
                        <input
                          type="time"
                          className="form-control"
                          style={{ padding: "4px 8px" }}
                          value={s.start}
                          onChange={(e) => updateShiftTimes(s.weekday, "start", e.target.value)}
                        />
                        <span>ถึง</span>
                        <input
                          type="time"
                          className="form-control"
                          style={{ padding: "4px 8px" }}
                          value={s.end}
                          onChange={(e) => updateShiftTimes(s.weekday, "end", e.target.value)}
                        />
                      </div>
                    ) : (
                      <span style={{ fontSize: "12px", color: "var(--staff-ink-muted)" }}>วันหยุด</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary-staff" onClick={onClose}>
              ยกเลิก
            </button>
            <button type="submit" className="btn-primary-staff">
              <IconCheck size={16} />
              <span>บันทึกการแก้ไข</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
