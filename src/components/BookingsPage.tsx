"use client";

import { useEffect, useState, useTransition } from "react";

import { dentistBySlug } from "@/data/dentists";
import type { IconKey } from "@/data/icons";
import { iconLibrary } from "@/data/icons";
import { useLang } from "@/i18n/lang";
import { fmtShort } from "@/lib/dates";
import { cancelBooking, myBookings, myBookingsByLine } from "@/server/actions";
import { Check, Cross } from "./icons";
import { EmptySlip, Eyebrow, Screen, Slip } from "./screen";
import { BookingsSkeleton } from "./PageLoading";
import { ServiceIcon } from "./serviceIcons";

/**
 * The patient's appointments: the next one as the slip itself, then the history
 * as ledger rows.
 *
 * Identity has exactly two doors — inside LINE the verified userId picks the
 * guardian's bookings; outside LINE the visitor types the booking phone. There
 * is no third view: without one of those the page shows the phone gate, never
 * somebody else's rows.
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
  /** the booking's contact phone — cancelBooking requires it alongside the ref */
  phone: string;
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

function toView(a: Awaited<ReturnType<typeof myBookings>>[number]): BookingView {
  return {
    ref: a.ref,
    date: a.date,
    time: a.time,
    treatmentKey: a.treatmentKey,
    dentistSlug: a.dentistSlug || null,
    status: a.status,
    childName: a.childName,
    phone: a.phone,
  };
}

export function BookingsPage({ today }: { today: string }) {
  const { t } = useLang();
  const [pending, start] = useTransition();

  /* inside LINE the signed ID token names the account — the verified userId
     picks the guardian's bookings and the profile names the header. Outside
     LINE the phone gate below is the only way in. While LIFF is still
     resolving a skeleton holds the space so nothing unverified renders. */
  const [lineRows, setLineRows] = useState<BookingView[] | null>(null);
  const [lineName, setLineName] = useState<string | null>(null);
  // no LIFF configured → nothing to wait for; the env var is build-time inlined
  const [linePending, setLinePending] = useState(() => !!process.env.NEXT_PUBLIC_LIFF_ID);
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
        setLineRows(rows.map(toView));
        if (profile) setLineName(profile.displayName);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLinePending(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* outside LINE: the phone gate — type the booking phone, get the rows */
  const [phoneRows, setPhoneRows] = useState<BookingView[] | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneErr, setPhoneErr] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);

  function lookupPhone() {
    const digits = phoneInput.replace(/\D/g, "");
    if (digits.length < 9) {
      setPhoneErr(true);
      return;
    }
    setPhoneBusy(true);
    myBookings(phoneInput)
      .then((rows) => {
        setPhoneRows(rows.map(toView));
        if (rows.length === 0) setPhoneErr(true);
      })
      .finally(() => setPhoneBusy(false));
  }

  const shown = lineRows ?? phoneRows;

  // the next visit: a live booking from today onwards — confirmed, checked in,
  // or in the chair right now all still belong on the slip
  const live = (s: BookingView["status"]) =>
    s === "confirmed" || s === "arrived" || s === "in_chair";
  const rows = shown ?? [];
  const upcoming = rows
    .filter((b) => live(b.status) && b.date >= today)
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  const history = rows
    .filter((b) => !live(b.status) || b.date < today)
    .sort((a, b) => (a.date + a.time > b.date + b.time ? -1 : 1));

  const next = upcoming[0];
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const cancelling = cancelTarget !== null && pending;

  function doCancel(a: BookingView) {
    setCancelTarget(a.ref);
    start(async () => {
      await cancelBooking(a.ref, a.phone);
      if (lineRows) setLineRows(lineRows.filter((r) => r.ref !== a.ref));
      if (phoneRows) setPhoneRows(phoneRows.filter((r) => r.ref !== a.ref));
      setCancelTarget(null);
    });
  }

  if (linePending) {
    // same shapes the route shell used — the topbar is real now, so the swap
    // from loading.tsx to here is only the chrome appearing, not a relayout
    return (
      <Screen title={t.nav.bookings} back="/">
        <BookingsSkeleton />
      </Screen>
    );
  }

  /* no verified identity and no phone entered — the gate is the whole view */
  if (shown === null) {
    return (
      <Screen title={t.nav.bookings} back="/">
        <Eyebrow>{t.bookingsPage.lookupSub}</Eyebrow>
        <div className="pick">
          <label className="fld">
            <span className="fk">{t.booking.contactTel}</span>
            <input
              className="fi"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t.booking.contactTelPh}
              value={phoneInput}
              onChange={(e) => {
                setPhoneInput(e.target.value);
                setPhoneErr(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") lookupPhone();
              }}
            />
          </label>
          {phoneErr ? <p className="err">{t.bookingsPage.notFound}</p> : null}
          <button type="button" className="cta" disabled={phoneBusy} onClick={lookupPhone}>
            {phoneBusy ? "…" : t.bookingsPage.lookupBtn}
          </button>
        </div>
      </Screen>
    );
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
              onClick={() => doCancel(next)}
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
