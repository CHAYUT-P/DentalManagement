"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import type { DisplayState } from "@/lib/billing";
import { promptPayPayload } from "@/lib/promptpay";
import "./display.css";

const baht = (n: number) => `฿${Math.round(n).toLocaleString("th-TH")}`;

/**
 * จอลูกค้า — a tablet or second monitor facing the family. It follows the
 * bill the counter has open: the lines, what is paid and what is left, and
 * the PromptPay QR with the amount when they pay that way.
 */
export function CustomerDisplay() {
  const [state, setState] = useState<DisplayState | null>(null);
  const [bad, setBad] = useState(false);
  const [qr, setQr] = useState("");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("c") ?? "";
    let live = true;
    const tick = () =>
      fetch(`/api/display?c=${encodeURIComponent(code)}`, { cache: "no-store" })
        .then(async (r) => {
          if (!live) return;
          if (r.status === 404) return setBad(true);
          setBad(false);
          setState((await r.json()) as DisplayState);
        })
        .catch(() => {});
    void tick();
    const t = setInterval(() => void tick(), 1500);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  const payload = state?.mode === "bill" && state.promptpayId && state.qrAmount > 0 ? promptPayPayload(state.promptpayId, state.qrAmount) : null;
  useEffect(() => {
    let live = true;
    if (!payload) return;
    QRCode.toDataURL(payload, { margin: 1, width: 640 })
      .then((u) => live && setQr(u))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [payload]);

  if (bad) {
    return (
      <main className="cd cd-center">
        <h1>จอลูกค้า</h1>
        <p>เปิดจากลิงก์ในแอปพนักงาน (ตั้งค่า › การเงิน &amp; DF › จอลูกค้า)</p>
      </main>
    );
  }
  if (!state || state.mode === "idle") {
    return (
      <main className="cd cd-center">
        <span className="cd-tooth" aria-hidden="true">🦷</span>
        <h1>{state?.clinicName ?? "Denta Kids"}</h1>
        <p>ยินดีต้อนรับค่ะ</p>
      </main>
    );
  }
  if (state.mode === "thanks") {
    return (
      <main className="cd cd-center">
        <span className="cd-tooth" aria-hidden="true">✓</span>
        <h1>ชำระเรียบร้อย ขอบคุณค่ะ</h1>
        <p>{state.patientName ? `แล้วพบกันใหม่นะคะ ${state.patientName}` : "แล้วพบกันใหม่นะคะ"}</p>
      </main>
    );
  }
  return (
    <main className="cd">
      <section className="cd-bill">
        <header>
          <span>{state.clinicName}</span>
          <h1>{state.patientName}</h1>
        </header>
        <ul>
          {state.items.map((i, n) => (
            <li key={n}>
              <span>
                {i.name}
                {i.qty > 1 ? ` ×${i.qty}` : ""}
              </span>
              <span>{baht(i.amount)}</span>
            </li>
          ))}
        </ul>
        <dl>
          <dt>ยอดสุทธิ</dt>
          <dd>{baht(state.total)}</dd>
          {state.paid > 0 ? (
            <>
              <dt>ชำระแล้ว</dt>
              <dd>{baht(state.paid)}</dd>
            </>
          ) : null}
          <dt className="big">ยอดที่ต้องชำระ</dt>
          <dd className="big">{baht(state.balance)}</dd>
        </dl>
      </section>
      {payload && qr ? (
        <section className="cd-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR พร้อมเพย์ ${baht(state.qrAmount)}`} />
          <strong>สแกนจ่ายด้วยพร้อมเพย์</strong>
          <span>{baht(state.qrAmount)}</span>
        </section>
      ) : null}
    </main>
  );
}
