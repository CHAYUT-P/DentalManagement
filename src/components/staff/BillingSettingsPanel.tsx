"use client";

import React, { useCallback, useEffect, useState } from "react";

import { staffBillingSettings, staffRemoveDfRule, staffSaveBillingSettings, staffSaveDfRule } from "@/server/actions";
import { DEFAULT_BILLING_SETTINGS, type BillingSettings, type DfMode, type DfRule } from "@/lib/billing";
import { useStaff } from "@/lib/staffStore";
import { useTreatments } from "@/lib/treatmentsContext";
import { LinkQR, PromptPayQR } from "./ReceiptSheet";
import { IconCheck, IconPlus, IconX } from "./staffIcons";

/**
 * ตั้งค่า › การเงิน & DF (full edition) — what the receipt says, where the
 * PromptPay QR pays, and how each dentist's fee is worked out.
 */
export function BillingSettingsPanel({ patientWebUrl = "/" }: { patientWebUrl?: string }) {
  const { dentists, showToast } = useStaff();
  const tr = useTreatments();
  const catalog = tr.list.filter((t) => t.key !== "more");

  const [form, setForm] = useState<BillingSettings>(DEFAULT_BILLING_SETTINGS);
  const [saved, setSaved] = useState<BillingSettings>(DEFAULT_BILLING_SETTINGS);
  const [rules, setRules] = useState<DfRule[]>([]);
  const [draft, setDraft] = useState<{ dentistSlug: string; treatmentKey: string; mode: DfMode; value: string }>({
    dentistSlug: "",
    treatmentKey: "",
    mode: "percent",
    value: "",
  });

  const load = useCallback(async () => {
    const r = await staffBillingSettings();
    setForm(r.settings);
    setSaved(r.settings);
    setRules(r.dfRules);
  }, []);

  useEffect(() => {
    let live = true;
    staffBillingSettings()
      .then((r) => {
        if (!live) return;
        setForm(r.settings);
        setSaved(r.settings);
        setRules(r.dfRules);
      })
      .catch(() => showToast("โหลดการตั้งค่าการเงินไม่สำเร็จ"));
    return () => {
      live = false;
    };
  }, [showToast]);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const base = /^https?:/.test(patientWebUrl) ? patientWebUrl.replace(/\/$/, "") : typeof window !== "undefined" ? window.location.origin : "";
  const displayUrl = `${base}/display?c=${saved.displayCode}`;
  const set = (patch: Partial<BillingSettings>) => setForm((f) => ({ ...f, ...patch }));

  const saveForm = async () => {
    await staffSaveBillingSettings(form);
    await load();
    showToast("บันทึกการตั้งค่าใบเสร็จแล้ว");
  };

  const addRule = async () => {
    const value = Number(draft.value);
    if (!Number.isFinite(value) || draft.value === "") return;
    await staffSaveDfRule({
      dentistSlug: draft.dentistSlug || null,
      treatmentKey: draft.treatmentKey || null,
      mode: draft.mode,
      value,
    });
    setDraft({ dentistSlug: "", treatmentKey: "", mode: draft.mode, value: "" });
    await load();
    showToast("บันทึกกฎค่าแพทย์แล้ว");
  };

  const removeRule = async (id: number) => {
    setRules((rs) => rs.filter((r) => r.id !== id));
    await staffRemoveDfRule(id);
    await load();
  };

  const dentistName = (slug: string | null) =>
    slug ? (dentists.find((d) => d.slug === slug)?.text.th.name ?? slug) : "ทุกคน";
  const treatName = (key: string | null) => (key ? tr.name(key) : "ทุกบริการ");
  // most specific first, the clinic-wide default last — the order they are checked in
  const rank = (r: DfRule) => (r.dentistSlug && r.treatmentKey ? 0 : r.treatmentKey ? 1 : r.dentistSlug ? 2 : 3);
  const sorted = [...rules].sort((a, b) => rank(a) - rank(b));

  return (
    <div className="staff-container billing-settings">
      <div className="staff-page-header">
        <div>
          <h2>การเงิน &amp; DF</h2>
          <p>หัวใบเสร็จ พร้อมเพย์ และวิธีคิดค่าแพทย์ — ใช้กับหน้าการเงินทุกเครื่อง</p>
        </div>
      </div>

      <section className="settings-card">
        <h3>ใบเสร็จรับเงิน</h3>
        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="bs-name">ชื่อคลินิกบนใบเสร็จ</label>
            <input id="bs-name" className="form-control" value={form.clinicName} onChange={(e) => set({ clinicName: e.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="bs-phone">เบอร์โทร</label>
            <input id="bs-phone" className="form-control" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="bs-addr">ที่อยู่</label>
          <input id="bs-addr" className="form-control" value={form.address} onChange={(e) => set({ address: e.target.value })} />
        </div>
        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="bs-tax">เลขประจำตัวผู้เสียภาษี (ถ้ามี)</label>
            <input id="bs-tax" className="form-control" inputMode="numeric" value={form.taxId} onChange={(e) => set({ taxId: e.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="bs-prefix">ตัวอักษรนำเลขที่ใบเสร็จ</label>
            <input id="bs-prefix" className="form-control" value={form.receiptPrefix} onChange={(e) => set({ receiptPrefix: e.target.value })} />
            <span className="form-hint">
              เช่น {form.receiptPrefix || "RC"}6910-0001 (ปี พ.ศ. + เดือน + ลำดับ)
            </span>
          </div>
        </div>
        <div className="form-row-2">
          <div className="form-group">
            <label>ขนาดกระดาษ</label>
            <div className="staff-pill-group">
              <button type="button" className={`staff-pill-btn ${form.paper === "a5" ? "active" : ""}`} onClick={() => set({ paper: "a5" })}>
                A5
              </button>
              <button type="button" className={`staff-pill-btn ${form.paper === "slip" ? "active" : ""}`} onClick={() => set({ paper: "slip" })}>
                สลิป 80 มม.
              </button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="bs-foot">ข้อความท้ายใบเสร็จ</label>
            <input id="bs-foot" className="form-control" value={form.footer} onChange={(e) => set({ footer: e.target.value })} />
          </div>
        </div>
      </section>

      <section className="settings-card">
        <h3>พร้อมเพย์</h3>
        <div className="pp-setting">
          <div className="form-group">
            <label htmlFor="bs-pp">เบอร์มือถือ หรือเลขประจำตัว 13 หลัก ที่ผูกพร้อมเพย์</label>
            <input
              id="bs-pp"
              className="form-control"
              inputMode="numeric"
              placeholder="เช่น 0812345678"
              value={form.promptpayId}
              onChange={(e) => set({ promptpayId: e.target.value })}
            />
            <span className="form-hint">หน้าการเงินจะแสดง QR พร้อมยอดเงินให้ผู้ปกครองสแกน</span>
          </div>
          {form.promptpayId ? <PromptPayQR id={form.promptpayId} amount={0} size={120} /> : null}
        </div>
        <div className="settings-save">
          <button type="button" className="btn-primary-staff" disabled={!dirty} onClick={() => void saveForm()}>
            <IconCheck size={15} />
            <span>{dirty ? "บันทึก" : "บันทึกแล้ว"}</span>
          </button>
        </div>
      </section>

      <section className="settings-card">
        <h3>จอลูกค้า (จอที่ 2)</h3>
        <p className="settings-help">
          เปิดลิงก์นี้บนแท็บเล็ตหรือจอที่สองที่หันไปทางผู้ปกครอง แล้วเปิดสวิตช์ “จอลูกค้า” ที่หน้าการเงิน — จอจะแสดงรายการ ยอดที่ต้องชำระ
          และ QR พร้อมเพย์ตามบิลที่กำลังเปิดอยู่
        </p>
        {saved.displayCode ? (
          <div className="pp-setting">
            <div className="form-group">
              <input className="form-control" readOnly aria-label="ลิงก์จอลูกค้า" value={displayUrl} onFocus={(e) => e.target.select()} />
              <button
                type="button"
                className="btn-secondary-staff"
                style={{ alignSelf: "flex-start" }}
                onClick={() => {
                  void navigator.clipboard?.writeText(displayUrl);
                  showToast("คัดลอกลิงก์แล้ว");
                }}
              >
                คัดลอกลิงก์
              </button>
            </div>
            <LinkQR url={displayUrl} />
          </div>
        ) : null}
      </section>

      <section className="settings-card">
        <h3>ค่าแพทย์ (DF)</h3>
        <p className="settings-help">
          ระบบใช้กฎที่ตรงที่สุดก่อน: แพทย์ + บริการ → บริการ (ทุกคน) → แพทย์ (ทุกบริการ) → ค่าเริ่มต้นของคลินิก.
          แบบ % คิดจากยอดหลังส่วนลดและหักค่าแลปแล้ว · แบบบาท คิดต่อจำนวนครั้ง. บิลที่ชำระแล้วจะไม่เปลี่ยนตามกฎใหม่
        </p>

        <div className="df-table" role="table" aria-label="กฎค่าแพทย์">
          <div className="df-row df-head" role="row">
            <span>แพทย์</span>
            <span>บริการ</span>
            <span className="num">ค่าแพทย์</span>
            <span />
          </div>
          {sorted.length === 0 ? (
            <p className="cl-empty">ยังไม่มีกฎ — เพิ่มค่าเริ่มต้นของคลินิกก่อน เช่น ทุกคน · ทุกบริการ · 50%</p>
          ) : null}
          {sorted.map((r) => (
            <div key={r.id} className="df-row" role="row">
              <span>{dentistName(r.dentistSlug)}</span>
              <span>{treatName(r.treatmentKey)}</span>
              <strong className="num">{r.mode === "percent" ? `${r.value}%` : `฿${r.value.toLocaleString()} / ครั้ง`}</strong>
              <button type="button" className="btn-action-icon danger" aria-label="ลบกฎ" onClick={() => void removeRule(r.id)}>
                <IconX size={14} />
              </button>
            </div>
          ))}
          <div className="df-row df-add" role="row">
            <select className="form-control" aria-label="แพทย์" value={draft.dentistSlug} onChange={(e) => setDraft({ ...draft, dentistSlug: e.target.value })}>
              <option value="">ทุกคน</option>
              {dentists.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.text.th.name}
                </option>
              ))}
            </select>
            <select className="form-control" aria-label="บริการ" value={draft.treatmentKey} onChange={(e) => setDraft({ ...draft, treatmentKey: e.target.value })}>
              <option value="">ทุกบริการ</option>
              {catalog.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name.th}
                </option>
              ))}
            </select>
            <span className="df-value">
              <input
                className="form-control num"
                aria-label="ค่า"
                inputMode="numeric"
                placeholder={draft.mode === "percent" ? "50" : "300"}
                value={draft.value}
                onChange={(e) => setDraft({ ...draft, value: e.target.value.replace(/\D/g, "") })}
              />
              <select className="form-control" aria-label="แบบ" value={draft.mode} onChange={(e) => setDraft({ ...draft, mode: e.target.value as DfMode })}>
                <option value="percent">%</option>
                <option value="fixed">บาท/ครั้ง</option>
              </select>
            </span>
            <button type="button" className="btn-primary-staff" disabled={draft.value === ""} onClick={() => void addRule()}>
              <IconPlus size={14} />
              <span>เพิ่ม</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
