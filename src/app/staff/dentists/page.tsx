"use client";

import React, { useState } from "react";
import { useStaff, type EditableDentist } from "@/lib/staffStore";
import { useT } from "@/i18n/lang";
import { EditDentistModal } from "@/components/staff/EditDentistModal";
import { IconEdit, IconDentist, IconClock, IconPlus } from "@/components/staff/staffIcons";

const WEEKDAY_NAMES_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export default function StaffDentistsPage() {
  const { dentists } = useStaff();
  const dict = useT();
  const [editingDentist, setEditingDentist] = useState<EditableDentist | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="staff-container">
      <div className="staff-page-header">
        <div>
          <h2>จัดการทีมทันตแพทย์และเวรตรวจ (Dentist Roster)</h2>
          <p>กำหนดข้อมูลแพทย์ ความเชี่ยวชาญ และตารางเวลาลงตรวจประจำสัปดาห์ (ข้อมูลจะแสดงบนหน้าเว็บคนไข้)</p>
        </div>
        <button type="button" className="btn-primary-staff" onClick={() => setAdding(true)}>
          <IconPlus size={16} />
          <span>เพิ่มทันตแพทย์</span>
        </button>
      </div>

      <div className="dentist-card-grid">
        {dentists.map((d) => (
          <div key={d.slug} className="dentist-roster-card">
            <div className="dentist-card-top">
              <div
                className="dentist-avatar-big"
                style={{
                  background: d.isActive ? "var(--staff-primary-light)" : "#eee",
                  color: d.isActive ? "var(--staff-primary)" : "#999",
                }}
              >
                <IconDentist size={26} />
              </div>

              <div className="dentist-card-details">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div className="dentist-card-name">{d.text.th.name}</div>
                  <span
                    className={`status-pill ${d.isActive ? "completed" : "cancelled"}`}
                    style={{ fontSize: "10.5px" }}
                  >
                    {d.isActive ? "เปิดรับนัด" : "พักงาน"}
                  </span>
                </div>
                <div className="dentist-card-title">{d.text.th.title}</div>
                <div style={{ fontSize: "11px", color: "var(--staff-ink-muted)", marginTop: "2px" }}>
                  {d.text.en.name} · ประสบการณ์ {d.years} ปี
                </div>
              </div>
            </div>

            <div style={{ fontSize: "12.5px", color: "var(--staff-ink-2)", lineHeight: "1.5" }}>
              &ldquo;{d.text.th.blurb}&rdquo;
            </div>

            {/* Treatment scope — what the patient booking roster offers */}
            <div style={{ fontSize: "12px", color: "var(--staff-ink-muted)", lineHeight: "1.6" }}>
              <strong style={{ color: "var(--staff-ink-2)" }}>รับตรวจ:</strong>{" "}
              {d.treats.length > 0
                ? d.treats.map((k) => dict.service[k] || k).join(" · ")
                : "—"}
              <span style={{ color: "var(--staff-ink-muted)" }}> (+ตรวจทั่วไปทุกท่าน)</span>
            </div>

            {/* Working days chips */}
            <div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--staff-ink-muted)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                <IconClock size={12} />
                <span>วันลงตรวจประจำสัปดาห์:</span>
              </div>
              <div className="shift-tag-list">
                {d.shifts?.map((s) => (
                  <span
                    key={s.weekday}
                    className={`shift-tag ${s.enabled ? "" : "off"}`}
                    title={s.enabled ? `${s.start} - ${s.end} น.` : "หยุด"}
                  >
                    {WEEKDAY_NAMES_SHORT[s.weekday]} {s.enabled ? `(${s.start.slice(0, 2)}-${s.end.slice(0, 2)})` : ""}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--staff-border)", paddingTop: "12px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-secondary-staff"
                onClick={() => setEditingDentist(d)}
              >
                <IconEdit size={14} />
                <span>แก้ไขข้อมูล & ตารางตรวจ</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingDentist && (
        <EditDentistModal
          dentist={editingDentist}
          onClose={() => setEditingDentist(null)}
        />
      )}
      {adding && <EditDentistModal dentist={null} onClose={() => setAdding(false)} />}
    </div>
  );
}
