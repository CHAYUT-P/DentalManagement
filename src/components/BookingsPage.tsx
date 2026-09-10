"use client";

import { useState, useTransition } from "react";

import { dentistBySlug } from "@/data/dentists";
import type { IconKey } from "@/data/icons";
import { iconLibrary } from "@/data/icons";
import { useLang } from "@/i18n/lang";
import { fmtShort } from "@/lib/dates";
import { cancelBooking } from "@/server/actions";
import { Check, Cross } from "./icons";
import { EmptySlip, Eyebrow, Screen, Slip } from "./screen";
import { ServiceIcon } from "./serviceIcons";

/**
 * The patient's appointments: the next one as the slip itself, then the history
 * as ledger rows. Everything comes from Postgres through the `bookings`
 * prop — the server matched them to this phone number.
 *
 * Cancel marks the appointment cancelled in the DB (staff see it immediately);
 * reschedule simply deep-links into the booking flow pre-filled.
 */

export interface BookingView {
  ref: string;
  date: string;
  time: string;
  treatmentKey: IconKey;
  dentistSlug: string | null;
  status: "confirmed" | "completed" | "cancelled";
  childName: string;
}

const TINT = new Map(iconLibrary.map((e) => [e.key, e.tint] as const));

function PastRow({ a }: { a: BookingView }) {
  const { t, lang } = useLang();
  const d = a.dentistSlug ? dentistBySlug(a.dentistSlug) : undefined;
  return (
    <div className={`histRow ${a.status}`}>
      <span className={`disc t-${TINT.get(a.treatmentKey) ?? "lav"}`}>
        <ServiceIcon k={a.treatmentKey} size={20} />
      </span>
      <span className="hText">
        <span className="hn">{t.service[a.treatmentKey]}</span>
        <span className="hm">
          {fmtShort(t, a.date)} · {a.time} · {d ? d.text[lang].name : t.booking.anyone}
        </span>
      </span>
      <span className="hSide">
        <span className={`tag ${a.status === "completed" ? "done" : "off"}`}>
          {a.status === "completed" ? <Check size={10} /> : <Cross size={10} />}
          {a.status === "completed" ? t.bookingsPage.done : t.bookingsPage.cancelled}
        </span>
        {a.status === "cancelled" ? null : (
          <a
            href={`/book?t=${a.treatmentKey}${a.dentistSlug ? `&d=${a.dentistSlug}` : ""}`}
            className="againBtn"
          >
            {t.bookingsPage.bookAgain}
          </a>
        )}
      </span>
    </div>
  );
}

export function BookingsPage({ today, bookings }: { today: string; bookings: BookingView[] }) {
  const { t } = useLang();
  const [pending, start] = useTransition();

  // the next visit: first confirmed appointment from today onwards
  const upcoming = bookings
    .filter((b) => b.status === "confirmed" && b.date >= today)
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  const history = bookings
    .filter((b) => b.status !== "confirmed" || b.date < today)
    .sort((a, b) => (a.date + a.time > b.date + b.time ? -1 : 1));

  const next = upcoming[0];
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const cancelling = cancelTarget !== null && pending;

  function doCancel(ref: string) {
    setCancelTarget(ref);
    start(async () => {
      await cancelBooking(ref);
      setCancelTarget(null);
    });
  }

  return (
    <Screen title={t.nav.bookings} back="/">
      <Eyebrow>{t.bookingsPage.upcoming}</Eyebrow>
      {next ? (
        <>
          <Slip
            appt={{
              ref: next.ref,
              dateISO: next.date,
              time: next.time,
              treatment: next.treatmentKey,
              dentist: next.dentistSlug,
              status: "confirmed",
            }}
            patient={next.childName}
          />
          <div className="twoBtn">
            <a href={`/book?t=${next.treatmentKey}${next.dentistSlug ? `&d=${next.dentistSlug}` : ""}`} className="softBtn">
              {t.bookingsPage.reschedule}
            </a>
            <button
              type="button"
              className="softBtn danger"
              disabled={cancelling}
              onClick={() => doCancel(next.ref)}
            >
              {cancelling ? "…" : t.bookingsPage.cancelBooking}
            </button>
          </div>
        </>
      ) : (
        <EmptySlip />
      )}

      <Eyebrow>{t.bookingsPage.past}</Eyebrow>
      <div className="hist">
        {history.map((a) => (
          <PastRow key={a.ref} a={a} />
        ))}
        {history.length === 0 ? <p className="hint" style={{ padding: 12 }}>{t.notices.empty}</p> : null}
      </div>
    </Screen>
  );
}
