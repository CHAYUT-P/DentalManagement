"use client";

import { notices } from "@/data/appointments";
import { useLang } from "@/i18n/lang";
import { addDays, fmtShort } from "@/lib/dates";
import { Bell, Gift, Heart } from "./icons";
import { Lead, Screen } from "./screen";

/**
 * What the clinic has sent this patient. The real ones will arrive over LINE as
 * well; this page is the in-app copy of the same messages.
 */

const KIND_ICON = {
  reminder: <Bell size={17} />,
  promo: <Gift size={17} />,
  news: <Heart size={14} />,
};

export function NoticesPage({ today }: { today: string }) {
  const { t, lang } = useLang();
  return (
    <Screen title={t.notifications} back="/">
      <Lead>{t.notices.lead}</Lead>
      {notices.length === 0 ? (
        <p className="hint">{t.notices.empty}</p>
      ) : (
        <div className="notes">
          {notices.map((n) => (
            <article key={n.id} className={`note ${n.kind}${n.unread ? " new" : ""}`}>
              <span className="nIcon">{KIND_ICON[n.kind]}</span>
              <div className="nText">
                <div className="nTop">
                  <h2>{n.text[lang].title}</h2>
                  {n.unread ? <span className="nNew">{t.notices.unread}</span> : null}
                </div>
                <p className="nBody">{n.text[lang].body}</p>
                <span className="nWhen">{fmtShort(t, addDays(today, n.inDays))}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </Screen>
  );
}
