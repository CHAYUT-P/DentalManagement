"use client";

import React from "react";

import { baht, lineNet, type BillingSettings } from "@/lib/billing";
import { bahtText } from "@/lib/bahtText";
import type { ClinicalDocRow, PatientFileData, PlanRow, RxLine } from "@/lib/clinical";
import { fmtLong } from "@/lib/dates";
import { useT } from "@/i18n/lang";

export type ClinicalPrintTarget =
  | { kind: "estimate"; plan: PlanRow }
  | { kind: "doc"; doc: Pick<ClinicalDocRow, "kind" | "date" | "dentistSlug" | "data"> };

const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

/**
 * The printed paperwork of the patient file — estimate (ใบเสนอราคา),
 * prescription, medical certificate, referral letter and consent form. Same
 * print-only sheet as the receipt, so only this reaches the paper.
 */
export function ClinicalPrint({
  target,
  patient,
  settings,
  dentistName,
}: {
  target: ClinicalPrintTarget;
  patient: PatientFileData;
  settings: BillingSettings;
  dentistName: (slug: string | null) => string;
}) {
  const dict = useT();
  const day = (iso: string) => fmtLong(dict, iso, "th");
  const today = new Date().toISOString().slice(0, 10);

  const who = (
    <div className="ps-meta">
      <span>ชื่อ {patient.fullName || patient.name}</span>
      {patient.hn ? <span>HN {patient.hn}</span> : null}
      {patient.age != null ? <span>อายุ {patient.age} ปี</span> : null}
      {patient.idCard ? <span>เลขบัตร {patient.idCard}</span> : null}
    </div>
  );
  const sign = (slug: string | null, role = "ทันตแพทย์ผู้ตรวจ") => (
    <div className="ps-signature">
      <span>ลงชื่อ ............................................</span>
      <span>({slug ? dentistName(slug) : "..........................................."})</span>
      <span>{role}</span>
    </div>
  );

  let body: React.ReactNode;
  if (target.kind === "estimate") {
    const p = target.plan;
    const lines = p.items.filter((i) => i.status !== "cancelled");
    const total = p.kind === "contract" && p.agreedTotal != null ? p.agreedTotal : lines.reduce((sum, i) => sum + lineNet(i), 0);
    body = (
      <>
        <h2 className="ps-title">{p.kind === "contract" ? "ใบเสนอราคา / สัญญาการรักษา" : "ใบเสนอราคาค่ารักษา"}</h2>
        {who}
        <p className="ps-sub">เรื่อง {p.title} · วันที่ {day(p.createdAt.slice(0, 10))}</p>
        <table className="ps-table">
          <thead>
            <tr>
              <th>รายการ</th>
              <th>ซี่ฟัน</th>
              <th className="num">จำนวน</th>
              <th className="num">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((i, idx) => (
              <tr key={i.id ?? idx}>
                <td>{i.name}</td>
                <td>{i.teeth}</td>
                <td className="num">{i.qty}</td>
                <td className="num">{lineNet(i).toLocaleString("th-TH")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ps-totals">
          <strong>{p.kind === "contract" ? "ราคาตกลงทั้งหมด" : "รวมประมาณการ"}</strong>
          <strong className="num">{baht(total)}</strong>
        </div>
        <p className="ps-words">({bahtText(total)})</p>
        {p.note ? <p className="ps-sub">หมายเหตุ: {p.note}</p> : null}
        <p className="ps-sub">ราคานี้เป็นราคาประมาณการ อาจเปลี่ยนแปลงตามการรักษาจริง · ใช้ได้ 30 วัน</p>
        <div className="ps-two-sign">
          {sign(p.dentistSlug)}
          <div className="ps-signature">
            <span>ลงชื่อ ............................................</span>
            <span>({patient.guardian.fullName || patient.guardian.name || "..........................................."})</span>
            <span>ผู้ปกครอง / ผู้รับการรักษา</span>
          </div>
        </div>
      </>
    );
  } else {
    const d = target.doc;
    const data = d.data;
    if (d.kind === "prescription") {
      const items = (Array.isArray(data.items) ? data.items : []) as RxLine[];
      body = (
        <>
          <h2 className="ps-title">ใบสั่งยา</h2>
          {who}
          <p className="ps-sub">วันที่ {day(d.date)}{patient.allergies ? ` · แพ้ยา: ${patient.allergies}` : ""}</p>
          <ol className="ps-rx">
            {items.map((i, idx) => (
              <li key={idx}>
                <strong>
                  {i.name} {i.strength}
                </strong>{" "}
                จำนวน {i.qty} {i.unit}
                <div>{i.sig}</div>
              </li>
            ))}
          </ol>
          {s(data.note) ? <p className="ps-sub">{s(data.note)}</p> : null}
          {sign(d.dentistSlug)}
        </>
      );
    } else if (d.kind === "certificate") {
      body = (
        <>
          <h2 className="ps-title">ใบรับรองแพทย์</h2>
          <p>
            ข้าพเจ้า {d.dentistSlug ? dentistName(d.dentistSlug) : "..............................."} ทันตแพทย์ผู้ประกอบวิชาชีพ
            {s(data.license) ? ` ใบอนุญาตเลขที่ ${s(data.license)}` : ""} ได้ทำการตรวจ
          </p>
          {who}
          <p>เมื่อวันที่ {day(d.date)}</p>
          <p>
            <strong>ผลการตรวจ / การวินิจฉัย:</strong> {s(data.diagnosis) || "-"}
          </p>
          <p>
            <strong>การรักษา:</strong> {s(data.treatment) || "-"}
          </p>
          {Number(data.restDays) > 0 ? (
            <p>
              <strong>ความเห็น:</strong> ควรพักรักษาตัวเป็นเวลา {Number(data.restDays)} วัน
              {s(data.restFrom) ? ` ตั้งแต่วันที่ ${day(s(data.restFrom))}` : ""}
              {s(data.restTo) ? ` ถึงวันที่ ${day(s(data.restTo))}` : ""}
            </p>
          ) : null}
          {s(data.opinion) ? (
            <p>
              <strong>ความเห็นเพิ่มเติม:</strong> {s(data.opinion)}
            </p>
          ) : null}
          {sign(d.dentistSlug)}
        </>
      );
    } else if (d.kind === "referral") {
      body = (
        <>
          <h2 className="ps-title">ใบส่งตัวผู้ป่วย</h2>
          <p>เรียน {s(data.to) || "..............................."}</p>
          {who}
          <p>วันที่ {day(d.date)}</p>
          <p>
            <strong>เหตุผลที่ส่งต่อ:</strong> {s(data.reason) || "-"}
          </p>
          <p>
            <strong>ผลการตรวจ / การรักษาที่ทำแล้ว:</strong> {s(data.findings) || "-"}
          </p>
          {patient.allergies ? <p>แพ้ยา: {patient.allergies}</p> : null}
          {sign(d.dentistSlug)}
        </>
      );
    } else {
      body = (
        <>
          <h2 className="ps-title">หนังสือยินยอมรับการรักษา</h2>
          {who}
          <p>วันที่ {day(d.date || today)}</p>
          <p>
            ข้าพเจ้า {s(data.guardianName) || patient.guardian.fullName || patient.guardian.name} ในฐานะ
            {patient.guardian.relation || "ผู้ปกครอง"} ของผู้รับการรักษาข้างต้น ได้รับคำอธิบายจากทันตแพทย์เกี่ยวกับการรักษา
          </p>
          <p>
            <strong>การรักษา:</strong> {s(data.procedure) || "-"}
          </p>
          <p>
            <strong>ความเสี่ยง / ผลข้างเคียงที่อาจเกิดขึ้น:</strong> {s(data.risks) || "-"}
          </p>
          {s(data.alternatives) ? (
            <p>
              <strong>ทางเลือกอื่น:</strong> {s(data.alternatives)}
            </p>
          ) : null}
          <p>ข้าพเจ้าเข้าใจและยินยอมให้ทำการรักษาดังกล่าว</p>
          <div className="ps-two-sign">
            <div className="ps-signature">
              <span>ลงชื่อ ............................................</span>
              <span>ผู้ปกครอง / ผู้ยินยอม</span>
            </div>
            {sign(d.dentistSlug, "ทันตแพทย์ผู้ให้ข้อมูล")}
          </div>
        </>
      );
    }
  }

  return (
    <div className="print-sheet a5">
      <style>{`@page { size: A5; margin: 10mm; }`}</style>
      <header className="ps-head">
        <strong className="ps-clinic">{settings.clinicName}</strong>
        {settings.address ? <span>{settings.address}</span> : null}
        {settings.phone ? <span>โทร {settings.phone}</span> : null}
      </header>
      {body}
    </div>
  );
}
