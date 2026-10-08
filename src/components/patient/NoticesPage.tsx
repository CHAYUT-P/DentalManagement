"use client";

import { useEffect, useState } from "react";

import { useLang } from "@/i18n/lang";
import { fmtShort } from "@/lib/dates";
import { useLine } from "@/lib/useLine";
import { myMessagesByLine } from "@/server/actions";
import { Bell } from "@/components/shared/icons";
import { Lead, LineSignIn, Screen } from "@/components/patient/screen";
import { BookingsSkeleton } from "@/components/patient/PageLoading";

/**
 * What the clinic has sent this family on LINE — booking confirmations,
 * reminders, and messages the desk typed in the staff app. Every outgoing
 * LINE message is kept (line_message), so this page is simply the family's
 * copy of their own chat with the clinic, newest first. Broadcasts sent from
 * LINE Official Account Manager don't pass through here.
 */

type Msg = NonNullable<Awaited<ReturnType<typeof myMessagesByLine>>>[number];

/** "2026-10-08T10:15:00Z" → the Bangkok calendar day and HH:MM */
function bangkok(iso: string): { date: string; time: string } {
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
}

export function NoticesPage() {
  const { t } = useLang();
  const line = useLine();
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (line.status !== "in") return;
    let cancelled = false;
    myMessagesByLine(line.token)
      .then((r) => {
        if (cancelled) return;
        if (r) setMsgs(r);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [line.status, line.token]);

  return (
    <Screen title={t.notifications} back="/">
      <Lead>{t.notices.lead}</Lead>
      {line.status === "out" || failed ? (
        <>
          {failed ? <p className="err">{t.line.failed}</p> : null}
          <LineSignIn onLogin={line.login} />
        </>
      ) : msgs === null ? (
        <BookingsSkeleton />
      ) : msgs.length === 0 ? (
        <p className="hint">{t.notices.empty}</p>
      ) : (
        <div className="notes">
          {msgs.map((m) => {
            const when = bangkok(m.at);
            return (
              <article key={m.id} className="note reminder">
                <span className="nIcon">
                  <Bell size={17} />
                </span>
                <div className="nText">
                  <p className="nBody" style={{ whiteSpace: "pre-line" }}>
                    {m.text}
                  </p>
                  <span className="nWhen">
                    {fmtShort(t, when.date)} · {when.time}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Screen>
  );
}
