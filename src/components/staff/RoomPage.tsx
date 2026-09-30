"use client";

import React, { useMemo, useState } from "react";
import type { IconKey } from "@/data/icons";
import { normalizeName } from "@/lib/clinicSettings";
import {
  useStaff,
  type PatientChild,
  type StaffAppointment,
  type VisitRecord,
  type WaitlistEntry,
} from "@/lib/staffStore";
import { useT } from "@/i18n/lang";
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronLeft,
  IconDentist,
  IconPhone,
  IconSmartphone,
  IconWalkIn,
} from "./staffIcons";

/**
 * หน้าห้องตรวจ — one dentist's screen (full edition). The room PC sits on
 * this page all day: it shows who's in the chair with the treatment-record
 * form, who's waiting for THIS dentist, and what's already done.
 *
 * It's deliberately reachable without a login wall beyond the staff app
 * itself — the PCs live inside the clinic. `onPickRoom` is how the caller
 * navigates (web router / react-router / the device gate just swaps state).
 */

type VisitRow =
  | { kind: "booking"; appt: StaffAppointment }
  | { kind: "walkin"; entry: WaitlistEntry };

function rowKey(row: VisitRow): string {
  return row.kind === "booking" ? `a-${row.appt.id}` : `w-${row.entry.id}`;
}

function digits(s: string): string {
  return s.replace(/\D/g, "");
}

export function RoomPage({
  slug,
  onPickRoom,
}: {
  /** null renders the room picker (which dentist's room is this PC) */
  slug: string | null;
  onPickRoom?: (slug: string | null) => void;
}) {
  const {
    today,
    dentists,
    appointments,
    waitlist,
    visitRecords,
    patients,
    servicePrices,
    saveVisitRecord,
    finishVisit,
    setQueueStatus,
    updateWaitlistStatus,
    showToast,
  } = useStaff();
  const dict = useT();

  const dentist = slug ? dentists.find((d) => d.slug === slug) : undefined;

  /** this dentist's day, split by lane */
  const lanes = useMemo(() => {
    const inChair: VisitRow[] = [];
    const waiting: { row: VisitRow; at: string }[] = [];
    const done: VisitRow[] = [];
    if (slug) {
      for (const a of appointments) {
        if (a.date !== today || a.dentistSlug !== slug) continue;
        if (a.status === "in_chair") inChair.push({ kind: "booking", appt: a });
        else if (a.status === "arrived")
          waiting.push({ row: { kind: "booking", appt: a }, at: a.checkedInAt ?? a.time });
        else if (a.status === "completed") done.push({ kind: "booking", appt: a });
      }
      for (const w of waitlist) {
        if (w.dentistSlug !== slug) continue;
        if (w.status === "in_chair") inChair.push({ kind: "walkin", entry: w });
        else if (w.status === "waiting")
          waiting.push({ row: { kind: "walkin", entry: w }, at: w.arrivedAt });
        else if (w.status === "done") done.push({ kind: "walkin", entry: w });
      }
      waiting.sort((a, b) => (a.at < b.at ? -1 : 1));
    }
    return { inChair, waiting: waiting.map((w) => w.row), done };
  }, [slug, appointments, waitlist, today]);

  /** the patient-chart child row behind this visit, if the record exists */
  const childOf = (row: VisitRow): PatientChild | undefined => {
    if (row.kind === "booking" && row.appt.childId) {
      for (const p of patients) {
        const hit = p.children.find((c) => c.id === row.appt.childId);
        if (hit) return hit;
      }
    }
    const phone = row.kind === "booking" ? row.appt.phone : row.entry.guardianPhone;
    const name = row.kind === "booking" ? row.appt.childName : row.entry.childName;
    const family = patients.find((p) => digits(p.phone) === digits(phone));
    return family?.children.find((c) => normalizeName(c.name) === normalizeName(name));
  };

  const recordOf = (row: VisitRow): VisitRecord | undefined =>
    visitRecords.find((v) =>
      row.kind === "booking" ? v.appointmentId === row.appt.id : v.waitlistId === row.entry.id,
    );

  /* ── room picker ─────────────────────────────────────────────────────── */
  if (!slug) {
    return (
      <div className="staff-container">
        <div className="staff-page-header">
          <div>
            <h2>ห้องตรวจ (Treatment Rooms)</h2>
            <p>เลือกหมอประจำห้อง — เครื่องนี้จะแสดงคิวและบันทึกการรักษาของหมอท่านนั้น</p>
          </div>
        </div>
        <div className="patient-grid">
          {dentists
            .filter((d) => d.isActive)
            .map((d) => {
              const busy = appointments.some(
                (a) => a.date === today && a.dentistSlug === d.slug && a.status === "in_chair",
              ) || waitlist.some((w) => w.dentistSlug === d.slug && w.status === "in_chair");
              const waitingN =
                appointments.filter(
                  (a) => a.date === today && a.dentistSlug === d.slug && a.status === "arrived",
                ).length +
                waitlist.filter((w) => w.dentistSlug === d.slug && w.status === "waiting").length;
              return (
                <button
                  key={d.slug}
                  type="button"
                  className="patient-card"
                  style={{ cursor: "pointer", textAlign: "left", border: "1px solid var(--staff-border)" }}
                  onClick={() => onPickRoom?.(d.slug)}
                >
                  <div className="patient-card-head">
                    <div>
                      <div className="patient-guardian">{d.text.th.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--staff-ink-muted)", marginTop: "2px" }}>
                        {d.text.th.title}
                      </div>
                    </div>
                    <span className={`status-pill ${busy ? "in_chair" : "confirmed"}`}>
                      {busy ? "กำลังตรวจ" : "ว่าง"}
                    </span>
                  </div>
                  <div style={{ padding: "0 16px 14px", fontSize: "12.5px", color: "var(--staff-ink-2)" }}>
                    รอเรียก {waitingN} คิว
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    );
  }

  if (!dentist) {
    return (
      <div className="staff-container">
        <div className="staff-empty">ไม่พบหมอท่านนี้ — เลือกห้องใหม่</div>
        {onPickRoom ? (
          <button type="button" className="btn-secondary-staff" onClick={() => onPickRoom(null)}>
            เลือกห้อง
          </button>
        ) : null}
      </div>
    );
  }

  const callIn = (row: VisitRow) => {
    if (row.kind === "booking") setQueueStatus(row.appt.id, "in_chair");
    else updateWaitlistStatus(row.entry.id, "in_chair");
    showToast("เรียกเข้าตรวจแล้ว");
  };

  return (
    <div className="staff-container">
      <div className="staff-page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {onPickRoom ? (
            <button
              type="button"
              className="btn-action-icon"
              title="เลือกห้องอื่น"
              onClick={() => onPickRoom(null)}
            >
              <IconChevronLeft size={16} />
            </button>
          ) : null}
          <div>
            <h2>{dentist.text.th.name}</h2>
            <p>
              {dentist.text.th.title} · ห้องตรวจวันนี้ {today}
            </p>
          </div>
        </div>
        <span className="status-pill in_chair" style={{ alignSelf: "center" }}>
          <IconDentist size={13} /> โหมดห้องตรวจ
        </span>
      </div>

      {/* ── in the chair now: the active visit + its record form ────────── */}
      {lanes.inChair.length === 0 ? (
        <div className="queue-empty" style={{ marginBottom: "16px" }}>
          เก้าอี้ว่าง — เรียกคิวถัดไปจากรายการรอด้านล่าง
        </div>
      ) : (
        lanes.inChair.map((row) => (
          <VisitEditor
            key={rowKey(row)}
            row={row}
            record={recordOf(row)}
            child={childOf(row)}
            dentistSlug={slug}
            serviceName={(k) => dict.service[k] || k}
            defaultPrice={(k) => servicePrices[k]}
            onSave={(rec) => {
              saveVisitRecord(rec);
              showToast("บันทึกการรักษาแล้ว");
            }}
            onFinish={(rec) => {
              finishVisit(rec);
              showToast("เสร็จสิ้น — เก้าอี้ว่างแล้ว");
            }}
          />
        ))
      )}

      {/* ── this dentist's waiting line ─────────────────────────────────── */}
      <section className="queue-lane" style={{ marginBottom: "16px" }}>
        <header className="queue-lane-head">
          <h3>รอเรียก — คิวของหมอท่านนี้</h3>
          <span className="queue-lane-count">{lanes.waiting.length}</span>
        </header>
        <div className="queue-lane-body">
          {lanes.waiting.length === 0 ? (
            <div className="queue-empty">ไม่มีคิวรอของหมอท่านนี้</div>
          ) : (
            lanes.waiting.map((row, i) => {
              const isBooking = row.kind === "booking";
              const name = isBooking ? row.appt.childName : row.entry.childName;
              const treatKey = isBooking ? row.appt.treatmentKey : row.entry.treatmentKey;
              return (
                <div key={rowKey(row)} className="queue-card">
                  <div className="queue-card-top">
                    <span className="queue-pos">คิว {i + 1}</span>
                    <span className="queue-ref">
                      {isBooking ? <IconSmartphone size={11} /> : <IconWalkIn size={11} />}{" "}
                      {isBooking ? row.appt.ref : "Walk-in"}
                    </span>
                  </div>
                  <strong className="queue-name">{name}</strong>
                  <div className="queue-sub">{dict.service[treatKey] || treatKey}</div>
                  <div className="queue-sub muted">
                    {isBooking
                      ? `นัด ${row.appt.time} น.${row.appt.checkedInAt ? ` · เช็คอิน ${row.appt.checkedInAt} น.` : ""}`
                      : `มาถึง ${row.entry.arrivedAt} น.`}
                  </div>
                  <div className="queue-actions">
                    <button
                      type="button"
                      className="btn-primary-staff queue-btn"
                      onClick={() => callIn(row)}
                    >
                      <IconDentist size={15} />
                      <span>เรียกเข้าตรวจ</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── done today ──────────────────────────────────────────────────── */}
      <section className="queue-lane">
        <header className="queue-lane-head serving">
          <h3>เสร็จแล้ววันนี้</h3>
          <span className="queue-lane-count">{lanes.done.length}</span>
        </header>
        <div className="queue-lane-body">
          {lanes.done.length === 0 ? (
            <div className="queue-empty">ยังไม่มีเคสที่เสร็จ</div>
          ) : (
            lanes.done.map((row) => {
              const rec = recordOf(row);
              const name = row.kind === "booking" ? row.appt.childName : row.entry.childName;
              return (
                <div key={rowKey(row)} className="queue-card">
                  <strong className="queue-name">{name}</strong>
                  {rec ? (
                    <>
                      <div className="queue-sub">
                        {rec.treatments.map((k) => dict.service[k] || k).join(", ") || "—"}
                      </div>
                      {rec.detail ? (
                        <div className="queue-sub muted" style={{ whiteSpace: "pre-wrap" }}>
                          {rec.detail}
                        </div>
                      ) : null}
                      {rec.price != null ? (
                        <div className="queue-sub muted">ค่ารักษา {rec.price.toLocaleString()} บาท</div>
                      ) : null}
                    </>
                  ) : (
                    <div className="queue-sub muted">— ไม่มีบันทึกการรักษา —</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

/* ── the treatment record for the visit in the chair ────────────────────── */

function VisitEditor({
  row,
  record,
  child,
  dentistSlug,
  serviceName,
  defaultPrice,
  onSave,
  onFinish,
}: {
  row: VisitRow;
  record: VisitRecord | undefined;
  child: PatientChild | undefined;
  dentistSlug: string;
  serviceName: (k: IconKey) => string;
  defaultPrice: (k: IconKey) => number | null | undefined;
  onSave: (rec: Omit<VisitRecord, "id" | "updatedAt">) => void;
  onFinish: (rec: Omit<VisitRecord, "id" | "updatedAt">) => void;
}) {
  const bookedKey: IconKey = row.kind === "booking" ? row.appt.treatmentKey : row.entry.treatmentKey;
  const name = row.kind === "booking" ? row.appt.childName : row.entry.childName;
  const phone = row.kind === "booking" ? row.appt.phone : row.entry.guardianPhone;

  const [treatments, setTreatments] = useState<IconKey[]>(
    record?.treatments?.length ? record.treatments : [bookedKey],
  );
  const [detail, setDetail] = useState(record?.detail ?? "");
  const [price, setPrice] = useState(
    record?.price != null ? String(record.price) : (defaultPrice(bookedKey)?.toString() ?? ""),
  );

  const payload = (): Omit<VisitRecord, "id" | "updatedAt"> => ({
    appointmentId: row.kind === "booking" ? row.appt.id : undefined,
    waitlistId: row.kind === "walkin" ? row.entry.id : undefined,
    dentistSlug,
    treatments,
    detail: detail.trim(),
    price: price.trim() && Number.isFinite(Number(price)) ? Number(price) : undefined,
  });

  const toggle = (k: IconKey) =>
    setTreatments((ts) => (ts.includes(k) ? ts.filter((x) => x !== k) : [...ts, k]));

  const medical = child
    ? [
        child.conditions ? `โรคประจำตัว: ${child.conditions}` : "",
        child.medications ? `ยาประจำ: ${child.medications}` : "",
        child.notes ? `ข้อควรระวัง: ${child.notes}` : "",
      ].filter(Boolean)
    : [];

  return (
    <div
      className="queue-card serving"
      style={{ padding: "18px", marginBottom: "16px", display: "block" }}
    >
      <div className="queue-card-top">
        <span className="queue-pos serving">กำลังตรวจ</span>
        <span className="queue-ref">
          {row.kind === "booking" ? <IconSmartphone size={11} /> : <IconWalkIn size={11} />}{" "}
          {row.kind === "booking" ? row.appt.ref : "Walk-in"}
        </span>
      </div>

      <strong className="queue-name" style={{ fontSize: "17px" }}>
        {name}
      </strong>
      <div className="queue-sub muted">
        <IconPhone size={11} /> {phone}
        {child?.hn ? ` · HN ${child.hn}` : ""}
        {child?.birthdate ? ` · เกิด ${child.birthdate}` : ""}
      </div>

      {/* chart warnings — allergies shout, the rest just list */}
      {child?.allergies && child.allergies !== "ไม่มี" ? (
        <div className="patient-allergy" style={{ margin: "10px 0 0" }}>
          <IconAlertTriangle size={13} color="var(--staff-status-cancelled-fg)" />
          <span>แพ้ยา/อาหาร: {child.allergies}</span>
        </div>
      ) : null}
      {medical.length > 0 ? (
        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {medical.map((m) => (
            <div key={m} className="patient-note" style={{ margin: 0 }}>
              {m}
            </div>
          ))}
        </div>
      ) : null}

      {/* what was actually done — default-checked to the booked treatment */}
      <div style={{ marginTop: "14px" }}>
        <label style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--staff-ink-2)" }}>
          หัตถการที่ทำจริง
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
          {(["checkup", "consult", "followup", "xray", "scaling", "fluoride", "sealant", "filling", "pulpotomy", "extraction", "brushing"] as IconKey[]).map(
            (k) => (
              <button
                key={k}
                type="button"
                className={`staff-pill-btn ${treatments.includes(k) ? "active" : ""}`}
                style={{ padding: "5px 12px", fontSize: "12px" }}
                onClick={() => toggle(k)}
              >
                {serviceName(k)}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="form-group" style={{ marginTop: "12px" }}>
        <label>รายละเอียดการรักษา</label>
        <textarea
          className="form-control"
          rows={3}
          placeholder="เช่น อุดฟันสามหลุม ฟันน้ำนมซี่ 64 65 74 — เด็กร่วมมือดี"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="form-group" style={{ margin: 0, width: "160px" }}>
          <label>ค่ารักษา (บาท)</label>
          <input
            type="number"
            className="form-control"
            min={0}
            placeholder="—"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
          <button
            type="button"
            className="btn-secondary-staff"
            onClick={() => onSave(payload())}
          >
            <span>บันทึก</span>
          </button>
          <button
            type="button"
            className="btn-primary-staff"
            onClick={() => onFinish(payload())}
          >
            <IconCheck size={15} />
            <span>เสร็จสิ้น & บันทึก</span>
          </button>
        </div>
      </div>
    </div>
  );
}
