"use client";

import Link from "next/link";

import type { TreatmentKey } from "@/lib/treatments";
import { useTreatments } from "@/lib/treatmentsContext";
import { dentistBySlug } from "@/data/dentists";
import { useLang, useT } from "@/i18n/lang";
import { dayOfMonth, fmtLong, monthKey, weekday } from "@/lib/dates";
import { Check, ChevronLeft, Cross } from "@/components/shared/icons";
import { LangSwitch } from "@/components/patient/parts";
import { Toaster } from "@/components/patient/mock";

/**
 * Chrome shared by every page that is not the home screen: the same phone-width
 * frame, a back bar instead of the clinic header, and the two surfaces the design
 * allows — `Panel` (a flat card with a hairline border) and `Ledger` (hairline
 * separated rows sitting straight on the app surface under an `Eyebrow`).
 *
 * The appointment slip is the one raised surface in the app, so it lives here
 * too, as `Slip`: one component used by the booking confirmation and by the
 * bookings list, which is what keeps the appointment record looking like a
 * single object across the app.
 */

export function TopBar({ title, back }: { title: string; back: string }) {
  const t = useT();
  return (
    <header className="topbar">
      <Link href={back} className="backBtn" aria-label={t.nav.back}>
        <ChevronLeft />
      </Link>
      <h1>{title}</h1>
      <LangSwitch />
    </header>
  );
}

export function Screen({
  title,
  back = "/",
  children,
  foot,
}: {
  title: string;
  back?: string;
  children: React.ReactNode;
  foot?: React.ReactNode;
}) {
  return (
    <div className="shell">
      <main className="app">
        <TopBar title={title} back={back} />
        <div className="body">{children}</div>
        {foot}
      </main>
      <Toaster />
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={className ? `panel ${className}` : "panel"}>{children}</section>;
}

export function Lead({ children }: { children: React.ReactNode }) {
  return <p className="lead">{children}</p>;
}

export function Ledger({ children }: { children: React.ReactNode }) {
  return <div className="ledger">{children}</div>;
}

export function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="row">
      <span className="rk">{k}</span>
      <span className="rv">{v}</span>
    </div>
  );
}

/** the rose primary action, as a link */
export function Cta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="cta">
      {children}
    </Link>
  );
}

/** the quiet secondary action, as a link */
export function Ghost({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="ghost">
      {children}
    </Link>
  );
}

export type SlipData = {
  ref: string;
  dateISO: string;
  time: string;
  treatment: TreatmentKey;
  /** dentist slug, or null for "any dentist" */
  dentist: string | null;
  status: "confirmed" | "done" | "cancelled";
};

/**
 * The appointment record. Perforated paper: a torn edge across the middle with a
 * notch punched out of each side, the details as a ledger below it, and the
 * booking reference in the inked rose stamp.
 */
export function Slip({ appt, patient }: { appt: SlipData; patient: string }) {
  const { t, lang } = useLang();
  const tr = useTreatments();
  const d = appt.dentist ? dentistBySlug(appt.dentist) : undefined;
  const state =
    appt.status === "confirmed"
      ? { cls: "ok", label: t.slip.confirmed }
      : appt.status === "done"
        ? { cls: "done", label: t.bookingsPage.done }
        : { cls: "off", label: t.bookingsPage.cancelled };
  return (
    <article className={`slip ${appt.status}`}>
      <div className="slipHead">
        <span className="eyebrow">{t.slip.eyebrow}</span>
        <span className={`tag ${state.cls}`}>
          {appt.status === "cancelled" ? <Cross size={11} /> : <Check size={11} />}
          {state.label}
        </span>
      </div>

      <div className="slipDate">
        <span className="dd">{dayOfMonth(appt.dateISO)}</span>
        <span className="dm">
          <span className="mo">{t.month[monthKey(appt.dateISO)]}</span>
          <span className="wd">
            {t.weekdayLong[weekday(appt.dateISO)]} · {appt.time}
          </span>
        </span>
      </div>

      <div className="perf-line">
        <span className="perf-notch l" />
        <span className="perf-notch r" />
      </div>

      <Ledger>
        <Row k={t.slip.patient} v={<span className="child">{patient}</span>} />
        <Row k={t.slip.treatment} v={tr.name(appt.treatment, lang)} />
        <Row k={t.slip.dentist} v={d ? d.text[lang].name : t.booking.anyone} />
        <Row k={t.slip.when} v={`${fmtLong(t, appt.dateISO, lang)} · ${appt.time}`} />
        <Row k={t.slip.where} v={t.clinic.address} />
      </Ledger>

      <div className="slipFoot">
        <span className="stamp">
          <span className="stampK">{t.slip.ref}</span>
          <span className="stampV">{appt.ref}</span>
        </span>
        <p className="slipNote">{t.slip.note}</p>
      </div>
    </article>
  );
}

/** the same paper with nothing on it: the home and bookings empty state */
export function EmptySlip() {
  const t = useT();
  return (
    <article className="slip blank">
      <div className="slipHead">
        <span className="eyebrow">{t.slip.eyebrow}</span>
      </div>
      <div className="slipEmpty">
        <p className="se1">{t.slip.empty}</p>
        <p className="se2">{t.slip.emptySub}</p>
      </div>
      <div className="perf-line">
        <span className="perf-notch l" />
        <span className="perf-notch r" />
      </div>
      <div className="slipFoot">
        <Cta href="/book">{t.book}</Cta>
      </div>
    </article>
  );
}
