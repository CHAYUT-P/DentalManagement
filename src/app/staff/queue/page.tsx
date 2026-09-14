"use client";

import React, { useMemo, useState } from "react";
import type { IconKey } from "@/data/icons";
import { useStaff, type StaffAppointment, type WaitlistEntry } from "@/lib/staffStore";
import { useT } from "@/i18n/lang";
import { AddWaitlistModal } from "@/components/staff/AddWaitlistModal";
import {
  IconCheck,
  IconClock,
  IconDentist,
  IconPhone,
  IconPlus,
  IconSmartphone,
  IconWalkIn,
  IconX,
} from "@/components/staff/staffIcons";

/**
 * คิววันนี้ — the front-desk queue board. Three lanes, one tap each:
 *
 *   รอเช็คอิน          รอเรียก              กำลังตรวจ
 *   today's confirmed   checked-in bookings  in the chair now
 *   bookings by slot    + walk-ins, merged   (both kinds)
 *   ── เช็คอิน ──▶      by arrival time      ── เสร็จสิ้น ──▶
 *                       ── เรียกเข้าตรวจ ──▶
 *
 * The merged middle lane is exactly what /api/queue serves the public
 * queue-check site — the board and the parents' phones agree.
 */

type QueueRow =
  | { kind: "booking"; appt: StaffAppointment; at: string }
  | { kind: "walkin"; entry: WaitlistEntry; at: string };

export default function StaffQueuePage() {
  const {
    today,
    appointments,
    waitlist,
    dentists,
    setQueueStatus,
    updateWaitlistStatus,
    showToast,
  } = useStaff();
  const dict = useT();
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);

  const dentistName = (slug: string) =>
    dentists.find((d) => d.slug === slug)?.text.th.name ?? "";

  /** not yet here — today's confirmed bookings, earliest slot first */
  const expected = useMemo(
    () =>
      appointments
        .filter((a) => a.date === today && a.status === "confirmed")
        .sort((a, b) => (a.time < b.time ? -1 : 1)),
    [appointments, today],
  );

  /** in line — checked-in bookings + waiting walk-ins, by arrival time */
  const waiting = useMemo<QueueRow[]>(() => {
    const rows: QueueRow[] = [
      ...appointments
        .filter((a) => a.date === today && a.status === "arrived")
        .map((appt): QueueRow => ({ kind: "booking", appt, at: appt.checkedInAt ?? appt.time })),
      ...waitlist
        .filter((w) => w.status === "waiting")
        .map((entry): QueueRow => ({ kind: "walkin", entry, at: entry.arrivedAt })),
    ];
    return rows.sort((a, b) => (a.at < b.at ? -1 : 1));
  }, [appointments, waitlist, today]);

  /** in the chair — both kinds */
  const serving = useMemo<QueueRow[]>(() => {
    const rows: QueueRow[] = [
      ...appointments
        .filter((a) => a.date === today && a.status === "in_chair")
        .map((appt): QueueRow => ({ kind: "booking", appt, at: appt.checkedInAt ?? appt.time })),
      ...waitlist
        .filter((w) => w.status === "in_chair")
        .map((entry): QueueRow => ({ kind: "walkin", entry, at: entry.arrivedAt })),
    ];
    return rows.sort((a, b) => (a.at < b.at ? -1 : 1));
  }, [appointments, waitlist, today]);

  const noShow = (a: StaffAppointment) => {
    if (window.confirm(`${a.childName} ไม่มาตามนัด (${a.time} น.) — บันทึกเป็นไม่มา?`)) {
      setQueueStatus(a.id, "no_show");
    }
  };

  const callRow = (row: QueueRow) => {
    if (row.kind === "booking") setQueueStatus(row.appt.id, "in_chair");
    else updateWaitlistStatus(row.entry.id, "in_chair");
  };

  const doneRow = (row: QueueRow) => {
    if (row.kind === "booking") setQueueStatus(row.appt.id, "completed");
    else updateWaitlistStatus(row.entry.id, "done");
    showToast("เสร็จสิ้น — คิวถัดไปพร้อมแล้ว");
  };

  return (
    <div className="staff-container">
      <div className="staff-page-header">
        <div>
          <h2>คิววันนี้ (Today&rsquo;s Queue)</h2>
          <p>
            เช็คอิน → เรียกเข้าตรวจ → เสร็จสิ้น — บอร์ดนี้ตรงกับหน้าเช็คคิวบนมือถือของผู้ปกครอง
          </p>
        </div>
        <button
          type="button"
          className="btn-primary-staff"
          onClick={() => setShowWaitlistModal(true)}
        >
          <IconPlus size={16} />
          <span>+ เพิ่ม Walk-in</span>
        </button>
      </div>

      <div className="queue-board">
        {/* ── lane 1: expected, not checked in ─────────────────────────── */}
        <section className="queue-lane">
          <header className="queue-lane-head">
            <h3>รอเช็คอิน</h3>
            <span className="queue-lane-count">{expected.length}</span>
          </header>
          <div className="queue-lane-body">
            {expected.length === 0 ? (
              <div className="queue-empty">ไม่มีนัดที่รอเช็คอินแล้ว</div>
            ) : (
              expected.map((a) => (
                <div key={a.id} className="queue-card">
                  <div className="queue-card-top">
                    <span className="queue-slot">
                      <IconClock size={13} /> {a.time} น.
                    </span>
                    <span className="queue-ref">{a.ref}</span>
                  </div>
                  <strong className="queue-name">{a.childName}</strong>
                  <div className="queue-sub">
                    {dict.service[a.treatmentKey] || a.treatmentKey}
                    {a.dentistSlug ? ` · ${dentistName(a.dentistSlug)}` : " · รอจัดแพทย์"}
                  </div>
                  <div className="queue-sub muted">
                    <IconPhone size={11} /> {a.phone} · {a.guardianName}
                  </div>
                  <div className="queue-actions">
                    <button
                      type="button"
                      className="btn-primary-staff queue-btn"
                      onClick={() => setQueueStatus(a.id, "arrived")}
                    >
                      <IconCheck size={15} />
                      <span>เช็คอิน</span>
                    </button>
                    <button
                      type="button"
                      className="btn-action-icon danger"
                      title="ไม่มาตามนัด"
                      onClick={() => noShow(a)}
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── lane 2: waiting (merged, in arrival order) ───────────────── */}
        <section className="queue-lane">
          <header className="queue-lane-head">
            <h3>รอเรียก</h3>
            <span className="queue-lane-count">{waiting.length}</span>
          </header>
          <div className="queue-lane-body">
            {waiting.length === 0 ? (
              <div className="queue-empty">ยังไม่มีใครรอคิว</div>
            ) : (
              waiting.map((row, i) => (
                <QueueCard
                  key={row.kind === "booking" ? row.appt.id : `w-${row.entry.id}`}
                  row={row}
                  position={i + 1}
                  dentistName={dentistName}
                  serviceName={(k) => dict.service[k] || k}
                  action={
                    <button
                      type="button"
                      className="btn-primary-staff queue-btn"
                      onClick={() => callRow(row)}
                    >
                      <IconDentist size={15} />
                      <span>เรียกเข้าตรวจ</span>
                    </button>
                  }
                />
              ))
            )}
          </div>
        </section>

        {/* ── lane 3: in the chair ─────────────────────────────────────── */}
        <section className="queue-lane">
          <header className="queue-lane-head serving">
            <h3>กำลังตรวจ</h3>
            <span className="queue-lane-count">{serving.length}</span>
          </header>
          <div className="queue-lane-body">
            {serving.length === 0 ? (
              <div className="queue-empty">เก้าอี้ว่าง — เรียกคิวถัดไปได้เลย</div>
            ) : (
              serving.map((row) => (
                <QueueCard
                  key={row.kind === "booking" ? row.appt.id : `w-${row.entry.id}`}
                  row={row}
                  dentistName={dentistName}
                  serviceName={(k) => dict.service[k] || k}
                  serving
                  action={
                    <button
                      type="button"
                      className="btn-primary-staff queue-btn done"
                      onClick={() => doneRow(row)}
                    >
                      <IconCheck size={15} />
                      <span>เสร็จสิ้น</span>
                    </button>
                  }
                />
              ))
            )}
          </div>
        </section>
      </div>

      {showWaitlistModal && <AddWaitlistModal onClose={() => setShowWaitlistModal(false)} />}
    </div>
  );
}

/* one card in the waiting / serving lanes — a booking or a walk-in */
function QueueCard({
  row,
  position,
  dentistName,
  serviceName,
  serving,
  action,
}: {
  row: QueueRow;
  position?: number;
  dentistName: (slug: string) => string;
  serviceName: (key: IconKey) => string;
  serving?: boolean;
  action: React.ReactNode;
}) {
  const isBooking = row.kind === "booking";
  const name = isBooking ? row.appt.childName : row.entry.childName;
  const treatKey = isBooking ? row.appt.treatmentKey : row.entry.treatmentKey;
  const docSlug = isBooking ? row.appt.dentistSlug : row.entry.dentistSlug;
  const ref = isBooking ? row.appt.ref : "Walk-in";

  return (
    <div className={`queue-card ${serving ? "serving" : ""}`}>
      <div className="queue-card-top">
        {position !== undefined ? (
          <span className="queue-pos">คิว {position}</span>
        ) : (
          <span className="queue-pos serving">กำลังตรวจ</span>
        )}
        <span className="queue-ref">
          {isBooking ? <IconSmartphone size={11} /> : <IconWalkIn size={11} />} {ref}
        </span>
      </div>
      <strong className="queue-name">{name}</strong>
      <div className="queue-sub">
        {serviceName(treatKey)}
        {docSlug ? ` · ${dentistName(docSlug)}` : ""}
      </div>
      <div className="queue-sub muted">
        {isBooking
          ? `นัด ${row.appt.time} น.${row.appt.checkedInAt ? ` · เช็คอิน ${row.appt.checkedInAt} น.` : ""}`
          : `มาถึง ${row.at} น.`}
      </div>
      <div className="queue-actions">{action}</div>
    </div>
  );
}
