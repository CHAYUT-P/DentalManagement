"use client";

import React, { useState, useMemo } from "react";
import { useStaff, type EditableDentist, type StaffAppointment } from "@/lib/staffStore";
import { canTreat } from "@/lib/convert";
import { addDays } from "@/lib/dates";
import { useT } from "@/i18n/lang";
import { BookingModal } from "@/components/staff/BookingModal";
import { AppointmentDetailModal } from "@/components/staff/AppointmentDetailModal";
import {
  IconSearch,
  IconPlus,
  IconCheck,
  IconX,
  IconClock,
  IconPhone,
  IconEdit,
  IconSmartphone,
  IconWalkIn,
} from "@/components/staff/staffIcons";

type RangeFilter = "today" | "upcoming" | "past" | "all";

export default function StaffAppointmentsPage() {
  const { today, appointments, dentists, updateStatus, assignDentist, settings } = useStaff();
  const dict = useT();

  const [range, setRange] = useState<RangeFilter>("today");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [dentistFilter, setDentistFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedAppt, setSelectedAppt] = useState<StaffAppointment | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Filter appointments
  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      // Range filter
      if (range === "today" && a.date !== today) return false;
      if (range === "upcoming" && (a.date < today || a.date > addDays(today, 14))) return false;
      if (range === "past" && a.date >= today) return false;

      // Status filter
      if (statusFilter && a.status !== statusFilter) return false;

      // Source filter
      if (sourceFilter && a.source !== sourceFilter) return false;

      // Dentist filter
      if (dentistFilter && a.dentistSlug !== dentistFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const d = dentists.find((doc) => doc.slug === a.dentistSlug);
        const docName = d ? d.text.th.name.toLowerCase() : "";
        const svcName = (dict.service[a.treatmentKey] || a.treatmentKey).toLowerCase();

        const match =
          a.ref.toLowerCase().includes(q) ||
          a.childName.toLowerCase().includes(q) ||
          a.guardianName.toLowerCase().includes(q) ||
          a.phone.toLowerCase().includes(q) ||
          docName.includes(q) ||
          svcName.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [appointments, range, today, statusFilter, sourceFilter, dentistFilter, searchQuery, dentists, dict]);

  const handleQuickComplete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    updateStatus(id, "completed");
  };

  const handleQuickCancel = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`ยืนยันยกเลิกนัดหมายของ ${name}?`)) {
      updateStatus(id, "cancelled");
    }
  };

  return (
    <div className="staff-container">
      <PoolPanel
        today={today}
        appointments={appointments}
        dentists={dentists}
        chairs={settings.chairs}
        dictService={dict.service}
        onAssign={assignDentist}
      />
      {/* Page Header */}
      <div className="staff-page-header">
        <div>
          <h2>จัดการรายการนัดหมาย (Appointments Directory)</h2>
          <p>ค้นหา ตรวจสอบ และจัดการประวัติการนัดหมายทั้งหมดในระบบคลินิก</p>
        </div>

        <button
          type="button"
          className="btn-primary-staff"
          onClick={() => setShowBookingModal(true)}
        >
          <IconPlus size={16} />
          <span>+ รับนัดหมายใหม่</span>
        </button>
      </div>

      {/* Toolbar & Filters */}
      <div className="staff-toolbar">
        {/* Range Segment */}
        <div className="staff-pill-group">
          <button
            type="button"
            className={`staff-pill-btn ${range === "today" ? "active" : ""}`}
            onClick={() => setRange("today")}
          >
            นัดวันนี้ (Today)
          </button>
          <button
            type="button"
            className={`staff-pill-btn ${range === "upcoming" ? "active" : ""}`}
            onClick={() => setRange("upcoming")}
          >
            ที่กำลังจะถึง 14 วัน (Upcoming)
          </button>
          <button
            type="button"
            className={`staff-pill-btn ${range === "past" ? "active" : ""}`}
            onClick={() => setRange("past")}
          >
            ประวัติย้อนหลัง (Past)
          </button>
          <button
            type="button"
            className={`staff-pill-btn ${range === "all" ? "active" : ""}`}
            onClick={() => setRange("all")}
          >
            ทั้งหมด (All)
          </button>
        </div>

        {/* Status Dropdown */}
        <select
          className="staff-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">สถานะทั้งหมด</option>
          <option value="confirmed">ยืนยันแล้ว (Confirmed)</option>
          <option value="arrived">เช็คอินแล้ว (Arrived)</option>
          <option value="in_chair">กำลังตรวจ (In chair)</option>
          <option value="completed">เสร็จสิ้น (Completed)</option>
          <option value="cancelled">ยกเลิกแล้ว (Cancelled)</option>
          <option value="no_show">ไม่มาตามนัด (No-show)</option>
        </select>

        {/* Channel Dropdown */}
        <select
          className="staff-select"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          <option value="">ทุกช่องทาง</option>
          <option value="online">LINE LIFF ออนไลน์</option>
          <option value="phone">โทรศัพท์ (Phone)</option>
          <option value="walkin">หน้าร้าน (Walk-in)</option>
        </select>

        {/* Dentist Dropdown */}
        <select
          className="staff-select"
          value={dentistFilter}
          onChange={(e) => setDentistFilter(e.target.value)}
        >
          <option value="">แพทย์ทุกคน</option>
          {dentists.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.text.th.name}
            </option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        {/* Search box */}
        <div className="staff-search-box">
          <IconSearch size={15} color="var(--staff-ink-muted)" />
          <input
            type="search"
            placeholder="ค้นหาชื่อ, รหัสนัด, เบอร์โทร..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="staff-table-wrap">
        <table className="staff-table">
          <thead>
            <tr>
              <th style={{ width: "160px" }}>วัน & เวลา</th>
              <th style={{ width: "100px" }}>รหัสนัด</th>
              <th>คนไข้ (เด็ก)</th>
              <th>ผู้ปกครอง & เบอร์ติดต่อ</th>
              <th>ทันตแพทย์</th>
              <th>การรักษา</th>
              <th>ช่องทาง</th>
              <th>สถานะ</th>
              <th style={{ textAlign: "right", width: "120px" }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "var(--staff-ink-muted)" }}>
                  ไม่พบรายการนัดหมายตามเงื่อนไขที่เลือก
                </td>
              </tr>
            ) : (
              filtered.map((appt) => {
                const dentist = dentists.find((d) => d.slug === appt.dentistSlug);
                const svcName = dict.service[appt.treatmentKey] || appt.treatmentKey;

                return (
                  <tr
                    key={appt.id}
                    className="clickable"
                    onClick={() => setSelectedAppt(appt)}
                  >
                    <td>
                      <div style={{ fontWeight: "600", color: "var(--staff-ink)", display: "flex", alignItems: "center", gap: "5px" }}>
                        <IconClock size={13} color="var(--staff-primary)" />
                        <span>{appt.time} น.</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--staff-ink-muted)" }}>
                        {appt.date}
                      </div>
                    </td>

                    <td>
                      <strong style={{ fontSize: "12px", color: "var(--staff-primary)" }}>
                        {appt.ref}
                      </strong>
                    </td>

                    <td>
                      <div style={{ fontWeight: "600" }}>
                        {appt.childName}
                        {appt.forSelf ? (
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              color: "var(--staff-primary)",
                              background: "var(--staff-primary-light)",
                              padding: "1px 7px",
                              borderRadius: "999px",
                              marginLeft: "6px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            ตนเอง
                          </span>
                        ) : null}
                      </div>
                      {appt.childAge && (
                        <div style={{ fontSize: "11px", color: "var(--staff-ink-muted)" }}>
                          อายุ {appt.childAge} ขวบ
                        </div>
                      )}
                    </td>

                    <td>
                      <div>{appt.guardianName}</div>
                      <div style={{ fontSize: "11px", color: "var(--staff-ink-muted)", display: "flex", alignItems: "center", gap: "3px" }}>
                        <IconPhone size={11} /> {appt.phone}
                      </div>
                    </td>

                    <td>
                      {appt.dentistId === null ? (
                        <span
                          className="status-pill"
                          style={{ background: "#fff9db", color: "#8a6d00", border: "1px solid #ffd43b", fontSize: "11px" }}
                        >
                          รอจัดแพทย์
                        </span>
                      ) : (
                        <div style={{ fontWeight: "500" }}>
                          {dentist?.text.th.name || "แพทย์ทั่วไป"}
                        </div>
                      )}
                    </td>

                    <td>
                      <div>{svcName}</div>
                      {appt.price ? (
                        <div style={{ fontSize: "11px", color: "var(--staff-ink-muted)" }}>
                          ฿{appt.price.toLocaleString()}
                        </div>
                      ) : null}
                    </td>

                    <td>
                      <span className={`source-badge ${appt.source}`}>
                        {appt.source === "online" && (
                          <>
                            <IconSmartphone size={11} />
                            <span>LINE</span>
                          </>
                        )}
                        {appt.source === "phone" && (
                          <>
                            <IconPhone size={11} />
                            <span>โทรศัพท์</span>
                          </>
                        )}
                        {appt.source === "walkin" && (
                          <>
                            <IconWalkIn size={11} />
                            <span>หน้าร้าน</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td>
                      <span className={`status-pill ${appt.status}`}>
                        {appt.status === "confirmed" && "ยืนยันแล้ว"}
                        {appt.status === "arrived" && "เช็คอินแล้ว"}
                        {appt.status === "in_chair" && "กำลังตรวจ"}
                        {appt.status === "completed" && "เสร็จสิ้น"}
                        {appt.status === "cancelled" && "ยกเลิกแล้ว"}
                        {appt.status === "no_show" && "ไม่มา"}
                      </span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div className="row-actions-group" onClick={(e) => e.stopPropagation()}>
                        {appt.status === "confirmed" && (
                          <>
                            <button
                              type="button"
                              className="btn-action-icon success"
                              title="ตรวจเสร็จสิ้น (Mark Completed)"
                              onClick={(e) => handleQuickComplete(e, appt.id)}
                            >
                              <IconCheck size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-action-icon danger"
                              title="ยกเลิกนัด (Cancel)"
                              onClick={(e) => handleQuickCancel(e, appt.id, appt.childName)}
                            >
                              <IconX size={14} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="btn-action-icon"
                          title="ดูรายละเอียด / แก้ไข"
                          onClick={() => setSelectedAppt(appt)}
                        >
                          <IconEdit size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {selectedAppt && (
        <AppointmentDetailModal
          appointment={selectedAppt}
          onClose={() => setSelectedAppt(null)}
        />
      )}

      {showBookingModal && (
        <BookingModal onClose={() => setShowBookingModal(false)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pooled "any dentist" bookings: live rows with no dentist yet. Staff  */
/* hands each one to a capable dentist; the server still guards the    */
/* slot, so a specific booking that landed mid-flight keeps its chair. */
/* ------------------------------------------------------------------ */

function PoolPanel({
  today,
  appointments,
  dentists,
  chairs,
  dictService,
  onAssign,
}: {
  today: string;
  appointments: StaffAppointment[];
  dentists: EditableDentist[];
  chairs: number;
  dictService: Record<string, string>;
  onAssign: (id: string, dentistSlug: string) => void;
}) {
  const [pick, setPick] = useState<Record<string, string>>({});

  const pooled = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            (a.status === "confirmed" || a.status === "arrived") &&
            a.dentistId === null &&
            a.date >= today,
        )
        .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1)),
    [appointments, today],
  );

  if (pooled.length === 0) return null;

  const liveAt = (date: string, time: string) =>
    appointments.filter((a) => a.status !== "cancelled" && a.date === date && a.time === time)
      .length;

  return (
    <div
      style={{
        background: "#fff9db",
        border: "1.5px solid #ffd43b",
        borderRadius: "14px",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <strong style={{ fontSize: "14.5px", color: "var(--staff-ink)" }}>
          รอจัดแพทย์ ({pooled.length})
        </strong>
        <span style={{ fontSize: "12px", color: "var(--staff-ink-muted)" }}>
          จองแบบไม่เลือกแพทย์ — เลือกคุณหมอที่ว่างให้แต่ละคิว (เก้าอี้ {chairs} ตัวต่อช่วงเวลา)
        </span>
      </div>

      {pooled.map((a) => {
        const capable = dentists.filter((d) => d.isActive && canTreat(d.treats, a.treatmentKey));
        const load = liveAt(a.date, a.time);
        return (
          <div
            key={a.id}
            style={{
              background: "#ffffff",
              border: "1px solid var(--staff-border)",
              borderRadius: "10px",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: "120px" }}>
              <div style={{ fontWeight: 700, fontSize: "13.5px" }}>
                {a.date} · {a.time} น.
              </div>
              <div style={{ fontSize: "11.5px", color: load >= chairs ? "#c92a2a" : "var(--staff-ink-muted)", fontWeight: load >= chairs ? 700 : 400 }}>
                {load}/{chairs} เก้าอี้{load >= chairs ? " — เต็ม" : ""}
              </div>
            </div>
            <div style={{ flex: "1 1 160px", minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "13.5px" }}>{a.childName}</div>
              <div style={{ fontSize: "11.5px", color: "var(--staff-ink-muted)" }}>
                {dictService[a.treatmentKey] || a.treatmentKey} · {a.guardianName} · {a.phone} · {a.ref}
              </div>
            </div>
            <select
              className="staff-select"
              value={pick[a.id] ?? ""}
              onChange={(e) => setPick((p) => ({ ...p, [a.id]: e.target.value }))}
              aria-label={`เลือกแพทย์ให้ ${a.childName}`}
            >
              <option value="">— เลือกแพทย์ —</option>
              {capable.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.text.th.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-primary-staff"
              style={{ padding: "7px 16px", fontSize: "12.5px" }}
              disabled={!pick[a.id]}
              onClick={() => pick[a.id] && onAssign(a.id, pick[a.id])}
            >
              จัดแพทย์
            </button>
          </div>
        );
      })}
    </div>
  );
}
