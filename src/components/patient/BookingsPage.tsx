"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { dentistBySlug } from "@/data/dentists";
import type { TreatmentKey } from "@/lib/treatments";
import { useTreatments } from "@/lib/treatmentsContext";
import { useLang } from "@/i18n/lang";
import { fmtShort } from "@/lib/dates";
import { cancelBooking, myBookings, myBookingsByLine } from "@/server/actions";
import { RESCHEDULE_KEY, type RescheduleHandoff } from "@/components/patient/BookingFlow";
import { Check, Cross } from "@/components/shared/icons";
import { EmptySlip, Eyebrow, Screen, Slip } from "@/components/patient/screen";
import { BookingsSkeleton } from "@/components/patient/PageLoading";
import { ServiceIcon } from "@/components/shared/serviceIcons";

/**
 * The patient's appointments: the next one as the slip itself, then the history
 * as ledger rows.
 *
 * Identity has exactly two doors — inside LINE the verified userId picks the
 * guardian's bookings; outside LINE the visitor types the booking phone. There
 * is no third view: without one of those the page shows the phone gate, never
 * somebody else's rows.
 *
 * Cancel marks the appointment cancelled in the DB (staff see it immediately).
 * Postpone hands the booking to the flow at `/book?r=` — same row, same ref,
 * new date/time — so the family never ends up holding two bookings.
 */

export interface BookingView {
  ref: string;
  date: string;
  time: string;
  treatmentKey: TreatmentKey;
  dentistSlug: string | null;
  status: "confirmed" | "arrived" | "in_chair" | "completed" | "cancelled" | "no_show";
  childName: string;
  /** the booking's contact phone — cancelBooking requires it alongside the ref */
  phone: string;
}

function PastRow({ a }: { a: BookingView }) {
  const { t, lang } = useLang();
  const tr = useTreatments();
  const d = a.dentistSlug ? dentistBySlug(a.dentistSlug) : undefined;
  return (
    <div className={`histRow ${a.status}`}>
      <span className={`disc t-${tr.tint(a.treatmentKey)}`}>
        <ServiceIcon k={tr.icon(a.treatmentKey)} size={25} />
      </span>
      <span className="hText">
        <span className="hn">{tr.name(a.treatmentKey, lang)}</span>
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
    // outside LINE liff.init() has been seen to never settle — give up after a
    // few seconds so the phone gate appears instead of an endless skeleton
    const giveUp = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("liff timeout")), 4000));
    import("@line/liff")
      .then(async ({ default: liff }) => {
        await Promise.race([liff.init({ liffId }), giveUp]);
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

  const router = useRouter();
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const cancelling = cancelTarget !== null && pending;

  /** the phone proves ownership, so it rides in sessionStorage, not the URL */
  function doPostpone(a: BookingView) {
    const handoff: RescheduleHandoff = {
      ref: a.ref,
      phone: a.phone,
      date: a.date,
      time: a.time,
      childName: a.childName,
    };
    try {
      sessionStorage.setItem(RESCHEDULE_KEY, JSON.stringify(handoff));
    } catch {
      // storage blocked — the flow asks for the phone instead
    }
    const q = new URLSearchParams({ r: a.ref, t: a.treatmentKey });
    if (a.dentistSlug) q.set("d", a.dentistSlug);
    router.push(`/book?${q.toString()}`);
  }

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
      {upcoming.length > 0 ? (
        upcoming.map((a) => (
          <div key={a.ref} className="upNext">
            <Slip
              appt={{
                ref: a.ref,
                dateISO: a.date,
                time: a.time,
                treatment: a.treatmentKey,
                dentist: a.dentistSlug,
                status: "confirmed",
              }}
              patient={a.childName}
            />
            {/* only a booking nobody has checked in yet can move or be cancelled */}
            {a.status === "confirmed" ? (
              <div className="twoBtn">
                <button type="button" className="softBtn" onClick={() => doPostpone(a)}>
                  {t.bookingsPage.reschedule}
                </button>
                <button
                  type="button"
                  className="softBtn danger"
                  disabled={cancelling && cancelTarget === a.ref}
                  onClick={() => doCancel(a)}
                >
                  {cancelling && cancelTarget === a.ref ? "…" : t.bookingsPage.cancelBooking}
                </button>
              </div>
            ) : null}
          </div>
        ))
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
