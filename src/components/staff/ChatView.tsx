"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { staffChatSend, staffChatThread, staffChats } from "@/server/actions";
import type { ChatConversation, ChatMessage } from "@/server/chat";
import { useStaff } from "@/lib/staffStore";
import { NoAccess, useStaffUser } from "@/lib/staffUser";
import { EditionNotice } from "./DeviceGate";
import { PatientFileButton } from "./PatientFileView";
import { IconSearch } from "./staffIcons";

/** answers the desk gives all day — one tap fills the box, then edit and send */
const QUICK = [
  "สวัสดีค่ะ ได้รับข้อความแล้วนะคะ เดี๋ยวเจ้าหน้าที่ตอบกลับค่ะ",
  "ยืนยันนัดหมายเรียบร้อยค่ะ แล้วพบกันนะคะ",
  "จองคิวได้ที่เมนู “จองนัด” ด้านล่างได้เลยค่ะ",
  "คลินิกเปิดทุกวัน กรุณาดูเวลาทำการในเมนู “คลินิก” ค่ะ",
  "ขอบคุณค่ะ 🙏",
];

const time = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
};

/**
 * แชท LINE (full edition) — what families write to the clinic's LINE OA,
 * answered from the app. Each conversation shows who the family is in the
 * clinic's records, with their patient file one tap away.
 */
export function ChatView() {
  const { edition, refresh, showToast } = useStaff();
  const allowed = useStaffUser().can("chat");
  const [list, setList] = useState<ChatConversation[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => setList(await staffChats()), []);

  useEffect(() => {
    let live = true;
    const tick = () =>
      staffChats()
        .then((l) => live && setList(l))
        .catch(() => {});
    void tick();
    const t = setInterval(() => void tick(), 10_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  // the open thread refreshes often; opening it marks it read
  useEffect(() => {
    if (!open) return;
    let live = true;
    const tick = () =>
      staffChatThread(open)
        .then((m) => {
          if (!live) return;
          setThread(m);
          refresh();
        })
        .catch(() => {});
    void tick();
    const t = setInterval(() => void tick(), 5_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [open, refresh]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [thread.length, open]);

  const shown = useMemo(
    () =>
      (list ?? []).filter((c) => {
        const s = q.trim().toLowerCase();
        return !s || c.displayName.toLowerCase().includes(s) || c.patients.some((p) => p.name.toLowerCase().includes(s) || p.phone.includes(s));
      }),
    [list, q],
  );

  if (edition !== "full") return <EditionNotice feature="แชท LINE" />;
  if (!allowed) return <NoAccess what="แชท LINE" />;

  const current = list?.find((c) => c.lineUserId === open) ?? null;

  const send = async () => {
    if (!open || !text.trim()) return;
    setSending(true);
    const r = await staffChatSend(open, text).catch(() => "failed" as const);
    setSending(false);
    if (r === "sent") {
      setText("");
      setThread(await staffChatThread(open));
      void loadList();
    } else showToast(r === "not_configured" ? "ยังไม่ได้ตั้งค่า LINE OA บนเซิร์ฟเวอร์" : "ส่งไม่สำเร็จ — ลองอีกครั้ง");
  };

  return (
    <div className="staff-container chat">
      <aside className="chat-list">
        <div className="staff-search-box">
          <IconSearch size={15} color="var(--staff-ink-muted)" />
          <input type="search" aria-label="ค้นหาแชท" placeholder="ค้นหาชื่อ / เบอร์" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {list === null ? <p className="cl-empty">กำลังโหลด…</p> : null}
        {list?.length === 0 ? (
          <p className="cl-empty">ยังไม่มีข้อความ — เมื่อผู้ปกครองทักมาทาง LINE ของคลินิก จะขึ้นที่นี่</p>
        ) : null}
        {shown.map((c) => (
          <button key={c.lineUserId} type="button" className={`chat-item ${open === c.lineUserId ? "active" : ""}`} onClick={() => setOpen(c.lineUserId)}>
            <Avatar c={c} />
            <span className="ci-text">
              <span className="ci-top">
                <strong>{c.displayName}</strong>
                <em>{time(c.lastAt)}</em>
              </span>
              {c.patients.length ? <span className="ci-who">{c.patients.map((p) => p.name).join(", ")}</span> : null}
              <span className={`ci-last ${c.unread ? "unread" : ""}`}>
                {c.lastDirection === "out" ? "คลินิก: " : ""}
                {c.lastText}
              </span>
            </span>
            {c.unread ? <span className="ci-badge">{c.unread}</span> : null}
          </button>
        ))}
      </aside>

      <section className="chat-thread">
        {current ? (
          <>
            <header className="chat-head">
              <Avatar c={current} />
              <div>
                <strong>{current.displayName}</strong>
                <span className="muted">
                  {current.patients.length ? current.patients.map((p) => `${p.name} · ${p.phone}`).join(" / ") : "ยังไม่ได้จองผ่าน LINE — ยังไม่รู้ว่าเป็นคนไข้คนไหน"}
                </span>
              </div>
              <div className="chat-head-actions">
                {current.patients.slice(0, 2).map((p) => (
                  <PatientFileButton key={`${p.phone}${p.name}`} childId={p.childId} phone={p.phone} name={p.name} label={`แฟ้ม ${p.name}`} />
                ))}
              </div>
            </header>
            <div className="chat-msgs">
              {thread.map((m, i) => {
                const day = new Date(m.at).toDateString();
                const newDay = i === 0 || new Date(thread[i - 1].at).toDateString() !== day;
                return (
                  <React.Fragment key={m.id}>
                    {newDay ? (
                      <div className="chat-day">
                        {new Date(m.at).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}
                      </div>
                    ) : null}
                    <div className={`bubble ${m.direction}`}>
                      <span>{m.text}</span>
                      <em>
                        {m.direction === "out" ? `${m.staffName || "คลินิก"} · ` : ""}
                        {new Date(m.at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                      </em>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={end} />
            </div>
            <footer className="chat-compose">
              <div className="chat-quick">
                {QUICK.map((qq) => (
                  <button key={qq} type="button" onClick={() => setText(qq)}>
                    {qq.length > 26 ? `${qq.slice(0, 26)}…` : qq}
                  </button>
                ))}
              </div>
              <div className="chat-input">
                <textarea
                  className="form-control"
                  rows={2}
                  aria-label="พิมพ์ข้อความ"
                  placeholder="พิมพ์ข้อความ… (Enter = ส่ง, Shift+Enter = ขึ้นบรรทัดใหม่)"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <button type="button" className="btn-primary-staff btn-lg" disabled={sending || !text.trim()} onClick={() => void send()}>
                  {sending ? "กำลังส่ง…" : "ส่ง"}
                </button>
              </div>
              <p className="chat-note">ข้อความที่ส่งจากแอปนับรวมในโควตาข้อความ LINE OA ต่อเดือน</p>
            </footer>
          </>
        ) : (
          <div className="cashier-empty">
            <strong>เลือกแชททางซ้าย</strong>
            <span>ข้อความจากผู้ปกครองทาง LINE ของคลินิกจะขึ้นที่นี่ ตอบกลับได้เลย พร้อมเปิดแฟ้มคนไข้ได้ในคลิกเดียว</span>
          </div>
        )}
      </section>
    </div>
  );
}

function Avatar({ c }: { c: ChatConversation }) {
  return c.pictureUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="chat-avatar" src={c.pictureUrl} alt="" />
  ) : (
    <span className="chat-avatar">{c.displayName.slice(0, 1)}</span>
  );
}
