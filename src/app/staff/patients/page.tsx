"use client";

import React, { useState } from "react";
import { useStaff, type PatientChild, type PatientRecord } from "@/lib/staffStore";
import { normalizeName } from "@/lib/clinicSettings";
import { BookingModal } from "@/components/staff/BookingModal";
import {
  PatientForm,
  ageOf,
  blankForm,
  formFromRecord,
  toPatientPayload,
  type PatientFormState,
} from "@/components/staff/PatientForm";
import { EditionNotice } from "@/components/staff/DeviceGate";
import { NoAccess, useStaffUser } from "@/lib/staffUser";
import { PatientFileButton } from "@/components/staff/PatientFileView";
import { RecallList } from "@/components/staff/RecallList";
import {
  IconSearch,
  IconPlus,
  IconPhone,
  IconCalendar,
  IconX,
  IconAlertTriangle,
  IconEdit,
} from "@/components/staff/staffIcons";

function StaffPatientsPageInner() {
  const { today, patients, createPatient, updatePatient, appointments, showToast } = useStaff();
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bookingForChild, setBookingForChild] = useState<{
    childName: string;
    childAge?: number;
    guardianName: string;
    phone: string;
    forSelf?: boolean;
  } | null>(null);
  const [tab, setTab] = useState<"all" | "child" | "self">("all");
  const [view, setView] = useState<"list" | "card">("list");
  const [mode, setMode] = useState<"records" | "recalls">("records");

  /** patient-centric rows: one row per patient (child), plus one row per
   *  adult self-booking record — each carrying its guardian info */
  const rows = patients.flatMap((family) =>
    (family.guardianRelation ?? "") === "ตนเอง" || family.children.length === 0
      ? [{ family, child: null as PatientChild | null }]
      : family.children.map((child) => ({ family, child: child as PatientChild | null })),
  );

  const filteredRows = rows.filter(({ family: p, child: c }) => {
    if (tab === "child" && c == null) return false;
    if (tab === "self" && c != null) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const childHit =
      c != null &&
      (c.name.toLowerCase().includes(q) ||
        (c.nickname && c.nickname.toLowerCase().includes(q)) ||
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.hn && c.hn.toLowerCase().includes(q)));
    return (
      childHit ||
      p.guardianName.toLowerCase().includes(q) ||
      (p.guardianFullName ?? "").toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.lineId ?? "").toLowerCase().includes(q)
    );
  });

  const childCount = rows.filter((r) => r.child != null).length;
  const selfCount = rows.filter((r) => r.child == null).length;

  /** visits for THIS patient (matched by phone + normalized name), not the
   *  whole family's bookings */
  const visitsFor = (p: PatientRecord, c: PatientChild | null) => {
    const digits = p.phone.replace(/[^0-9]/g, "");
    return appointments.filter((a) => {
      if (a.phone.replace(/[^0-9]/g, "") !== digits) return false;
      if (c == null) return true;
      return normalizeName(a.childName) === normalizeName(c.name);
    });
  };

  const rowIncomplete = (p: PatientRecord, c: PatientChild | null): boolean => {
    if (!p.guardianFullName?.trim() || !p.phone.trim()) return true;
    if (c == null) return false;
    return !c.fullName?.trim() || (!c.birthdate && c.age == null);
  };

  const bookFor = (p: PatientRecord, c: PatientChild | null, age?: number) => {
    if (c) {
      setBookingForChild({
        childName: c.name,
        childAge: age,
        guardianName: p.guardianName,
        phone: p.phone,
      });
    } else {
      setBookingForChild({
        childName: p.guardianFullName || p.guardianName,
        childAge: undefined,
        guardianName: p.guardianFullName || p.guardianName,
        phone: p.phone,
        forSelf: true,
      });
    }
  };

  const toPayload = toPatientPayload;

  const handleAdd = (s: PatientFormState) => {
    createPatient(toPayload(s));
    setShowAddModal(false);
    showToast("บันทึกประวัติคนไข้เรียบร้อยแล้ว");
  };

  const handleEdit = (s: PatientFormState) => {
    if (!editingId) return;
    updatePatient(editingId, toPayload(s));
    setEditingId(null);
    showToast("อัปเดตประวัติคนไข้เรียบร้อยแล้ว");
  };

  const editing = editingId ? patients.find((p) => p.id === editingId) ?? null : null;

  return (
    <div className="staff-container">
      <div className="staff-page-header">
        <div>
          <h2>ทะเบียนประวัติคนไข้และครอบครัว (Patient Records)</h2>
          <p>ชื่อจริง วันเกิด แพ้ยา โรคประจำตัว และประวัติการรักษา — จองออนไลน์เข้ามาแค่ชื่อกับเบอร์ ที่เหลือกรอกที่นี่</p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="staff-pill-group">
            <button type="button" className={`staff-pill-btn ${mode === "records" ? "active" : ""}`} onClick={() => setMode("records")}>
              รายชื่อคนไข้
            </button>
            <button type="button" className={`staff-pill-btn ${mode === "recalls" ? "active" : ""}`} onClick={() => setMode("recalls")}>
              ถึงรอบตรวจ
            </button>
          </div>
          <button
            type="button"
            className="btn-primary-staff"
            onClick={() => setShowAddModal(true)}
          >
            <IconPlus size={16} />
            <span>ลงทะเบียนคนไข้ใหม่</span>
          </button>
        </div>
      </div>

      {mode === "recalls" ? <RecallList /> : null}
      <div hidden={mode !== "records"}>
      {/* Search + type tabs */}
      <div className="staff-toolbar" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <div className="staff-search-box" style={{ width: "350px" }}>
          <IconSearch size={15} color="var(--staff-ink-muted)" />
          <input
            type="search"
            placeholder="ค้นหาชื่อเด็ก, ชื่อจริง, HN, ผู้ปกครอง, LINE, เบอร์โทร..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="staff-pill-group" style={{ width: "fit-content" }}>
          <button
            type="button"
            className={`staff-pill-btn ${tab === "all" ? "active" : ""}`}
            onClick={() => setTab("all")}
          >
            ทั้งหมด ({rows.length})
          </button>
          <button
            type="button"
            className={`staff-pill-btn ${tab === "child" ? "active" : ""}`}
            onClick={() => setTab("child")}
          >
            เด็ก ({childCount})
          </button>
          <button
            type="button"
            className={`staff-pill-btn ${tab === "self" ? "active" : ""}`}
            onClick={() => setTab("self")}
          >
            ผู้ใหญ่จองเอง ({selfCount})
          </button>
        </div>
        <div className="staff-pill-group" style={{ width: "fit-content", marginLeft: "auto" }}>
          <button
            type="button"
            className={`staff-pill-btn ${view === "list" ? "active" : ""}`}
            onClick={() => setView("list")}
          >
            รายการ
          </button>
          <button
            type="button"
            className={`staff-pill-btn ${view === "card" ? "active" : ""}`}
            onClick={() => setView("card")}
          >
            การ์ด
          </button>
        </div>
      </div>

      {/* Patient rows — one row per patient, guardian info attached */}
      {filteredRows.length === 0 ? (
        <div className="staff-empty">ไม่พบข้อมูลคนไข้ที่ค้นหา</div>
      ) : view === "list" ? (
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>คนไข้</th>
                <th>อายุ / HN</th>
                <th>ผู้ปกครอง / ติดต่อ</th>
                <th>มาตรวจ</th>
                <th>สถานะ</th>
                <th style={{ textAlign: "right" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(({ family: p, child: c }) => {
                const visits = visitsFor(p, c);
                const lastVisit = visits.reduce<string | null>(
                  (best, a) => (!best || a.date > best ? a.date : best),
                  null,
                );
                const incomplete = rowIncomplete(p, c);
                const age = c ? ageOf(c, today) : undefined;
                return (
                  <tr key={c ? `${p.id}:${c.id}` : `${p.id}:self`}>
                    <td>
                      <strong>{c ? c.fullName || c.name : p.guardianFullName || p.guardianName}</strong>
                      {c?.nickname ? (
                        <span style={{ color: "var(--staff-ink-muted)" }}> ({c.nickname})</span>
                      ) : null}
                      {c == null ? (
                        <span className="status-pill completed" style={{ marginLeft: "6px", fontSize: "10px" }}>
                          ผู้ใหญ่
                        </span>
                      ) : null}
                      {c && c.name !== (c.fullName || c.name) ? (
                        <div style={{ fontSize: "11px", color: "var(--staff-ink-muted)" }}>
                          เรียก: {c.name}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {c ? (
                        <>
                          <div>{age != null ? `${age} ขวบ` : "—"}</div>
                          <div style={{ fontSize: "11px", color: "var(--staff-ink-muted)" }}>
                            {c.hn ? `HN ${c.hn}` : ""}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "var(--staff-ink-muted)" }}>—</span>
                      )}
                    </td>
                    <td>
                      <div>
                        {p.guardianFullName || p.guardianName}
                        {p.guardianRelation ? (
                          <span style={{ color: "var(--staff-ink-muted)" }}> ({p.guardianRelation})</span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--staff-ink-muted)" }}>
                        {p.phone}{p.lineId ? ` · ${p.lineId}` : ""}
                      </div>
                    </td>
                    <td>
                      <div>{visits.length} ครั้ง</div>
                      <div style={{ fontSize: "11px", color: "var(--staff-ink-muted)" }}>
                        ล่าสุด {lastVisit || "—"}
                      </div>
                    </td>
                    <td>
                      {incomplete ? (
                        <span className="status-pill cancelled" style={{ fontSize: "11px" }}>
                          ไม่สมบูรณ์
                        </span>
                      ) : (
                        <span className="status-pill completed" style={{ fontSize: "11px" }}>
                          สมบูรณ์
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <PatientFileButton
                        childId={c ? Number(c.id) : undefined}
                        phone={p.phone}
                        name={c ? c.name : p.guardianFullName || p.guardianName}
                        label="เปิดแฟ้ม"
                        className="btn-secondary-staff pf-open-btn"
                      />
                      <button
                        type="button"
                        className="btn-action-icon"
                        title="นัดตรวจ"
                        onClick={() => bookFor(p, c, age)}
                      >
                        <IconCalendar size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-action-icon"
                        title="แก้ไขประวัติ"
                        onClick={() => setEditingId(p.id)}
                      >
                        <IconEdit size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="patient-grid">
          {filteredRows.map(({ family: p, child: c }) => {
            const visits = visitsFor(p, c);
            const lastVisit = visits.reduce<string | null>(
              (best, a) => (!best || a.date > best ? a.date : best),
              null,
            );
            const incomplete = rowIncomplete(p, c);
            const age = c ? ageOf(c, today) : undefined;
            const rowKey = c ? `${p.id}:${c.id}` : `${p.id}:self`;

            return (
              <div key={rowKey} className="patient-card">
                {/* Patient header */}
                <div className="patient-card-head">
                  <div>
                    <div className="patient-guardian">
                      {c ? c.fullName || c.name : p.guardianFullName || p.guardianName}
                      {c?.nickname ? (
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--staff-ink-muted)", marginLeft: "6px" }}>
                          ({c.nickname})
                        </span>
                      ) : null}
                      {c == null ? (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--staff-primary)",
                            background: "var(--staff-primary-light)",
                            padding: "2px 9px",
                            borderRadius: "999px",
                            marginLeft: "8px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ผู้ใหญ่จองเอง
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--staff-ink-muted)", marginTop: "2px" }}>
                      {c ? (
                        [c.name !== (c.fullName || c.name) ? `เรียก: ${c.name}` : "",
                          age != null ? `อายุ ${age} ขวบ` : "",
                          c.gender ? (c.gender === "male" ? "ชาย" : "หญิง") : "",
                          c.hn ? `HN ${c.hn}` : "",
                          c.bloodType ? `กรุ๊ป ${c.bloodType}` : "",
                        ].filter(Boolean).join(" · ") || "—"
                      ) : (
                        <>คนไข้ผู้ใหญ่ · โทร {p.phone}{p.lineId ? ` · LINE ${p.lineId}` : ""}</>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                    <span className="patient-since">สมาชิกตั้งแต่ {p.registeredAt}</span>
                    <button
                      type="button"
                      className="btn-secondary-staff"
                      style={{ padding: "5px 12px", fontSize: "12px" }}
                      onClick={() => setEditingId(p.id)}
                    >
                      <IconEdit size={13} />
                      <span>แก้ไขประวัติ</span>
                    </button>
                  </div>
                </div>

                {incomplete ? (
                  <div
                    style={{
                      margin: "0 16px",
                      background: "#fff9db",
                      border: "1px solid #ffd43b",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#8a6d00",
                    }}
                  >
                    ประวัตินี้ยังไม่สมบูรณ์ (ขาดชื่อจริง / วันเกิด) — กด “แก้ไขประวัติ” เพื่อกรอกให้ครบตอนมาครั้งแรก
                  </div>
                ) : null}

                {/* Guardian info */}
                <div className="patient-children">
                  <div className="patient-section-label">ผู้ปกครอง / ผู้ติดต่อ:</div>
                  <div style={{ fontSize: "13px", color: "var(--staff-ink)" }}>
                    <strong>{p.guardianFullName || p.guardianName}</strong>
                    {p.guardianRelation ? (
                      <span style={{ color: "var(--staff-ink-muted)" }}> ({p.guardianRelation})</span>
                    ) : null}
                    {p.guardianFullName && p.guardianName !== p.guardianFullName ? (
                      <span style={{ color: "var(--staff-ink-muted)" }}> · เรียก: {p.guardianName}</span>
                    ) : null}
                  </div>
                  <div className="patient-phone" style={{ marginTop: "2px" }}>
                    <IconPhone size={12} />
                    <span>{p.phone}</span>
                    {p.lineId ? <span style={{ marginLeft: "8px" }}>LINE: {p.lineId}</span> : null}
                  </div>
                  {p.address ? (
                    <div style={{ fontSize: "12px", color: "var(--staff-ink-muted)" }}>{p.address}</div>
                  ) : null}
                  {c && p.children.length > 1 ? (
                    <div style={{ fontSize: "12px", color: "var(--staff-ink-muted)", marginTop: "2px" }}>
                      พี่น้องใน پروندهนี้: {p.children.filter((x) => x.id !== c.id).map((x) => x.name).join(", ") || "—"}
                    </div>
                  ) : null}
                </div>

                {/* Medical (child rows only) */}
                {c ? (
                  <div className="patient-children" style={{ paddingTop: 0 }}>
                    {c.conditions ? (
                      <div className="patient-note">โรคประจำตัว: {c.conditions}</div>
                    ) : null}
                    {c.medications ? (
                      <div className="patient-note">ยาประจำ: {c.medications}</div>
                    ) : null}
                    {c.allergies && c.allergies !== "ไม่มี" && (
                      <div className="patient-allergy">
                        <IconAlertTriangle size={12} color="var(--staff-status-cancelled-fg)" />
                        <span>แพ้ยา: {c.allergies}</span>
                      </div>
                    )}
                    {c.notes && <div className="patient-note">{c.notes}</div>}
                    {!c.conditions && !c.medications && (!c.allergies || c.allergies === "ไม่มี") && !c.notes ? (
                      <div style={{ fontSize: "12px", color: "var(--staff-ink-muted)" }}>— ไม่มีข้อมูลการแพทย์ —</div>
                    ) : null}
                  </div>
                ) : null}

                {/* Footer: this patient's own visits + actions */}
                <div className="patient-foot">
                  <span>
                    มาตรวจ: <strong>{visits.length} ครั้ง</strong>
                  </span>
                  <span>
                    ล่าสุด: <strong>{lastVisit || "—"}</strong>
                  </span>
                  <button
                    type="button"
                    className="btn-secondary-staff patient-book-btn"
                    onClick={() =>
                      c
                        ? setBookingForChild({
                            childName: c.name,
                            childAge: age,
                            guardianName: p.guardianName,
                            phone: p.phone,
                          })
                        : setBookingForChild({
                            childName: p.guardianFullName || p.guardianName,
                            childAge: undefined,
                            guardianName: p.guardianFullName || p.guardianName,
                            phone: p.phone,
                            forSelf: true,
                          })
                    }
                  >
                    <IconCalendar size={12} />
                    <span>นัดตรวจ</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>ลงทะเบียนคนไข้และครอบครัวใหม่</h3>
              <button type="button" className="btn-action-icon" onClick={() => setShowAddModal(false)}>
                <IconX size={16} />
              </button>
            </div>

            <PatientForm
              key="new"
              initial={blankForm()}
              submitLabel="บันทึกประวัติคนไข้"
              onSubmit={handleAdd}
              onCancel={() => setShowAddModal(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditingId(null)}>
          <div className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>แก้ไขประวัติ: {editing.guardianFullName || editing.guardianName}</h3>
              <button type="button" className="btn-action-icon" onClick={() => setEditingId(null)}>
                <IconX size={16} />
              </button>
            </div>

            <PatientForm
              key={editing.id}
              initial={formFromRecord(editing)}
              submitLabel="บันทึกการแก้ไข"
              onSubmit={handleEdit}
              onCancel={() => setEditingId(null)}
            />
          </div>
        </div>
      )}

      {/* Booking Modal pre-filled with the picked patient */}
      {bookingForChild && (
        <BookingModal
          initialChildName={bookingForChild.childName}
          initialChildAge={bookingForChild.childAge}
          initialGuardianName={bookingForChild.guardianName}
          initialPhone={bookingForChild.phone}
          initialForSelf={bookingForChild.forSelf}
          onClose={() => setBookingForChild(null)}
        />
      )}
    </div>
  );
}

/**
 * Patient records are a full-edition feature — the lean "queue" install keeps
 * the route mounted (old links don't 404) but shows the upgrade note.
 */
export default function StaffPatientsPage() {
  const { edition } = useStaff();
  const allowed = useStaffUser().can("patients");
  if (edition !== "full") return <EditionNotice feature="ประวัติคนไข้" />;
  if (!allowed) return <NoAccess what="ทะเบียนคนไข้" />;
  return <StaffPatientsPageInner />;
}
