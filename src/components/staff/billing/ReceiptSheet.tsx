"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

import { baht, billTotals, lineNet, payMethodLabel, type Bill, type BillingSettings, type DayClose } from "@/lib/billing";
import { bahtText } from "@/lib/bahtText";
import { fmtLong } from "@/lib/dates";
import { promptPayPayload } from "@/lib/promptpay";
import { useT } from "@/i18n/lang";

/** the PromptPay QR for an amount — nothing when no PromptPay id is set */
export function PromptPayQR({ id, amount, size = 168 }: { id: string; amount: number; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const payload = id ? promptPayPayload(id, amount > 0 ? amount : undefined) : null;
  useEffect(() => {
    let live = true;
    if (!payload) return;
    QRCode.toDataURL(payload, { margin: 1, width: size * 2, errorCorrectionLevel: "M" })
      .then((url) => {
        if (live) setSrc(url);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [payload, size]);
  if (!payload || !src) return null;
  // a generated data: URL — next/image has nothing to optimise here
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="pp-qr" src={src} width={size} height={size} alt={`พร้อมเพย์ ${baht(amount)}`} />;
}

/** a QR for a web link — scan it with the tablet to open the page */
export function LinkQR({ url, size = 120 }: { url: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(url, { margin: 1, width: size * 2 })
      .then((u) => live && setSrc(u))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [url, size]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img className="pp-qr" src={src} width={size} height={size} alt="QR เปิดจอลูกค้า" /> : null;
}

/**
 * What prints: a receipt, or the day-close summary. Only visible to the
 * printer (see .print-sheet in staff.css); the page sets @page for the paper.
 */
export function PrintSheet({
  target,
  settings,
  dentistName,
  nextVisit,
}: {
  target: { kind: "receipt"; bill: Bill } | { kind: "close"; close: DayClose };
  settings: BillingSettings;
  dentistName: (slug: string | null) => string;
  nextVisit?: { date: string; time: string } | null;
}) {
  const dict = useT();
  const slip = settings.paper === "slip";
  const head = (
    <header className="ps-head">
      <strong className="ps-clinic">{settings.clinicName}</strong>
      {settings.address ? <span>{settings.address}</span> : null}
      {settings.phone ? <span>โทร {settings.phone}</span> : null}
      {settings.taxId ? <span>เลขประจำตัวผู้เสียภาษี {settings.taxId}</span> : null}
    </header>
  );

  return (
    <div className={`print-sheet ${slip ? "slip" : "a5"}`}>
      <style>{`@page { size: ${slip ? "80mm auto" : "A5"}; margin: ${slip ? "4mm" : "10mm"}; }`}</style>
      {head}
      {target.kind === "receipt" ? (
        <Receipt bill={target.bill} dentistName={dentistName} nextVisit={nextVisit} footer={settings.footer} dateText={(d) => fmtLong(dict, d, "th")} />
      ) : (
        <CloseSheet close={target.close} dentistName={dentistName} dateText={(d) => fmtLong(dict, d, "th")} />
      )}
    </div>
  );
}

function Receipt({
  bill,
  dentistName,
  nextVisit,
  footer,
  dateText,
}: {
  bill: Bill;
  dentistName: (slug: string | null) => string;
  nextVisit?: { date: string; time: string } | null;
  footer: string;
  dateText: (iso: string) => string;
}) {
  const { subtotal, total } = billTotals(bill.items, bill.discount);
  return (
    <>
      <h2 className="ps-title">ใบเสร็จรับเงิน</h2>
      <div className="ps-meta">
        <span>เลขที่ {bill.receiptNo ?? "—"}</span>
        <span>วันที่ {dateText(bill.date)}</span>
        <span>ผู้รับบริการ {bill.patientName}</span>
        {bill.dentistSlug ? <span>ทันตแพทย์ {dentistName(bill.dentistSlug)}</span> : null}
      </div>
      <table className="ps-table">
        <thead>
          <tr>
            <th>รายการ</th>
            <th className="num">จำนวน</th>
            <th className="num">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((i, idx) => (
            <tr key={i.id ?? idx}>
              <td>
                {i.name}
                {i.teeth ? <span className="ps-sub"> ซี่ {i.teeth}</span> : null}
                {i.discount > 0 ? <span className="ps-sub"> (ลด {baht(i.discount)})</span> : null}
              </td>
              <td className="num">{i.qty}</td>
              <td className="num">{lineNet(i).toLocaleString("th-TH")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ps-totals">
        {bill.discount > 0 ? (
          <>
            <span>รวม</span>
            <span className="num">{baht(subtotal)}</span>
            <span>ส่วนลด</span>
            <span className="num">−{baht(bill.discount)}</span>
          </>
        ) : null}
        <strong>ยอดสุทธิ</strong>
        <strong className="num">{baht(total)}</strong>
        {bill.payments.map((p) => (
          <React.Fragment key={p.id}>
            <span>ชำระ {payMethodLabel(p.method)}</span>
            <span className="num">{baht(p.amount)}</span>
          </React.Fragment>
        ))}
        {bill.balance > 0 ? (
          <>
            <strong>ค้างชำระ</strong>
            <strong className="num">{baht(bill.balance)}</strong>
          </>
        ) : null}
      </div>
      <p className="ps-words">({bahtText(total)})</p>
      {nextVisit ? (
        <p className="ps-next">
          นัดครั้งต่อไป {dateText(nextVisit.date)} เวลา {nextVisit.time} น.
        </p>
      ) : null}
      <div className="ps-sign">
        <span>ผู้รับเงิน ............................................</span>
      </div>
      {footer ? <p className="ps-foot">{footer}</p> : null}
    </>
  );
}

function CloseSheet({
  close,
  dentistName,
  dateText,
}: {
  close: DayClose;
  dentistName: (slug: string | null) => string;
  dateText: (iso: string) => string;
}) {
  return (
    <>
      <h2 className="ps-title">สรุปปิดยอดประจำวัน</h2>
      <div className="ps-meta">
        <span>{dateText(close.date)}</span>
      </div>
      <table className="ps-table">
        <thead>
          <tr>
            <th>ช่องทาง</th>
            <th className="num">รายการ</th>
            <th className="num">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {close.byMethod.map((m) => (
            <tr key={m.method}>
              <td>{payMethodLabel(m.method)}</td>
              <td className="num">{m.count}</td>
              <td className="num">{m.amount.toLocaleString("th-TH")}</td>
            </tr>
          ))}
          <tr className="ps-sum">
            <td>รับเงินรวม</td>
            <td />
            <td className="num">{close.received.toLocaleString("th-TH")}</td>
          </tr>
        </tbody>
      </table>
      <table className="ps-table">
        <thead>
          <tr>
            <th>ทันตแพทย์</th>
            <th className="num">ยอดรักษา</th>
            <th className="num">DF</th>
          </tr>
        </thead>
        <tbody>
          {close.dentists.map((d) => (
            <tr key={d.dentistSlug ?? "-"}>
              <td>{d.dentistSlug ? dentistName(d.dentistSlug) : "ไม่ระบุแพทย์ (สินค้า/อื่น ๆ)"}</td>
              <td className="num">{d.revenue.toLocaleString("th-TH")}</td>
              <td className="num">{d.df.toLocaleString("th-TH")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ps-sub">
        บิลชำระครบ {close.billsPaid} · ค้างชำระ {close.billsOwing} บิล ({baht(close.owing)}) · ยกเลิก {close.voided.length} บิล
      </p>
      {close.voided.map((v, i) => (
        <p key={i} className="ps-sub">
          ยกเลิก {v.receiptNo ?? "(ยังไม่ออกเลข)"} · {v.patientName} · {baht(v.total)} — {v.reason}
        </p>
      ))}
    </>
  );
}
