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
import { SECTOR_FOR, lateralPath, occlusalPath, toothFlip } from "@/lib/toothShapes";
import { useStaff } from "@/lib/staffStore";

type ChartSet = "primary" | "mixed" | "permanent";

const isLower = (tooth: string) => ["3", "4", "7", "8"].includes(tooth[0]);

/** a big X across a drawing — the tooth was taken out */
function cross(viewBox: string) {
  const [, , w, h] = viewBox.split(" ").map(Number);
  return `M ${w * 0.12} ${h * 0.1} L ${w * 0.88} ${h * 0.9} M ${w * 0.88} ${h * 0.1} L ${w * 0.12} ${h * 0.9}`;
}

/** the transform that mirrors a drawing inside its own box */
function flipTransform(viewBox: string, flip: { x: boolean; y: boolean }) {
  const [, , w, h] = viewBox.split(" ").map(Number);
  return `translate(${flip.x ? w : 0} ${flip.y ? h : 0}) scale(${flip.x ? -1 : 1} ${flip.y ? -1 : 1})`;
}

/**
 * One tooth, drawn the way charts are: the side view (crown and roots —
 * roots up for upper teeth, down for lower) and the five-surface top view.
 * Faces with a finding are coloured; whole-tooth conditions change the
 * tooth itself (crowned, root-treated, gone, not yet erupted…).
 */
function ToothGlyph({ tooth, row }: { tooth: string; row?: ToothRow }) {
  const status = row?.status;
  const meta = status ? TOOTH_STATUSES.find((s) => s.key === status) : undefined;
  const faces = new Set((row?.surfaces ?? []).map((f) => SECTOR_FOR[f]));
  const tone = meta ? `var(--tooth-${meta.tone})` : "";
  const gone = status === "missing" || status === "extracted";
  const ghost = gone || status === "unerupted";
  const lat = lateralPath(tooth);
  const occ = occlusalPath(tooth);
  const flip = toothFlip(tooth);
  const lower = isLower(tooth);
  const crownFill = status === "crown" || status === "ssc" || status === "implant" ? tone : "var(--tooth-enamel)";
  // root canal: the whole canal; pulpotomy (baby teeth): only the pulp inside the crown
  const pulp = status === "rct" ? lat.pulp : undefined;
  const clip = `occ-${tooth}`;

  const side = (
    <svg
      viewBox={lat.viewBox}
      className={`tooth-side ${ghost ? "ghost" : ""} ${status === "unerupted" ? "dashed" : ""}`}
      preserveAspectRatio={lower ? "xMidYMin meet" : "xMidYMax meet"}
      aria-hidden="true"
    >
      <g transform={flipTransform(lat.viewBox, flip)}>
        {(lat.roots ?? (lat.root ? [lat.root] : [])).map((d, i) =>
          status === "implant" ? null : <path key={i} d={d} className="tooth-root" />,
        )}
        {status === "implant" ? <path d={lat.root ?? lat.roots?.[0] ?? ""} className="tooth-implant" /> : null}
        {status === "pulpotomy" ? (
          <clipPath id={`crown-${tooth}`}>
            <path d={lat.crown} />
          </clipPath>
        ) : null}
        <path d={lat.crown} className="tooth-crown" style={{ fill: crownFill }} />
        {meta?.surfaces && faces.size ? <path d={lat.crown} fill={tone} opacity={0.45} /> : null}
        {status === "rct" && pulp ? <path d={pulp} fill={tone} /> : null}
        {status === "pulpotomy" ? (
          // the pulp chamber inside the crown, filled
          <ellipse
            cx={lat.anchors?.crownCenter.x ?? 23}
            cy={lat.anchors?.crownCenter.y ?? 100}
            rx={Number(lat.viewBox.split(" ")[2]) * 0.2}
            ry={Number(lat.viewBox.split(" ")[3]) * 0.07}
            fill={tone}
            clipPath={`url(#crown-${tooth})`}
          />
        ) : null}
      </g>
      {status === "extracted" ? <path d={cross(lat.viewBox)} className="tooth-x" /> : null}
    </svg>
  );

  const top = (
    <svg viewBox="0 0 50 50" className={`tooth-top ${ghost ? "ghost" : ""}`} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <path d={occ.outline} />
        </clipPath>
      </defs>
      <g transform={flipTransform("0 0 50 50", flip)}>
        <path d={occ.outline} className="tooth-crown" style={{ fill: crownFill }} />
        <g clipPath={`url(#${clip})`}>
          {Object.entries(occ.surfaces).map(([k, d]) => (
            <path
              key={k}
              d={d}
              fill={meta?.surfaces && faces.has(k) ? tone : status === "sealant" && k === "O" ? tone : "transparent"}
            />
          ))}
          {occ.highlight.map((d, i) => (
            <path key={i} d={d} className="tooth-line" />
          ))}
        </g>
        <path d={occ.outline} className="tooth-edge" />
      </g>
      {gone ? <path d="M10 10 L40 40 M40 10 L10 40" stroke="var(--tooth-gone)" strokeWidth="3" strokeLinecap="round" /> : null}
    </svg>
  );

  return lower ? (
    <>
      {top}
      {side}
    </>
  ) : (
    <>
      {side}
      {top}
    </>
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
            {isLower(t) ? <span className="odo-num">{t}</span> : <span className="odo-tag">{s?.short ?? ""}</span>}
            <ToothGlyph tooth={t} row={r} />
            {isLower(t) ? <span className="odo-tag">{s?.short ?? ""}</span> : <span className="odo-num">{t}</span>}
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
