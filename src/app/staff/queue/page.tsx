"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { IconKey } from "@/data/icons";
import { useStaff, type StaffAppointment, type WaitlistEntry } from "@/lib/staffStore";
import { useT } from "@/i18n/lang";
import { fmtLong } from "@/lib/dates";
import {
  IconCheck,
  IconDentist,
  IconPhone,
  IconSmartphone,
  IconWalkIn,
  IconX,
} from "@/components/staff/staffIcons";

/**
 * วันนี้ — the front-desk queue board and the app's home. Three lanes, one tap each:
 *
 *   ยังไม่มา           รอเรียก              บนเก้าอี้
 *   today's confirmed   checked-in bookings  in the chair now
 *   bookings by slot    + walk-ins, merged   (both kinds)
 *   ── เช็คอิน ──▶      by arrival time      ── เสร็จสิ้น ──▶
 *                       ── เรียกเข้าตรวจ ──▶
 *
 * The merged middle lane is exactly what /api/queue serves the public
 * queue-check site — the board and the parents' phones agree.
 */

/** HH:MM → minutes since midnight */
const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** a wait or a lateness, readable at a glance: "12 นาที", "2 ชม. 5 นาที" */
const fmtMinutes = (m: number) => {
  if (m < 60) return `${m} นาที`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} ชม. ${rest} นาที` : `${h} ชม.`;
};

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
    assignWaitingDentist,
    assignDentist,
    showToast,
    settings,
  } = useStaff();
  const dict = useT();

  /* the wall clock, for "รอ 12 นาที" / "อีก 38 นาที" — client-only and coarse */
  const [clock, setClock] = useState<string | null>(null);
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  const nowMin = clock ? mins(clock) : null;
  const waitedFor = (at: string) => (nowMin === null ? null : Math.max(0, nowMin - mins(at)));

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

  const bookedToday = appointments.filter((a) => a.date === today && a.status !== "cancelled").length;
  const walkinsToday = waitlist.length;
  const doneToday =
    appointments.filter((a) => a.date === today && a.status === "completed").length +
    waitlist.filter((w) => w.status === "done").length;
  const chairs = settings.chairs;
  const freeChairs = Math.max(0, chairs - serving.length);

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
    <div className="staff-container today-view">
      <div className="today-head">
        <div>
          <div className="today-kicker">วันนี้</div>
          <h1>
            {fmtLong(dict, today, "th")}
            {clock ? <span className="today-clock"> · {clock}</span> : null}
          </h1>
        </div>
        <div className="today-stats">
          <span>
            <b>{bookedToday}</b> นัดวันนี้
          </span>
          <span>
            <b>{walkinsToday}</b> Walk-in
          </span>
          <span>
            <b>{doneToday}</b> เสร็จแล้ว
          </span>
          <span className="today-chairs">
            เก้าอี้ว่าง <b>{freeChairs} จาก {chairs}</b>
          </span>
        </div>
      </div>

      <div className="queue-board">
        {/* ── lane 1: expected, not checked in ─────────────────────────── */}
        <section className="queue-lane">
          <header className="queue-lane-head expected">
            <h3>ยังไม่มา</h3>
            <span className="queue-lane-count">{expected.length}</span>
          </header>
          <div className="queue-lane-body">
            {expected.length === 0 ? (
              <div className="queue-empty">ไม่มีนัดที่รอเช็คอินแล้ว</div>
            ) : (
              expected.map((a) => {
                const gap = nowMin === null ? null : mins(a.time) - nowMin;
                return (
                <div key={a.id} className="queue-card">
                  <div className="queue-card-top">
                    <span className="queue-time">{a.time}</span>
                    {gap !== null && gap > 0 && gap <= 120 ? (
                      <span className="queue-soon">อีก {fmtMinutes(gap)}</span>
                    ) : gap !== null && gap < 0 ? (
                      <span className="queue-late">เลยเวลา {fmtMinutes(-gap)}</span>
                    ) : null}
                    <span className="queue-ref">{a.ref}</span>
                  </div>
                  <strong className="queue-name">{a.childName}</strong>
                  <div className="queue-sub">
                    {dict.service[a.treatmentKey] || a.treatmentKey}
                    {a.dentistSlug ? ` · ${dentistName(a.dentistSlug)}` : " · รอจัดแพทย์"}
                  </div>
                  <div className="queue-sub muted">
                    <IconPhone size={11} /> {a.phone}
                    <LineTag name={a.lineName} />
                  </div>
                  <div className="queue-actions">
                    <button
                      type="button"
                      className="btn-secondary-staff queue-btn"
                      onClick={() => setQueueStatus(a.id, "arrived")}
                    >
                      <IconCheck size={15} />
                      <span>เช็คอิน</span>
                    </button>
                    <button
                      type="button"
                      className="btn-action-icon danger"
                      title="ไม่มาตามนัด"
                      aria-label="ไม่มาตามนัด"
                      onClick={() => noShow(a)}
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── lane 2: waiting (merged, in arrival order) ───────────────── */}
        <section className="queue-lane">
          <header className="queue-lane-head waiting">
            <h3>รอเรียก</h3>
            <span className="queue-lane-count">{waiting.length}</span>
            <span className="queue-lane-note">เรียงตามเวลามาถึง</span>
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
                  waited={waitedFor(row.at)}
                  dentistName={dentistName}
                  serviceName={(k) => dict.service[k] || k}
                  assign={
                    // walk-ins are freely (re)assignable while they wait; a
                    // pooled booking goes through assignPoolDentist — it proves
                    // the slot is actually free before the dentist owns it
                    row.kind === "walkin" || row.appt.dentistId === null ? (
                      <select
                        className="form-control"
                        style={{ padding: "4px 8px", fontSize: "12px", width: "100%" }}
                        value={
                          row.kind === "booking" ? row.appt.dentistSlug : (row.entry.dentistSlug ?? "")
                        }
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const slug = e.target.value || null;
                          if (row.kind === "walkin") assignWaitingDentist(row.entry.id, slug);
                          else if (slug) assignDentist(row.appt.id, slug);
                        }}
                      >
                        <option value="">— ยังไม่จัดหมอ —</option>
                        {dentists
                          .filter((d) => d.isActive)
                          .map((d) => (
                            <option key={d.slug} value={d.slug}>
                              {d.text.th.name}
                            </option>
                          ))}
                      </select>
                    ) : undefined
                  }
                  action={
                    <button
                      type="button"
                      className="btn-primary-staff queue-btn"
                      onClick={() => callRow(row)}
                    >
                      <IconDentist size={15} />
                      <span>{freeChairs > 0 ? "เรียกเข้าเก้าอี้" : "เรียกเข้าตรวจ (เก้าอี้เต็ม)"}</span>
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
            <h3>บนเก้าอี้</h3>
            <span className="queue-lane-count">
              {serving.length} / {chairs}
            </span>
          </header>
          <div className="queue-lane-body">
            {serving.map((row) => (
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
                      <span>เสร็จสิ้น · ว่างเก้าอี้</span>
                    </button>
                  }
                />
            ))}
            {Array.from({ length: freeChairs }, (_, i) => (
              <div key={`free-${i}`} className="queue-chair-free">
                เก้าอี้ว่าง
              </div>
            ))}
            <div className="queue-done-row">
              <IconCheck size={16} />
              <span>เสร็จแล้ววันนี้</span>
              <b>{doneToday}</b>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* one card in the waiting / serving lanes — a booking or a walk-in */
function QueueCard({
  row,
  position,
  waited,
  dentistName,
  serviceName,
  serving,
  assign,
  action,
}: {
  row: QueueRow;
  position?: number;
  /** minutes since arrival, while waiting */
  waited?: number | null;
  dentistName: (slug: string) => string;
  serviceName: (key: IconKey) => string;
  serving?: boolean;
  /** dentist picker rendered under the name while a row waits unassigned */
  assign?: React.ReactNode;
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
        {waited !== undefined && waited !== null ? <span className="queue-waited">รอ {fmtMinutes(waited)}</span> : null}
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
        {isBooking ? <LineTag name={row.appt.lineName} /> : null}
      </div>
      {assign ? <div style={{ margin: "6px 0" }}>{assign}</div> : null}
      <div className="queue-actions">{action}</div>
    </div>
  );
}

/** "booked in LINE by <display name>" — the desk's clue to who is coming */
function LineTag({ name }: { name?: string }) {
  if (!name) return null;
  return (
    <span className="line-tag" title="จองผ่าน LINE">
      LINE · {name}
    </span>
  );
}
