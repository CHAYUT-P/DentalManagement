"use client";

import React, { useCallback, useEffect, useState } from "react";

import { staffRecalls, staffRemindRecall, staffSetRecall } from "@/server/actions";
import type { RecallRow, RecallStatus } from "@/lib/clinical";
import { addDays, fmtLong } from "@/lib/dates";
import { useStaff } from "@/lib/staffStore";
import { useT } from "@/i18n/lang";
import { PatientFileButton } from "@/components/staff/patients/PatientFileView";

const STATUS_LABEL: Record<RecallStatus, string> = {
  due: "ยังไม่ติดต่อ",
  contacted: "ติดต่อแล้ว",
  booked: "นัดแล้ว",
  done: "มาตรวจแล้ว",
  skipped: "ข้าม",
};

/**
 * ถึงรอบตรวจ (full edition) — patients whose check-up is due within the next
 * month or already overdue. One tap sends the LINE reminder; otherwise note
 * the call and mark what happened.
 */
export function RecallList() {
  const { today, showToast } = useStaff();
  const dict = useT();
  const [rows, setRows] = useState<RecallRow[] | null>(null);
  const [ahead, setAhead] = useState(30);

  const load = useCallback(async () => {
    setRows(await staffRecalls({ until: addDays(today, ahead), open: true }));
  }, [today, ahead]);

  useEffect(() => {
    let live = true;
    staffRecalls({ until: addDays(today, ahead), open: true })
      .then((r) => live && setRows(r))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [today, ahead]);

  const mark = async (r: RecallRow, status: RecallStatus) => {
    await staffSetRecall(r.id, { status });
    await load();
  };

  const remind = async (r: RecallRow) => {
    const text =
      `คลินิก Denta Kids ขอแจ้งว่า ${r.patientName} ถึงรอบตรวจสุขภาพฟันแล้วค่ะ` +
      `\nกดจองคิวได้ที่เมนูจองนัดใน LINE นี้ หรือโทรหาคลินิกได้เลยค่ะ ขอบคุณค่ะ`;
    const res = await staffRemindRecall(r.id, text);
    showToast(
      res === "sent"
        ? `ส่ง LINE ถึงผู้ปกครองของ ${r.patientName} แล้ว`
        : res === "no_line"
          ? "ครอบครัวนี้ไม่ได้เชื่อม LINE — โทรแจ้งแทน"
          : res === "not_configured"
            ? "ยังไม่ได้ตั้งค่า LINE OA บนเซิร์ฟเวอร์"
            : "ส่ง LINE ไม่สำเร็จ",
    );
    await load();
  };

  return (
    <div className="recalls">
      <div className="recalls-top">
        <p>คนไข้ที่ถึงรอบตรวจ (ตั้งรอบได้ในข้อมูลคนไข้ — ค่าเริ่มต้นทุก 6 เดือน)</p>
        <div className="staff-pill-group">
          {[
            [0, "เลยกำหนด/วันนี้"],
            [30, "ภายใน 30 วัน"],
            [90, "ภายใน 3 เดือน"],
          ].map(([d, label]) => (
            <button key={d} type="button" className={`staff-pill-btn ${ahead === d ? "active" : ""}`} onClick={() => setAhead(Number(d))}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {rows === null ? <p className="cl-empty">กำลังโหลด…</p> : null}
      {rows?.length === 0 ? <p className="cl-empty">ไม่มีคนไข้ถึงรอบในช่วงนี้</p> : null}
      <div className="ledger-table">
        {rows?.map((r) => {
          const overdue = r.dueDate < today;
          return (
            <div key={r.id} className="recall-row">
              <span className="rr-who">
                <strong>{r.patientName}</strong>
                <span className="muted">
                  {r.guardianName} · {r.phone}
                </span>
              </span>
              <span className={`rr-due ${overdue ? "late" : ""}`}>
                ครบรอบ {fmtLong(dict, r.dueDate, "th")}
                {overdue ? " · เลยกำหนด" : ""}
              </span>
              <span className={`cl-tag ${r.status === "contacted" ? "open" : "here"}`}>{STATUS_LABEL[r.status]}</span>
              <span className="rr-actions">
                {r.hasLine ? (
                  <button type="button" className="btn-primary-staff" onClick={() => void remind(r)}>
                    ส่ง LINE เตือน
                  </button>
                ) : (
                  <a className="btn-secondary-staff" href={`tel:${r.phone.replace(/\D/g, "")}`}>
                    โทร
                  </a>
                )}
                <button type="button" className="btn-secondary-staff" onClick={() => void mark(r, "contacted")}>
                  ติดต่อแล้ว
                </button>
                <button type="button" className="btn-secondary-staff" onClick={() => void mark(r, "booked")}>
                  นัดแล้ว
                </button>
                <button type="button" className="btn-secondary-staff" onClick={() => void mark(r, "skipped")}>
                  ข้าม
                </button>
                <PatientFileButton childId={r.childId} label="แฟ้ม" />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
