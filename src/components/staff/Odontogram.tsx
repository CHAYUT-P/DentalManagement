"use client";

import React, { useMemo, useState } from "react";

import {
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  PRIMARY_LOWER,
  PRIMARY_UPPER,
  TOOTH_STATUSES,
  chartSetForAge,
  surfacesFor,
  toothStatusLabel,
  type ToothEventRow,
  type ToothRow,
  type ToothStatus,
} from "@/lib/clinical";
import { useStaff } from "@/lib/staffStore";

type ChartSet = "primary" | "mixed" | "permanent";

/** patient's right is drawn on the viewer's left — mesial faces the midline */
const mesialOnRight = (tooth: string) => ["1", "4", "5", "8"].includes(tooth[0]);

function ToothGlyph({ tooth, row, selected }: { tooth: string; row?: ToothRow; selected: boolean }) {
  const status = row?.status;
  const meta = status ? TOOTH_STATUSES.find((s) => s.key === status) : undefined;
  const faces = row?.surfaces ?? [];
  const whole = status && !meta?.surfaces;
  const center = surfacesFor(tooth)[1]; // O or I
  const left = mesialOnRight(tooth) ? "D" : "M";
  const right = mesialOnRight(tooth) ? "M" : "D";
  const fill = (face: string) =>
    meta?.surfaces && faces.includes(face) ? `var(--tooth-${meta.tone})` : whole ? `var(--tooth-${meta!.tone}-soft)` : "#fff";
  const gone = status === "missing" || status === "extracted" || status === "unerupted";

  return (
    <svg viewBox="0 0 40 40" className={`tooth-svg ${selected ? "sel" : ""}`} aria-hidden="true">
      {/* B top, L bottom, mesial/distal sides, O/I centre */}
      <polygon points="2,2 38,2 28,12 12,12" fill={fill("B")} />
      <polygon points="12,28 28,28 38,38 2,38" fill={fill("L")} />
      <polygon points="2,2 12,12 12,28 2,38" fill={fill(left)} />
      <polygon points="38,2 38,38 28,28 28,12" fill={fill(right)} />
      <rect x="12" y="12" width="16" height="16" fill={fill(center)} />
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="2" y="2" width="36" height="36" rx="3" />
        <rect x="12" y="12" width="16" height="16" />
        <path d="M2 2 12 12M38 2 28 12M2 38 12 28M38 38 28 28" />
      </g>
      {gone ? <path d="M6 6 34 34M34 6 6 34" stroke="var(--tooth-gone)" strokeWidth="3" strokeLinecap="round" /> : null}
      {status === "crown" || status === "ssc" || status === "implant" ? (
        <circle cx="20" cy="20" r="16" fill="none" stroke={`var(--tooth-${meta!.tone})`} strokeWidth="3" />
      ) : null}
    </svg>
  );
}

/**
 * The dental chart: FDI layout, baby teeth (51–85) and/or permanent (11–48),
 * five faces per tooth. Tap teeth to select, pick what you found, save.
 * Every change is kept in the history below.
 */
export function Odontogram({
  age,
  chart,
  history,
  onSave,
}: {
  age: number | null;
  chart: ToothRow[];
  history: ToothEventRow[];
  onSave: (input: { teeth: string[]; status: ToothStatus; surfaces: string[]; note: string; dentistSlug: string | null }) => Promise<void>;
}) {
  const { dentists } = useStaff();
  const [set, setSet] = useState<ChartSet>(() => chartSetForAge(age ?? undefined));
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<ToothStatus>("caries");
  const [faces, setFaces] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [dentistSlug, setDentistSlug] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const byTooth = useMemo(() => new Map(chart.map((r) => [r.tooth, r])), [chart]);
  const meta = TOOTH_STATUSES.find((s) => s.key === status);

  const toggle = (t: string) => {
    setSelected((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
    // one tooth picked: start from what is recorded for it
    if (!selected.length) {
      const r = byTooth.get(t);
      if (r) {
        setStatus(r.status);
        setFaces(r.surfaces);
        setNote(r.note);
      } else {
        setFaces([]);
        setNote("");
      }
    }
  };

  const save = async () => {
    if (!selected.length) return;
    setBusy(true);
    await onSave({ teeth: selected, status, surfaces: meta?.surfaces ? faces : [], note, dentistSlug: dentistSlug || null });
    setBusy(false);
    setSelected([]);
    setFaces([]);
    setNote("");
  };

  const rowOf = (teeth: string[], label: string) => (
    <div className="odo-row" aria-label={label}>
      {teeth.map((t) => {
        const r = byTooth.get(t);
        const s = r ? TOOTH_STATUSES.find((x) => x.key === r.status) : undefined;
        return (
          <button
            key={t}
            type="button"
            className={`odo-tooth ${selected.includes(t) ? "sel" : ""} ${r ? `has-${s?.tone ?? ""}` : ""}`}
            title={r ? `${t} · ${toothStatusLabel(r.status)}${r.surfaces.length ? ` (${r.surfaces.join("")})` : ""}${r.note ? ` — ${r.note}` : ""}` : t}
            aria-pressed={selected.includes(t)}
            onClick={() => toggle(t)}
          >
            <span className="odo-tag">{s?.short ?? ""}</span>
            <ToothGlyph tooth={t} row={r} selected={selected.includes(t)} />
            <span className="odo-num">{t}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="odo">
      <div className="odo-top">
        <div className="staff-pill-group">
          {(
            [
              ["primary", "ฟันน้ำนม"],
              ["mixed", "ฟันผสม"],
              ["permanent", "ฟันแท้"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" className={`staff-pill-btn ${set === k ? "active" : ""}`} onClick={() => setSet(k)}>
              {label}
            </button>
          ))}
        </div>
        <span className="odo-hint">แตะฟันเพื่อเลือก (เลือกได้หลายซี่) แล้วเลือกสิ่งที่พบด้านขวา</span>
      </div>

      <div className="odo-body">
        <div className="odo-chart">
          {set !== "primary" ? rowOf(PERMANENT_UPPER, "ฟันแท้บน") : null}
          {set !== "permanent" ? rowOf(PRIMARY_UPPER, "ฟันน้ำนมบน") : null}
          <div className="odo-midline">
            <span>ขวาคนไข้</span>
            <span>ซ้ายคนไข้</span>
          </div>
          {set !== "permanent" ? rowOf(PRIMARY_LOWER, "ฟันน้ำนมล่าง") : null}
          {set !== "primary" ? rowOf(PERMANENT_LOWER, "ฟันแท้ล่าง") : null}
          <div className="odo-legend">
            {TOOTH_STATUSES.filter((s) => s.key !== "sound").map((s) => (
              <span key={s.key}>
                <i style={{ background: `var(--tooth-${s.tone})` }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>

        <aside className="odo-panel">
          <strong>{selected.length ? `ซี่ ${selected.join(", ")}` : "ยังไม่ได้เลือกฟัน"}</strong>
          <div className="odo-statuses">
            {TOOTH_STATUSES.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`odo-status ${status === s.key ? "on" : ""}`}
                onClick={() => setStatus(s.key)}
              >
                <i style={{ background: `var(--tooth-${s.tone})` }} />
                {s.label}
              </button>
            ))}
          </div>
          {meta?.surfaces ? (
            <div className="odo-faces">
              <span>ด้านฟัน</span>
              {(selected[0] ? surfacesFor(selected[0]) : ["M", "O", "D", "B", "L"]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`odo-face ${faces.includes(f) ? "on" : ""}`}
                  onClick={() => setFaces((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]))}
                >
                  {f}
                </button>
              ))}
            </div>
          ) : null}
          <input className="form-control" aria-label="หมายเหตุ" placeholder="หมายเหตุ (ไม่บังคับ)" value={note} onChange={(e) => setNote(e.target.value)} />
          <select className="form-control" aria-label="ผู้ตรวจ" value={dentistSlug} onChange={(e) => setDentistSlug(e.target.value)}>
            <option value="">ผู้ตรวจ — ไม่ระบุ</option>
            {dentists.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.text.th.name}
              </option>
            ))}
          </select>
          <div className="odo-panel-actions">
            <button type="button" className="btn-secondary-staff" disabled={!selected.length} onClick={() => setSelected([])}>
              ล้างที่เลือก
            </button>
            <button type="button" className="btn-primary-staff" disabled={!selected.length || busy} onClick={() => void save()}>
              บันทึกลงชาร์ต
            </button>
          </div>
        </aside>
      </div>

      <section className="odo-history">
        <h4>ประวัติการบันทึกฟัน</h4>
        {history.length === 0 ? <p className="cl-empty">ยังไม่มีการบันทึก</p> : null}
        {history.slice(0, 40).map((h) => (
          <div key={h.id} className="oh-row">
            <span className="oh-date">{new Date(h.updatedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}</span>
            <strong>ซี่ {h.tooth}</strong>
            <span>
              {toothStatusLabel(h.status)}
              {h.surfaces.length ? ` (${h.surfaces.join("")})` : ""}
              {h.note ? ` — ${h.note}` : ""}
            </span>
            <span className="muted">{h.dentistSlug ? dentists.find((d) => d.slug === h.dentistSlug)?.text.th.name : ""}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
