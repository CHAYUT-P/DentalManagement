"use client";

import React, { useEffect, useState } from "react";

import { staffAudit, staffSaveUser, staffUsers } from "@/server/actions";
import { PERM_LABEL, ROLE_LABEL, ROLE_PERMS, type AuditRow, type Perm, type Role, type StaffUserInfo } from "@/lib/roles";
import { useStaff } from "@/lib/staffStore";
import { useStaffUser } from "@/lib/staffUser";
import { IconPlus } from "./staffIcons";

const ROLES = Object.keys(ROLE_LABEL) as Role[];
const ERRORS: Record<string, string> = {
  name: "ใส่ชื่อก่อน",
  pin: "PIN ต้องเป็นตัวเลข 4–8 หลัก",
  owner: "ต้องมีบัญชีเจ้าของที่ใช้งานอยู่อย่างน้อย 1 บัญชี",
};

/**
 * ตั้งค่า › ผู้ใช้ & สิทธิ์ (full edition) — each person gets their own PIN
 * and a role; the role decides which menus they see (and the server checks
 * the same). Below: who did what, newest first.
 */
export function UsersPanel() {
  const { dentists, showToast } = useStaff();
  const { accounts, refresh } = useStaffUser();
  const [users, setUsers] = useState<StaffUserInfo[]>([]);
  const [log, setLog] = useState<AuditRow[]>([]);
  const [edit, setEdit] = useState<{ id?: number; name: string; role: Role; pin: string; dentistSlug: string; isActive: boolean } | null>(null);
  const [err, setErr] = useState("");

  const load = async () => {
    const [u, a] = await Promise.all([staffUsers(), staffAudit()]);
    setUsers(u);
    setLog(a);
  };

  useEffect(() => {
    let live = true;
    Promise.all([staffUsers(), staffAudit()])
      .then(([u, a]) => {
        if (!live) return;
        setUsers(u);
        setLog(a);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const save = async () => {
    if (!edit) return;
    const r = await staffSaveUser({ ...edit, dentistSlug: edit.dentistSlug || null, pin: edit.pin || undefined });
    if (!r.ok) return setErr(ERRORS[r.error ?? ""] ?? "บันทึกไม่สำเร็จ");
    setEdit(null);
    showToast("บันทึกผู้ใช้แล้ว");
    if (!accounts) {
      // the first account turns sign-in on — the app now asks who is using it
      await refresh();
      return;
    }
    await load().catch(() => {});
  };

  return (
    <div className="staff-container billing-settings">
      <div className="staff-page-header">
        <div>
          <h2>ผู้ใช้ &amp; สิทธิ์</h2>
          <p>แต่ละคนเข้าใช้ด้วย PIN ของตัวเอง · สิทธิ์ตามตำแหน่ง · ทุกการรับเงิน ยกเลิกบิล และแก้ตั้งค่าถูกบันทึกไว้</p>
        </div>
        <button
          type="button"
          className="btn-primary-staff"
          onClick={() => {
            setErr("");
            setEdit({ name: "", role: users.length ? "frontdesk" : "owner", pin: "", dentistSlug: "", isActive: true });
          }}
        >
          <IconPlus size={14} /> เพิ่มผู้ใช้
        </button>
      </div>

      {!accounts ? (
        <div className="settings-card">
          <p className="settings-help">
            ตอนนี้ยังไม่มีบัญชีผู้ใช้ — ทุกเครื่องเปิดได้ทุกเมนูเหมือนเดิม. เมื่อเพิ่มบัญชีแรก (ต้องเป็น “เจ้าของ”)
            แอปจะถามว่าใครใช้งานทุกครั้งที่เปิด
          </p>
        </div>
      ) : null}

      {edit ? (
        <section className="settings-card">
          <h3>{edit.id ? "แก้ไขผู้ใช้" : "ผู้ใช้ใหม่"}</h3>
          <div className="stock-form">
            <label>
              ชื่อที่แสดง
              <input className="form-control" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </label>
            <label>
              ตำแหน่ง
              <select className="form-control" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {edit.id ? "PIN ใหม่ (เว้นว่าง = ไม่เปลี่ยน)" : "PIN (ตัวเลข 4–8 หลัก)"}
              <input
                className="form-control"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={edit.pin}
                onChange={(e) => setEdit({ ...edit, pin: e.target.value.replace(/\D/g, "").slice(0, 8) })}
              />
            </label>
            {edit.role === "dentist" ? (
              <label>
                เป็นทันตแพทย์
                <select className="form-control" value={edit.dentistSlug} onChange={(e) => setEdit({ ...edit, dentistSlug: e.target.value })}>
                  <option value="">—</option>
                  {dentists.map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.text.th.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="check">
              <input type="checkbox" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} />
              ใช้งานอยู่
            </label>
          </div>
          <p className="settings-help">
            เปิดได้: {ROLE_PERMS[edit.role].map((p: Perm) => PERM_LABEL[p]).join(" · ")}
          </p>
          {err ? <p className="ug-err">{err}</p> : null}
          <div className="settings-save">
            <button type="button" className="btn-secondary-staff" onClick={() => setEdit(null)}>
              ยกเลิก
            </button>
            <button type="button" className="btn-primary-staff" onClick={() => void save()}>
              บันทึก
            </button>
          </div>
        </section>
      ) : null}

      <section className="settings-card">
        <h3>บัญชีผู้ใช้</h3>
        {users.length === 0 ? <p className="cl-empty">ยังไม่มี</p> : null}
        {users.map((u) => (
          <div key={u.id} className={`sup-row ${u.isActive ? "" : "inactive"}`}>
            <strong>{u.name}</strong>
            <span>{ROLE_LABEL[u.role]}</span>
            <span className="muted">{u.dentistSlug ? dentists.find((d) => d.slug === u.dentistSlug)?.text.th.name : ""}</span>
            <span className="muted">{u.isActive ? "" : "ปิดใช้งาน"}</span>
            <button
              type="button"
              className="btn-secondary-staff"
              onClick={() => {
                setErr("");
                setEdit({ id: u.id, name: u.name, role: u.role, pin: "", dentistSlug: u.dentistSlug ?? "", isActive: u.isActive });
              }}
            >
              แก้ไข
            </button>
          </div>
        ))}
      </section>

      <section className="settings-card">
        <h3>สิทธิ์ตามตำแหน่ง</h3>
        <div className="perm-grid">
          <span />
          {ROLES.map((r) => (
            <strong key={r}>{ROLE_LABEL[r]}</strong>
          ))}
          {(Object.keys(PERM_LABEL) as Perm[]).map((p) => (
            <React.Fragment key={p}>
              <span>{PERM_LABEL[p]}</span>
              {ROLES.map((r) => (
                <span key={r} className={ROLE_PERMS[r].includes(p) ? "yes" : "no"}>
                  {ROLE_PERMS[r].includes(p) ? "✓" : "—"}
                </span>
              ))}
            </React.Fragment>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <h3>ประวัติการใช้งาน</h3>
        {log.length === 0 ? <p className="cl-empty">ยังไม่มี</p> : null}
        {log.map((l) => (
          <div key={l.id} className="oh-row audit-row">
            <span className="oh-date">{new Date(l.at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</span>
            <strong>{l.userName || "—"}</strong>
            <span>{l.action}</span>
            <span className="muted">{l.detail}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
