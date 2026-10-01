"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTreatments } from "@/lib/treatmentsContext";
import { useStaff, type StaffAppointment, type WaitlistEntry } from "@/lib/staffStore";
import { useT } from "@/i18n/lang";
import { fmtLong } from "@/lib/dates";
import { AppointmentDetailModal } from "@/components/staff/AppointmentDetailModal";
import { IconCheck, IconPhone, IconWalkIn } from "@/components/staff/staffIcons";

/**
 * วันนี้ — today's queue as one list in time order. The desk only manages who
 * has arrived, so each row has a single tick: tap when the family walks in,
 * tap again to undo a mistake. Walk-ins join the list at the time they came,
 * already ticked. Tapping a name opens the booking (postpone, cancel, no-show
 * live there).
 *
 * What the parents' queue-check page shows (/api/queue) is still the
 * checked-in line, so ticking here is what moves a family onto it.
 */

/** HH:MM → minutes since midnight */
const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** a lateness, readable at a glance: "12 นาที", "2 ชม. 5 นาที" */
const fmtMinutes = (m: number) => {
  if (m < 60) return `${m} นาที`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} ชม. ${rest} นาที` : `${h} ชม.`;
};

type Row =
  | { kind: "booking"; at: string; appt: StaffAppointment }
  | { kind: "walkin"; at: string; entry: WaitlistEntry };

/** statuses that mean the family is (or was) here today */
const HERE: StaffAppointment["status"][] = ["arrived", "in_chair", "completed"];

export default function StaffTodayPage() {
  const { today, appointments, waitlist, dentists, setQueueStatus, showToast } = useStaff();
  const dict = useT();
  const tr = useTreatments();
  const [opened, setOpened] = useState<StaffAppointment | null>(null);

  /* the wall clock, for "เลยเวลา 15 นาที" — client-only and coarse */
  const [clock, setClock] = useState<string | null>(null);
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  const nowMin = clock ? mins(clock) : null;

  const dentistName = (slug: string | null | undefined) =>
    slug ? (dentists.find((d) => d.slug === slug)?.text.th.name ?? "") : "";

  /* one list: today's bookings by their time, walk-ins by when they came */
  const rows = useMemo<Row[]>(
    () =>
      [
        ...appointments
          .filter((a) => a.date === today && a.status !== "cancelled")
          .map((appt): Row => ({ kind: "booking", at: appt.time, appt })),
        ...waitlist.map((entry): Row => ({ kind: "walkin", at: entry.arrivedAt, entry })),
      ].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)),
    [appointments, waitlist, today],
  );

  const booked = rows.filter((r) => r.kind === "booking");
  const arrived = booked.filter((r) => r.kind === "booking" && HERE.includes(r.appt.status)).length;
  const notYet = booked.filter((r) => r.kind === "booking" && r.appt.status === "confirmed").length;
  const walkins = rows.length - booked.length;

  const toggle = (a: StaffAppointment) => {
    if (a.status === "confirmed") {
      setQueueStatus(a.id, "arrived");
    } else if (a.status === "arrived") {
      setQueueStatus(a.id, "confirmed");
      showToast(`ยกเลิกเช็คอินของ ${a.childName} แล้ว`);
    }
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
            <b>{booked.length}</b> นัดวันนี้
          </span>
          <span>
            <b>{arrived}</b> มาแล้ว
          </span>
          <span>
            <b>{notYet}</b> ยังไม่มา
          </span>
          <span>
            <b>{walkins}</b> Walk-in
          </span>
        </div>
      </div>

      <div className="today-list" role="list" aria-label="คิววันนี้">
        {rows.length === 0 ? <div className="today-empty">วันนี้ยังไม่มีนัด</div> : null}

        {rows.map((r) => {
          if (r.kind === "walkin") {
            const w = r.entry;
            return (
              <div key={`w-${w.id}`} className="today-row here" role="listitem">
                <span className="tr-time">{w.arrivedAt}</span>
                <div className="tr-main">
                  <span className="tr-name">{w.childName}</span>
                  <span className="tr-sub">
                    {tr.name(w.treatmentKey)}
                    {w.dentistSlug ? ` · ${dentistName(w.dentistSlug)}` : ""}
                  </span>
                  <span className="tr-meta">
                    <IconWalkIn size={12} /> Walk-in
                    {w.guardianPhone ? (
                      <>
                        {" · "}
                        <IconPhone size={11} /> {w.guardianPhone}
                      </>
                    ) : null}
                  </span>
                </div>
                <span className="tr-tick done" aria-label={`มาแล้ว ${w.arrivedAt} น.`}>
                  <IconCheck size={20} />
                  <span>มาแล้ว {w.arrivedAt}</span>
                </span>
              </div>
            );
          }

          const a = r.appt;
          const here = HERE.includes(a.status);
          const noShow = a.status === "no_show";
          const late = !here && !noShow && nowMin !== null ? nowMin - mins(a.time) : 0;
          return (
            <div
              key={a.id}
              className={`today-row ${here ? "here" : ""} ${noShow ? "noshow" : ""}`}
              role="listitem"
            >
              <span className="tr-time">{a.time}</span>
              <button type="button" className="tr-main" onClick={() => setOpened(a)} title="ดูรายละเอียดนัด">
                <span className="tr-name">
                  {a.childName}
                  {late > 0 ? <span className="tr-late">เลยเวลา {fmtMinutes(late)}</span> : null}
                </span>
                <span className="tr-sub">
                  {tr.name(a.treatmentKey)}
                  {a.dentistSlug ? ` · ${dentistName(a.dentistSlug)}` : " · รอจัดแพทย์"}
                </span>
                <span className="tr-meta">
                  <IconPhone size={11} /> {a.phone}
                  {a.lineName ? <span className="line-tag">LINE · {a.lineName}</span> : null}
                  <span className="tr-ref">{a.ref}</span>
                </span>
              </button>
              {noShow ? (
                <span className="tr-tick off">ไม่มา</span>
              ) : (
                <button
                  type="button"
                  className={`tr-tick ${here ? "done" : ""}`}
                  aria-pressed={here}
                  disabled={here && a.status !== "arrived"}
                  onClick={() => toggle(a)}
                  title={here ? "แตะอีกครั้งเพื่อยกเลิกเช็คอิน" : "เช็คอินเมื่อมาถึง"}
                >
                  <IconCheck size={20} />
                  <span>{here ? `มาแล้ว${a.checkedInAt ? ` ${a.checkedInAt}` : ""}` : "เช็คอิน"}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {opened && <AppointmentDetailModal appointment={opened} onClose={() => setOpened(null)} />}
    </div>
  );
}
