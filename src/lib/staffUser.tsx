"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { staffPunch, staffSignIn, staffSignOut, staffWhoAmI } from "@/server/actions";
import { ROLE_LABEL, can as roleCan, initial, type Perm, type StaffUserInfo, type WhoAmI } from "@/lib/roles";
import { useStaff } from "@/lib/staffStore";

interface StaffUserContextType {
  /** null in the queue edition, or before anyone signs in */
  user: StaffUserInfo | null;
  /** accounts exist — the app asks who you are */
  accounts: boolean;
  can: (perm: Perm) => boolean;
  /** lock this PC: back to the "who are you" screen */
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<StaffUserContextType>({
  user: null,
  accounts: false,
  can: () => true,
  signOut: async () => {},
  refresh: async () => {},
});

export const useStaffUser = () => useContext(Ctx);

/**
 * Who is using this PC (full edition). With staff accounts set up, the app
 * opens on a "who are you" screen; the signed-in person's role decides which
 * menus show (the server checks the same rules). No accounts = open, as
 * before. The queue edition never asks.
 */
export function StaffUserGate({ children }: { children: React.ReactNode }) {
  const { edition } = useStaff();
  const [who, setWho] = useState<WhoAmI | null>(null);

  const refresh = useCallback(async () => {
    setWho(await staffWhoAmI());
  }, []);

  useEffect(() => {
    if (edition !== "full") return;
    let live = true;
    staffWhoAmI()
      .then((w) => live && setWho(w))
      .catch(() => live && setWho({ user: null, accounts: false, users: [] }));
    return () => {
      live = false;
    };
  }, [edition]);

  const signOut = useCallback(async () => {
    await staffSignOut();
    await refresh();
  }, [refresh]);

  if (edition !== "full") return <>{children}</>;
  if (!who) return <div className="user-gate-wait">กำลังเปิด…</div>;

  const value: StaffUserContextType = {
    user: who.user,
    accounts: who.accounts,
    can: (perm) => !who.accounts || roleCan(who.user?.role, perm),
    signOut,
    refresh,
  };

  if (who.accounts && !who.user) return <SignInScreen who={who} onDone={refresh} />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function SignInScreen({ who, onDone }: { who: WhoAmI; onDone: () => Promise<void> }) {
  const [picked, setPicked] = useState<StaffUserInfo | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [punched, setPunched] = useState("");

  const punch = async () => {
    if (!picked || !pin) return;
    setBusy(true);
    const r = await staffPunch(picked.id, pin).catch(() => ({ ok: false }) as { ok: boolean; action?: string; at?: string });
    setBusy(false);
    setPin("");
    if (!r.ok) return setErr(true);
    const t = r.at ? new Date(r.at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "";
    setPunched(`${picked.name} ${r.action === "in" ? "ลงเวลาเข้างาน" : "ลงเวลาออกงาน"} ${t} น.`);
    setPicked(null);
  };

  const go = async () => {
    if (!picked || !pin) return;
    setBusy(true);
    const r = await staffSignIn(picked.id, pin).catch(() => ({ ok: false }));
    setBusy(false);
    if (r.ok) {
      setPin("");
      await onDone();
    } else {
      setErr(true);
      setPin("");
    }
  };

  return (
    <div className="user-gate">
      <div className="user-gate-card">
        <h1>ใครกำลังใช้งาน?</h1>
        {punched ? <p className="ok-note">{punched}</p> : null}
        {!picked ? (
          <div className="user-gate-list">
            {who.users.map((u) => (
              <button key={u.id} type="button" className="user-gate-who" onClick={() => setPicked(u)}>
                <span className="ug-avatar">{initial(u.name)}</span>
                <span>
                  <strong>{u.name}</strong>
                  <em>{ROLE_LABEL[u.role]}</em>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <form
            className="user-gate-pin"
            onSubmit={(e) => {
              e.preventDefault();
              void go();
            }}
          >
            <p>
              <strong>{picked.name}</strong> — ใส่รหัส PIN ของคุณ
            </p>
            <input
              className="form-control"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              aria-label="รหัส PIN"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 8));
                setErr(false);
              }}
            />
            {err ? <span className="ug-err">รหัสไม่ถูกต้อง</span> : null}
            <div className="ug-actions">
              <button type="button" className="btn-secondary-staff" onClick={() => setPicked(null)}>
                เปลี่ยนคน
              </button>
              <span className="plan-actions">
                <button type="button" className="btn-secondary-staff" disabled={busy || pin.length < 4} onClick={() => void punch()}>
                  ลงเวลาเข้า/ออกงาน
                </button>
                <button type="submit" className="btn-primary-staff" disabled={busy || pin.length < 4}>
                  เข้าใช้งาน
                </button>
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/** what a screen shows when the signed-in role may not open it */
export function NoAccess({ what }: { what: string }) {
  return (
    <div className="staff-container">
      <div className="staff-empty" style={{ padding: "60px 20px", textAlign: "center" }}>
        บัญชีนี้ไม่มีสิทธิ์เปิด{what} — ติดต่อเจ้าของคลินิก
      </div>
    </div>
  );
}

/** ลงเวลาเข้า/ออกงาน from the top bar — anyone, with their own PIN */
export function ClockButton() {
  const { accounts } = useStaffUser();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<StaffUserInfo[]>([]);
  const [picked, setPicked] = useState<StaffUserInfo | null>(null);
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  if (!accounts) return null;

  const show = async () => {
    setOpen(true);
    setPicked(null);
    setMsg("");
    setUsers((await staffWhoAmI()).users);
  };
  const punch = async () => {
    if (!picked) return;
    const r = await staffPunch(picked.id, pin).catch(() => ({ ok: false }) as { ok: boolean; action?: string; at?: string });
    setPin("");
    if (!r.ok) return setMsg("รหัสไม่ถูกต้อง");
    const t = r.at ? new Date(r.at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "";
    setMsg(`${picked.name} ${r.action === "in" ? "ลงเวลาเข้างาน" : "ลงเวลาออกงาน"} ${t} น. แล้ว`);
    setPicked(null);
  };

  return (
    <>
      <button type="button" className="btn-secondary-staff btn-lg" onClick={() => void show()}>
        ลงเวลา
      </button>
      {open ? (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>ลงเวลาเข้า / ออกงาน</h3>
            </div>
            <div className="modal-body sign-body">
              {msg ? <p className={msg.includes("ไม่ถูกต้อง") ? "ug-err" : "ok-note"}>{msg}</p> : null}
              {!picked ? (
                <div className="user-gate-list">
                  {users.map((u) => (
                    <button key={u.id} type="button" className="user-gate-who" onClick={() => setPicked(u)}>
                      <span className="ug-avatar">{initial(u.name)}</span>
                      <span>
                        <strong>{u.name}</strong>
                        <em>{ROLE_LABEL[u.role]}</em>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <form
                  className="user-gate-pin"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void punch();
                  }}
                >
                  <p>
                    <strong>{picked.name}</strong> — ใส่รหัส PIN
                  </p>
                  <input
                    className="form-control"
                    type="password"
                    inputMode="numeric"
                    autoFocus
                    aria-label="รหัส PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  />
                  <div className="ug-actions">
                    <button type="button" className="btn-secondary-staff" onClick={() => setPicked(null)}>
                      เปลี่ยนคน
                    </button>
                    <button type="submit" className="btn-primary-staff" disabled={pin.length < 4}>
                      ลงเวลา
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
