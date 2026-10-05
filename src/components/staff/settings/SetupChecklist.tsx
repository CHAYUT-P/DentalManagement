"use client";

import React, { useEffect, useState } from "react";

import { staffBillingSettings } from "@/server/actions";
import type { BillingSettings, DfRule } from "@/lib/billing";
import { useStaff } from "@/lib/staffStore";
import { useStaffUser } from "@/lib/staffUser";
import { IconCheck } from "@/components/staff/shell/staffIcons";

interface Step {
  key: string;
  title: string;
  why: string;
  done: boolean;
  optional?: boolean;
  /** the settings section that does it */
  go: string;
}

/**
 * เริ่มต้นใช้งาน (full edition) — the few things to set once before the
 * clinic runs on the app, each with a button straight to where it's done.
 */
export function SetupChecklist({ onGo }: { onGo: (section: string) => void }) {
  const { dentists, treatments, patients } = useStaff();
  const { accounts } = useStaffUser();
  const [billing, setBilling] = useState<{ settings: BillingSettings; dfRules: DfRule[] } | null>(null);

  useEffect(() => {
    let live = true;
    staffBillingSettings()
      .then((r) => live && setBilling(r))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const s = billing?.settings;
  const steps: Step[] = [
    {
      key: "dentists",
      title: "ทันตแพทย์และวันออกตรวจ",
      why: "ใครตรวจวันไหน — ใช้กับการจองออนไลน์และห้องตรวจ",
      done: dentists.some((d) => d.isActive),
      go: "dentists",
    },
    {
      key: "services",
      title: "บริการและราคา",
      why: "ราคาที่บิลดึงไปใช้อัตโนมัติ",
      done: treatments.filter((t) => t.price != null).length >= 3,
      go: "services",
    },
    {
      key: "receipt",
      title: "หัวใบเสร็จ (ที่อยู่ เบอร์โทร)",
      why: "พิมพ์บนใบเสร็จ ใบรับรองแพทย์ และใบเสนอราคา",
      done: !!(s?.address && s?.phone),
      go: "billing",
    },
    {
      key: "promptpay",
      title: "เบอร์พร้อมเพย์",
      why: "หน้าการเงินจะแสดง QR พร้อมยอดให้ผู้ปกครองสแกนจ่าย",
      done: !!s?.promptpayId,
      go: "billing",
    },
    {
      key: "df",
      title: "ค่าแพทย์ (DF)",
      why: "คิด DF ให้อัตโนมัติทุกบิล และสรุปตอนปิดยอด",
      done: (billing?.dfRules.length ?? 0) > 0,
      go: "billing",
    },
    {
      key: "users",
      title: "บัญชีผู้ใช้ของทีม",
      why: "แต่ละคนมี PIN ของตัวเอง เห็นเฉพาะเมนูที่ใช้ และลงเวลาทำงานได้",
      done: accounts,
      go: "users",
    },
    {
      key: "aftercare",
      title: "ข้อความ LINE หลังรับบริการ",
      why: "ส่งคำแนะนำหลังการรักษาและขอรีวิวให้อัตโนมัติ",
      done: !!(s?.sendAftercare || s?.sendThanks),
      optional: true,
      go: "billing",
    },
    {
      key: "import",
      title: "นำรายชื่อคนไข้จากโปรแกรมเดิม",
      why: "ไม่ต้องพิมพ์ใหม่ — นำเข้าไฟล์ CSV ได้ทีละส่วน",
      done: patients.length > 20,
      optional: true,
      go: "data",
    },
  ];
  const required = steps.filter((x) => !x.optional);
  const doneCount = required.filter((x) => x.done).length;

  return (
    <div className="staff-container billing-settings">
      <div className="staff-page-header">
        <div>
          <h2>เริ่มต้นใช้งาน</h2>
          <p>ตั้งครั้งเดียว แล้วใช้งานได้ทุกวัน — แตะ “ไปตั้งค่า” ที่ขั้นตอนไหนก็ได้</p>
        </div>
      </div>
      <div className="setup-progress" aria-label={`ตั้งค่าแล้ว ${doneCount} จาก ${required.length}`}>
        <div style={{ width: `${(doneCount / required.length) * 100}%` }} />
      </div>
      <p className="settings-help">
        เสร็จแล้ว {doneCount} จาก {required.length} ขั้นตอนหลัก{doneCount === required.length ? " — พร้อมใช้งานแล้ว 🎉" : ""}
      </p>
      <ol className="setup-steps">
        {steps.map((st) => (
          <li key={st.key} className={st.done ? "done" : ""}>
            <span className="ss-mark" aria-hidden="true">
              {st.done ? <IconCheck size={16} /> : null}
            </span>
            <span className="ss-text">
              <strong>
                {st.title}
                {st.optional ? <em> · ไม่บังคับ</em> : null}
              </strong>
              <span>{st.why}</span>
            </span>
            <button type="button" className={st.done ? "btn-secondary-staff" : "btn-primary-staff"} onClick={() => onGo(st.go)}>
              {st.done ? "ดู / แก้" : "ไปตั้งค่า"}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
