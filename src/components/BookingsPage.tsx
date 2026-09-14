"use client";

import { useEffect, useState, useTransition } from "react";

import { dentistBySlug } from "@/data/dentists";
import type { IconKey } from "@/data/icons";
import { iconLibrary } from "@/data/icons";
import { useLang } from "@/i18n/lang";
import { fmtShort } from "@/lib/dates";
import { cancelBooking, myBookingsByLine } from "@/server/actions";
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
  status: "confirmed" | "arrived" | "in_chair" | "completed" | "cancelled" | "no_show";
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
          {a.status === "completed"
            ? t.bookingsPage.done
            : a.status === "no_show"
              ? t.bookingsPage.noshow
              : t.bookingsPage.cancelled}
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

  /* inside LINE the signed ID token names the account — the verified userId
     picks the guardian's bookings and the profile names the header. Outside
     LINE nothing changes: the phone-keyed `bookings` prop is the view. */
  const [lineRows, setLineRows] = useState<BookingView[] | null>(null);
  const [lineName, setLineName] = useState<string | null>(null);
  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) return;
    let cancelled = false;
    import("@line/liff")
      .then(async ({ default: liff }) => {
        await liff.init({ liffId });
        if (!liff.isLoggedIn()) return;
        const token = liff.getIDToken();
        const [profile, rows] = await Promise.all([
          liff.getProfile().catch(() => null),
          token ? myBookingsByLine(token) : null,
        ]);
        if (cancelled || !rows) return;
        setLineRows(
          rows.map((a) => ({
            ref: a.ref,
            date: a.date,
            time: a.time,
            treatmentKey: a.treatmentKey,
            dentistSlug: a.dentistSlug || null,
            status: a.status,
            childName: a.childName,
          })),
        );
        if (profile) setLineName(profile.displayName);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = lineRows ?? bookings;

  // the next visit: a live booking from today onwards — confirmed, checked in,
  // or in the chair right now all still belong on the slip
  const live = (s: BookingView["status"]) =>
    s === "confirmed" || s === "arrived" || s === "in_chair";
  const upcoming = shown
    .filter((b) => live(b.status) && b.date >= today)
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  const history = shown
    .filter((b) => !live(b.status) || b.date < today)
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
      {lineName ? <p className="hint" style={{ padding: "0 4px 8px" }}>LINE · {lineName}</p> : null}
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
