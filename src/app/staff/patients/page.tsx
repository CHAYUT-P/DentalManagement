"use client";

/** staff data lives in Postgres — render on request, never prerender */
export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { useStaff, type PatientChild, type PatientRecord } from "@/lib/staffStore";
import { normalizeName } from "@/lib/clinicSettings";
import { BookingModal } from "@/components/staff/BookingModal";
import {
  IconSearch,
  IconPlus,
  IconPhone,
  IconCalendar,
  IconX,
  IconAlertTriangle,
  IconEdit,
} from "@/components/staff/staffIcons";

const RELATIONS = ["แม่", "พ่อ", "ยาย", "ตา", "ย่า", "ปู่", "ลุง", "ป้า", "น้า", "อา", "ผู้ปกครองอื่น", "ตนเอง"];
const GENDERS = [
  { v: "", label: "— เลือก —" },
  { v: "male", label: "ชาย" },
  { v: "female", label: "หญิง" },
] as const;
const BLOOD_TYPES = ["", "A", "B", "O", "AB"] as const;

function newHN(): string {
  return `DK-${Math.floor(100000 + Math.random() * 900000)}`;
}

/** age in years from a YYYY-MM-DD birthdate against the clinic's today */
function ageOf(c: Pick<PatientChild, "birthdate" | "age">, today: string): number | undefined {
  if (c.birthdate) {
    const [by, bm, bd] = c.birthdate.split("-").map(Number);
    const [ty, tm, td] = today.split("-").map(Number);
    if (!by || !bm || !bd) return c.age;
    let a = ty - by;
    if (tm < bm || (tm === bm && td < bd)) a -= 1;
    return a >= 0 ? a : undefined;
  }
  return c.age;
}

/* ------------------------------------------------------------------ */
/* Shared add/edit form — staff records the REAL file here. Online     */
/* bookings only ever create a skeleton (names + phone); this form     */
/* completes it on the first visit.                                    */
/* ------------------------------------------------------------------ */

interface ChildForm {
  key: string;
  id?: string;
  name: string;
  fullName: string;
  nickname: string;
  birthdate: string;
  age: string;
  gender: "" | "male" | "female";
  hn: string;
  bloodType: "" | "A" | "B" | "O" | "AB";
  conditions: string;
  medications: string;
  allergies: string;
  notes: string;
}

interface PatientFormState {
  guardianName: string;
  guardianFullName: string;
  guardianRelation: string;
  phone: string;
  lineId: string;
  address: string;
  children: ChildForm[];
}

function blankChild(): ChildForm {
  return {
    key: `n-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    name: "",
    fullName: "",
    nickname: "",
    birthdate: "",
    age: "",
    gender: "",
    hn: newHN(),
    bloodType: "",
    conditions: "",
    medications: "",
    allergies: "",
    notes: "",
  };
}

function blankForm(): PatientFormState {
  return {
    guardianName: "",
    guardianFullName: "",
    guardianRelation: "แม่",
    phone: "",
    lineId: "",
    address: "",
    children: [blankChild()],
  };
}

function formFromRecord(p: PatientRecord): PatientFormState {
  return {
    guardianName: p.guardianName,
    guardianFullName: p.guardianFullName ?? "",
    guardianRelation: p.guardianRelation ?? "แม่",
    phone: p.phone,
    lineId: p.lineId ?? "",
    address: p.address ?? "",
    children: p.children.map((c) => ({
      key: c.id,
      id: c.id,
      name: c.name,
      fullName: c.fullName ?? "",
      nickname: c.nickname ?? "",
      birthdate: c.birthdate ?? "",
      age: c.age != null ? String(c.age) : "",
      gender: c.gender ?? "",
      hn: c.hn ?? newHN(),
      bloodType: c.bloodType ?? "",
      conditions: c.conditions ?? "",
      medications: c.medications ?? "",
      allergies: c.allergies ?? "",
      notes: c.notes ?? "",
    })),
  };
}

function PatientForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: PatientFormState;
  submitLabel: string;
  onSubmit: (s: PatientFormState) => void;
  onCancel: () => void;
}) {
  const [s, setS] = useState<PatientFormState>(initial);
  const [err, setErr] = useState<string | null>(null);

  const set = (patch: Partial<PatientFormState>) => {
    setS((prev) => ({ ...prev, ...patch }));
    setErr(null);
  };
  const setChild = (key: string, patch: Partial<ChildForm>) =>
    setS((prev) => ({
      ...prev,
      children: prev.children.map((c) => (c.key === key ? { ...c, ...patch } : c)),
    }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!s.guardianFullName.trim() || !s.phone.trim()) {
      setErr("กรุณากรอกชื่อ-นามสกุลจริงของผู้ปกครอง และเบอร์โทรศัพท์");
      return;
    }
    // guardian info is mandatory for minors (consent / contact / billing) —
    // adult self-bookings ("ตนเอง") need no child rows at all
    if (s.guardianRelation !== "ตนเอง") {
      if (s.children.length === 0) {
        setErr("กรุณาเพิ่มข้อมูลเด็กอย่างน้อย 1 คน");
        return;
      }
      for (const c of s.children) {
        if (!c.name.trim() || !c.fullName.trim()) {
          setErr("เด็กทุกคนต้องมีชื่อเรียก และชื่อ-นามสกุลจริง");
          return;
        }
      }
    }
    onSubmit(s);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        {/* Guardian */}
        <div style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--staff-ink)", marginBottom: "2px" }}>
          ข้อมูลผู้ปกครอง
        </div>
        <div className="form-row-2">
          <div className="form-group">
            <label>ชื่อ-นามสกุลจริง *</label>
            <input
              type="text"
              className="form-control"
              placeholder="เช่น นางสาววรรณษา รักษ์ฟัน"
              value={s.guardianFullName}
              onChange={(e) => set({ guardianFullName: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>ชื่อเรียก / ชื่อเล่น</label>
            <input
              type="text"
              className="form-control"
              placeholder="เช่น คุณแม่วรรณษา (Mon)"
              value={s.guardianName}
              onChange={(e) => set({ guardianName: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row-2">
          <div className="form-group">
            <label>ความสัมพันธ์กับเด็ก</label>
            <select
              className="form-control"
              value={s.guardianRelation}
              onChange={(e) => set({ guardianRelation: e.target.value })}
            >
              {RELATIONS.map((r) => (
                <option key={r} value={r}>{r === "ตนเอง" ? "ตนเอง (จองให้ตัวเอง — ไม่ต้องมีเด็ก)" : r}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>เบอร์โทรศัพท์ติดต่อ *</label>
            <input
              type="tel"
              className="form-control"
              placeholder="08X-XXX-XXXX"
              value={s.phone}
              onChange={(e) => set({ phone: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="form-row-2">
          <div className="form-group">
            <label>LINE ID</label>
            <input
              type="text"
              className="form-control"
              placeholder="เช่น @mon_mom"
              value={s.lineId}
              onChange={(e) => set({ lineId: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>ที่อยู่</label>
            <input
              type="text"
              className="form-control"
              placeholder="บ้านเลขที่ / ซอย / แขวง…"
              value={s.address}
              onChange={(e) => set({ address: e.target.value })}
            />
          </div>
        </div>

        {/* Children */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
          <div style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--staff-ink)" }}>
            ข้อมูลเด็ก ({s.children.length} คน)
            {s.guardianRelation === "ตนเอง" ? (
              <span style={{ fontWeight: 500, fontSize: "12px", color: "var(--staff-ink-muted)" }}> — ไม่บังคับ (คนไข้ผู้ใหญ่)</span>
            ) : null}
          </div>
          <button
            type="button"
            className="btn-secondary-staff"
            style={{ padding: "5px 12px", fontSize: "12px" }}
            onClick={() => setS((prev) => ({ ...prev, children: [...prev.children, blankChild()] }))}
          >
            <IconPlus size={13} />
            <span>เพิ่มเด็ก</span>
          </button>
        </div>

        {s.children.map((c, i) => (
          <div
            key={c.key}
            style={{
              border: "1px solid var(--staff-border)",
              borderRadius: "10px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              background: "var(--staff-surface-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <strong style={{ fontSize: "13px" }}>เด็กคนที่ {i + 1}</strong>
              {s.children.length > 1 || s.guardianRelation === "ตนเอง" ? (
                <button
                  type="button"
                  className="btn-action-icon danger"
                  style={{ width: "26px", height: "26px" }}
                  title="ลบเด็กคนนี้ออก"
                  onClick={() =>
                    setS((prev) => ({ ...prev, children: prev.children.filter((x) => x.key !== c.key) }))
                  }
                >
                  <IconX size={13} />
                </button>
              ) : null}
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>ชื่อ-นามสกุลจริง *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น ด.ช. เจได รักษ์ฟัน"
                  value={c.fullName}
                  onChange={(e) => setChild(c.key, { fullName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>ชื่อเรียก *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น น้องเจได"
                  value={c.name}
                  onChange={(e) => setChild(c.key, { name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>ชื่อเล่น</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น เจได"
                  value={c.nickname}
                  onChange={(e) => setChild(c.key, { nickname: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>วันเกิด</label>
                <input
                  type="date"
                  className="form-control"
                  value={c.birthdate}
                  onChange={(e) => setChild(c.key, { birthdate: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>อายุ (ปี)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="—"
                  value={c.age}
                  onChange={(e) => setChild(c.key, { age: e.target.value })}
                  min={0}
                  max={18}
                  disabled={!!c.birthdate}
                  title={c.birthdate ? "คำนวณจากวันเกิดอัตโนมัติ" : "กรอกเมื่อไม่ทราบวันเกิด"}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>เพศ</label>
                <select
                  className="form-control"
                  value={c.gender}
                  onChange={(e) => setChild(c.key, { gender: e.target.value as ChildForm["gender"] })}
                >
                  {GENDERS.map((g) => (
                    <option key={g.v} value={g.v}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>HN</label>
                <input
                  type="text"
                  className="form-control"
                  value={c.hn}
                  onChange={(e) => setChild(c.key, { hn: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>กรุ๊ปเลือด</label>
                <select
                  className="form-control"
                  value={c.bloodType}
                  onChange={(e) => setChild(c.key, { bloodType: e.target.value as ChildForm["bloodType"] })}
                >
                  {BLOOD_TYPES.map((b) => (
                    <option key={b} value={b}>{b || "—"}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>โรคประจำตัว</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น หอบหืด หรือ ไม่มี"
                  value={c.conditions}
                  onChange={(e) => setChild(c.key, { conditions: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>ยาที่กินประจำ</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น ยาพ่น Ventolin หรือ ไม่มี"
                  value={c.medications}
                  onChange={(e) => setChild(c.key, { medications: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>ประวัติแพ้ยา / อาหาร</label>
              <input
                type="text"
                className="form-control"
                placeholder="เช่น แพ้ยา Amoxicillin หรือ ไม่มี"
                value={c.allergies}
                onChange={(e) => setChild(c.key, { allergies: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>บันทึกพฤติกรรมหรือข้อควรระวัง</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="เช่น กลัวเข็ม, ชอบให้เปิดการ์ตูนระหว่างทำฟัน"
                value={c.notes}
                onChange={(e) => setChild(c.key, { notes: e.target.value })}
              />
            </div>
          </div>
        ))}

        {err ? (
          <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#c92a2a" }}>{err}</div>
        ) : null}
      </div>

      <div className="modal-footer">
        <button type="button" className="btn-secondary-staff" onClick={onCancel}>
          ยกเลิก
        </button>
        <button type="submit" className="btn-primary-staff">
          <IconPlus size={15} />
          <span>{submitLabel}</span>
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */

export default function StaffPatientsPage() {
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

  const toPayload = (s: PatientFormState) => ({
    guardianName: s.guardianName.trim() || s.guardianFullName.trim(),
    guardianFullName: s.guardianFullName.trim() || undefined,
    guardianRelation: s.guardianRelation || undefined,
    phone: s.phone.trim(),
    lineId: s.lineId.trim() || undefined,
    address: s.address.trim() || undefined,
    children: s.children.map((c) => ({
      id: c.id ?? `c-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      name: c.name.trim(),
      fullName: c.fullName.trim() || undefined,
      nickname: c.nickname.trim() || undefined,
      birthdate: c.birthdate || undefined,
      age: !c.birthdate && c.age !== "" ? parseInt(c.age, 10) : undefined,
      gender: (c.gender || undefined) as PatientChild["gender"],
      hn: c.hn.trim() || undefined,
      bloodType: (c.bloodType || undefined) as PatientChild["bloodType"],
      conditions: c.conditions.trim() || undefined,
      medications: c.medications.trim() || undefined,
      allergies: c.allergies.trim() || undefined,
      notes: c.notes.trim() || undefined,
    })),
  });

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

        <button
          type="button"
          className="btn-primary-staff"
          onClick={() => setShowAddModal(true)}
        >
          <IconPlus size={16} />
          <span>+ ลงทะเบียนคนไข้ใหม่</span>
        </button>
      </div>

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
