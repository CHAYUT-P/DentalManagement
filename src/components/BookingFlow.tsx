"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { Dentist } from "@/data/dentists";
import { iconGroups, iconLibrary, type IconKey } from "@/data/icons";
import { patient } from "@/data/appointments";
import { useLang, useT } from "@/i18n/lang";
import {
  addDays,
  addMonths,
  dayOfMonth,
  daysInMonth,
  fmtRelative,
  minutesOf,
  monthKey,
  monthStart,
  weekday,
  weekdayIndex,
  yearOf,
} from "@/lib/dates";
import { dentistsForUI } from "@/lib/convert";
import { bookAppointment, familyByPhone, holdSlot, releaseSlotHold } from "@/server/actions";
import type { SlotRow } from "@/server/queries";
import { Check, Chevron, ChevronLeft } from "./icons";
import { Mascot } from "./Mascot";
import { DentistAvatar } from "./portrait";
import { Cta, Eyebrow, Ghost, Screen, Slip } from "./screen";
import { ServiceIcon } from "./serviceIcons";

/**
 * Treatment → dentist → day and time → contact → who is coming → booked.
 *
 * Everything the flow shows is decided by the database: the dentist roster, the
 * weekly open days, holidays and — the part that makes it real — which slots
 * are taken. A slot is taken when an appointment exists in Postgres; the same
 * `slotsForDate` definition feeds the staff schedule, so the two UIs can never
 * disagree. Confirming calls the `bookAppointment` server action, which inserts
 * the row; the unique index (dentist_id, date, time) is the double-booking guard.
 *
 * No date here comes from the browser: `today`/`nowMin` arrive from the server
 * (pinned to Bangkok), so the server render and the hydrated render agree.
 */

type Step = 1 | 2 | 3 | 4 | 5 | 6;

/** how far ahead the calendar lets a family pick */
const WINDOW_DAYS = 14;

/** the clinic wants an hour's notice, so today's next slot is an hour out */
const LEAD = 60;

/** the calendar's columns, Sunday-first like a wall calendar */
const WEEK_ORDER = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/* ═══════════════════════════════ props ═══════════════════════════════════ */

export interface BookingDayData {
  iso: string;
  closed: boolean;
  full: boolean;
}

export interface BookingFlowProps {
  today: string;
  nowMin: number;
  /** the DB roster — carries `id` (the appointment FK) plus the UI profile */
  dentists: (Dentist & { id: number })[];
  /** weekly open days from clinic_day */
  openDays: { day: string; isOpen: boolean }[];
  /** special closed dates from holiday */
  holidays: { start: string; end: string; name: string }[];
  /** per-date slot occupancy inside the booking window, keyed by YYYY-MM-DD */
  slots: Record<string, SlotRow[]>;
  /** chair load per date/time for "any dentist" mode: admits while live < chairs */
  load: Record<string, Record<string, { live: number; pool: number }>>;
  /** treatment chairs — one wall-clock slot holds this many live bookings */
  chairs: number;
  /** per-treatment price map for the compact price label */
  prices: Partial<Record<IconKey, number | null>>;
  /** the popular grid on step 1 — the ten home tiles */
  popular: IconKey[];
  preTreatment?: IconKey;
  preDentist?: string;
}

/* ═══════════════════════════ small shared rows ═══════════════════════════ */

function Stepper({ step, onBack }: { step: Step; onBack: (s: Step) => void }) {
  const t = useT();
  const labels = [t.booking.step1, t.booking.step2, t.booking.step3];
  return (
    <ol className="steps">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const done = step > n;
        return (
          <li key={label} className={done ? "done" : step === n ? "now" : ""}>
            <button type="button" onClick={() => (done ? onBack(n) : undefined)} disabled={!done}>
              <span className="sn">{done ? <Check size={12} /> : n}</span>
              <span className="sl">{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function TreatRow({ k, tint, onPick }: { k: IconKey; tint: string; onPick: (k: IconKey) => void }) {
  const t = useT();
  return (
    <button type="button" className="pickRow" onClick={() => onPick(k)}>
      <span className={`disc t-${tint}`}>
        <ServiceIcon k={k} size={21} />
      </span>
      <span className="pt">
        <span className="pn">{t.service[k]}</span>
      </span>
      <Chevron />
    </button>
  );
}

function DentistRow({ d, onPick }: { d: Dentist; onPick: (slug: string) => void }) {
  const { t, lang } = useLang();
  const x = d.text[lang];
  return (
    <button type="button" className="pickRow" onClick={() => onPick(d.slug)}>
      <DentistAvatar d={d} alt={x.name} size={44} />
      <span className="pt">
        <span className="pn">{x.name}</span>
        <span className="pp">
          {x.title} · {d.years} {t.common.years}
        </span>
      </span>
      <Chevron />
    </button>
  );
}

function SlotBank({
  label,
  times,
  time,
  onPick,
}: {
  label: string;
  times: string[];
  time: string | null;
  onPick: (hhmm: string) => void;
}) {
  return (
    <>
      <h3>{label}</h3>
      <div className="slots">
        {times.map((hhmm) => (
          <button
            key={hhmm}
            type="button"
            className={`slot${time === hhmm ? " on" : ""}`}
            onClick={() => onPick(hhmm)}
          >
            {hhmm}
          </button>
        ))}
      </div>
    </>
  );
}
/* ═══════════════════════════════ the day calendar ═══════════════════════ */

function DayCalendar({
  today,
  date,
  onPick,
  openDays,
  holidays,
  slots,
  dentist,
  capable,
  load,
  chairs,
}: {
  today: string;
  date: string | null;
  onPick: (iso: string) => void;
  openDays: { day: string; isOpen: boolean }[];
  holidays: { start: string; end: string; name: string }[];
  slots: Record<string, SlotRow[]>;
  /** null = "any dentist" (chair-load mode); a slug = that dentist's own grid */
  dentist: string | null;
  /** slugs able to do the picked treatment — bounds "any dentist" days */
  capable: Set<string>;
  load: Record<string, Record<string, { live: number; pool: number }>>;
  chairs: number;
}) {
  const { t, lang } = useLang();
  const lastDay = addDays(today, WINDOW_DAYS - 1);
  const firstMonth = monthStart(today);
  const lastMonth = monthStart(lastDay);
  const [view, setView] = useState(firstMonth);

  const closedWeekday = new Map(openDays.map((d) => [d.day, !d.isOpen]));
  const holidayOn = (iso: string) => holidays.find((h) => iso >= h.start && iso <= h.end)?.name;

  const cells: (string | null)[] = [];
  for (let i = 0; i < weekdayIndex(view); i++) cells.push(null);
  for (let d = 0; d < daysInMonth(view); d++) cells.push(addDays(view, d));

  return (
    <div className="cal">
      <div className="calHead">
        <button
          type="button"
          className="calNav"
          aria-label={t.booking.prevMonth}
          disabled={view <= firstMonth}
          onClick={() => setView(addMonths(view, -1))}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="calTitle">
          {t.month[monthKey(view)]} {yearOf(view) + (lang === "th" ? 543 : 0)}
        </span>
        <button
          type="button"
          className="calNav"
          aria-label={t.booking.nextMonth}
          disabled={view >= lastMonth}
          onClick={() => setView(addMonths(view, 1))}
        >
          <Chevron size={12} />
        </button>
      </div>

      <div className="calGrid">
        {WEEK_ORDER.map((w) => (
          <span key={w} className="calDow">
            {t.weekday[w]}
          </span>
        ))}
        {cells.map((iso, i) => {
          if (iso === null) return <span key={`pad${i}`} aria-hidden="true" />;
          const out = iso < today || iso > lastDay;
          const holidayName = holidayOn(iso);
          const closed = !out && (closedWeekday.get(weekday(iso)) === true || holidayName !== undefined);
          const daySlots = slots[iso] ?? [];
          const dayLoad = load[iso] ?? {};
          // "any dentist" still has to mean *capable* dentists: a specialist
          // treatment (one dentist takes it) must grey out that dentist's
          // days off, not light up every day anyone is in.
          const mine =
            dentist === null
              ? daySlots.filter((s) => s.dentistSlug !== null && capable.has(s.dentistSlug))
              : daySlots.filter((s) => s.dentistSlug === dentist);
          const off = !out && !closed && mine.length === 0;
          const full =
            !out && !closed && !off &&
            (dentist !== null
              ? mine.every((s) => s.taken)
              : [...new Set(mine.map((s) => s.time))].every(
                  (hhmm) => (dayLoad[hhmm]?.live ?? 0) >= chairs,
                ));
          return (
            <button
              key={iso}
              type="button"
              className={`calDay${iso === today ? " today" : ""}${date === iso ? " on" : ""}${
                closed ? " off" : ""
              }${off ? " off" : ""}${full ? " full" : ""}${out ? " out" : ""}`}
              disabled={out || closed || off || full}
              onClick={() => onPick(iso)}
              title={holidayName ?? undefined}
            >
              <span className="cdn">{dayOfMonth(iso)}</span>
              {closed ? <span className="cdt">{t.common.closedShort}</span> : null}
              {off ? <span className="cdt">{t.booking.dentistOff}</span> : null}
              {full ? <span className="cdt">{t.booking.full}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════ the flow itself ═════════════════════════ */

export function BookingFlow(props: BookingFlowProps) {
  const { today, nowMin, dentists, openDays, holidays, slots, load, chairs, prices, popular } = props;
  const { t, lang } = useLang();

  const [step, setStep] = useState<Step>(props.preTreatment ? 2 : 1);
  const [treatment, setTreatment] = useState<IconKey | null>(props.preTreatment ?? null);
  /** null is a real choice here — "any dentist" — so undefined means "not yet" */
  const [dentist, setDentist] = useState<string | null | undefined>(props.preDentist ?? undefined);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  /** token for the picked slot's temporary reservation (hold-then-confirm) */
  const [holdToken, setHoldToken] = useState<string | null>(null);
  /** LINE-signed ID token — only present when the page runs inside LIFF */
  const [lineIdToken, setLineIdToken] = useState<string | null>(null);

  const [contactName, setContactName] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [contactErr, setContactErr] = useState<string | null>(null);

  const [visitFor, setVisitFor] = useState<"child" | "self">("child");
  const [childPick, setChildPick] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState("");
  const [childErr, setChildErr] = useState<string | null>(null);

  const [pending, startBooking] = useTransition();
  const [bookErr, setBookErr] = useState<string | null>(null);
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null);

  /* returning family? matched in the database the moment a phone is typed */
  const [family, setFamily] = useState<{ name: string; children: { id: number; name: string }[] }[]>([]);
  useEffect(() => {
    let cancelled = false;
    familyByPhone(contactTel).then((rows) => {
      if (!cancelled) setFamily(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [contactTel]);
  const knownKids = useMemo(
    () => family.flatMap((p) => p.children.map((c) => ({ ...c, guardian: p.name }))),
    [family],
  );

  /* inside LINE the LIFF context is already logged in — grab the signed ID
     token so the server can learn who booked; a normal browser visit just
     skips this and books by phone number as before */
  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) return;
    let cancelled = false;
    import("@line/liff")
      .then(async ({ default: liff }) => {
        await liff.init({ liffId });
        if (!cancelled && liff.isLoggedIn()) setLineIdToken(liff.getIDToken());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const chosen = dentist ? dentists.find((d) => d.slug === dentist) : undefined;
  const roster = treatment ? dentistsForUI(dentists, treatment) : dentists;
  /** slugs able to do the picked treatment — bounds the calendar in "any" mode */
  const capable = useMemo(() => new Set(roster.map((d) => d.slug)), [roster]);

  /* the free times on the picked day — for a named dentist their own open
     rows; for "any dentist" every clock time whose chair load still has room
     and at least one capable dentist covers (taken or not — a full cover
     just means the booking waits in the pool for a cancellation) */
  const daySlots = useMemo(() => {
    if (!date) return { morning: [] as string[], afternoon: [] as string[] };
    const rows = slots[date] ?? [];
    const dayLoad: Record<string, { live: number; pool: number }> = load[date] ?? {};
    const gone = (hhmm: string) => date === today && minutesOf(hhmm) < nowMin + LEAD;
    const free = (r: SlotRow) => !r.taken && !gone(r.time);
    if (dentist) {
      const relevant = rows.filter((r) => r.dentistSlug === dentist);
      const bank = (from: number, to: number) =>
        [...new Set(relevant.filter((r) => minutesOf(r.time) >= from && minutesOf(r.time) < to).map((r) => r.time))]
          .filter((hhmm) => {
            const row = relevant.find((r) => r.time === hhmm);
            return row ? free(row) : false;
          })
          .sort();
      return { morning: bank(0, 720), afternoon: bank(720, 1440) };
    }
    const capable = new Set(roster.map((d) => d.slug));
    const times = [...new Set(rows.map((r) => r.time))].filter((hhmm) => {
      if (gone(hhmm)) return false;
      if ((dayLoad[hhmm]?.live ?? 0) >= chairs) return false;
      return rows.some((r) => r.time === hhmm && capable.has(r.dentistSlug));
    }).sort();
    const cut = (from: number, to: number) =>
      times.filter((hhmm) => minutesOf(hhmm) >= from && minutesOf(hhmm) < to);
    return { morning: cut(0, 720), afternoon: cut(720, 1440) };
  }, [date, dentist, slots, load, chairs, roster, today, nowMin]);

  /* tint for the treatment discs — from the icon library, like the home page */
  const TINT = useMemo(() => new Map(iconLibrary.map((e) => [e.key, e.tint] as const)), []);
  const tintOf = (k: IconKey) => TINT.get(k) ?? "lav";

  /* the compact price under a treatment name */
  const priceShort = (k: IconKey) => {
    const p = prices[k];
    if (p === undefined) return "";
    if (p === null) return t.common.quote;
    if (p === 0) return t.common.free;
    return `${p.toLocaleString("en-US")} ${t.common.baht}`;
  };

  /** drop the current slot reservation — the picked slot is about to change */
  function clearHold() {
    if (holdToken) void releaseSlotHold(holdToken);
    setHoldToken(null);
  }

  /** picking a time reserves it server-side for HOLD_MINUTES — if the slot was
   *  just taken, unselect and say so rather than failing at confirm */
  function pickTime(hhmm: string) {
    clearHold();
    setTime(hhmm);
    setBookErr(null);
    if (!treatment || !date) return;
    const dentistId = dentist ? (dentists.find((d) => d.slug === dentist)?.id ?? null) : null;
    void holdSlot({ date, time: hhmm, treatmentKey: treatment, dentistId }).then((r) => {
      if (r.ok && r.token) {
        setHoldToken(r.token);
      } else {
        setTime(null);
        setBookErr(t.booking.slotTaken);
      }
    });
  }

  function pickTreatment(k: IconKey) {
    clearHold();
    setTreatment(k);
    // a dentist picked for the previous treatment may not take this one —
    // drop back to the dentist step instead of showing an empty calendar
    if (dentist && !dentistsForUI(dentists, k).some((d) => d.slug === dentist)) {
      setDentist(undefined);
      setDate(null);
      setTime(null);
      setStep(2);
      return;
    }
    setStep(dentist === undefined ? 2 : 3);
  }

  function pickDentist(slug: string | null) {
    clearHold();
    setDentist(slug);
    setStep(3);
  }

  const title =
    step === 1 ? t.booking.step1
    : step === 2 ? t.booking.step2
    : step === 3 ? t.booking.step3
    : step === 4 ? t.booking.contact
    : step === 5 ? t.booking.child
    : t.book;

  function confirmContact() {
    if (!contactName.trim()) {
      setContactErr(t.booking.errName);
      return;
    }
    if (!/^[0-9]{9,10}$/.test(contactTel.replace(/\D/g, ""))) {
      setContactErr(t.booking.errTel);
      return;
    }
    setContactErr(null);
    setStep(5);
  }

  /** the name that goes on the slip: self → contact name, else the picked/new child */
  function chosenChildName(): string {
    if (visitFor === "self") return contactName.trim();
    const picked = knownKids.find((k) => String(k.id) === childPick);
    if (picked) return picked.name;
    return newChildName.trim();
  }

  function confirmChild() {
    if (visitFor === "self") {
      setChildErr(null);
      setStep(6);
      return;
    }
    if (childPick && childPick !== "new") {
      setChildErr(null);
      setStep(6);
      return;
    }
    const nm = newChildName.trim();
    if (!nm) {
      setChildErr(t.booking.errChild);
      return;
    }
    // same name already among the family's children? select it instead of doubling
    const dup = knownKids.find((k) => k.name === nm);
    if (dup) {
      setChildPick(String(dup.id));
      setChildErr(t.booking.dupChild);
      return;
    }
    setChildErr(null);
    setStep(6);
  }

  /** the final write — inserts through the server action */
  function confirmBooking() {
    if (!treatment || !date || !time) return;
    setBookErr(null);
    startBooking(async () => {
      const result = await bookAppointment({
        date,
        time,
        treatmentKey: treatment,
        dentistId: dentist ? (dentists.find((d) => d.slug === dentist)?.id ?? null) : null,
        childName: visitFor === "self" ? contactName.trim() : chosenChildName(),
        guardianName: contactName.trim(),
        phone: contactTel,
        forSelf: visitFor === "self",
        holdToken: holdToken ?? undefined,
        lineIdToken: lineIdToken ?? undefined,
      });
      if (result.ok && result.ref) {
        setHoldToken(null);
        setConfirmedRef(result.ref);
      } else {
        setBookErr(result.error === "slot_taken" ? t.booking.slotTaken : t.booking.bookError);
      }
    });
  }

  const booked = confirmedRef !== null;

  return (
    <Screen title={step === 6 ? t.book : `${t.book} · ${title}`} back="/">
      {booked && treatment && date && time ? (
        <div className="doneWrap">
          <div className="doneArt">
            <Mascot h={96} id="done" />
            <span className="doneTick">
              <Check size={18} />
            </span>
          </div>
          <h2 className="doneTitle">{t.booking.doneTitle}</h2>
          <p className="doneSub">{t.booking.doneSub}</p>

          <Slip
            appt={{
              ref: confirmedRef,
              dateISO: date,
              time,
              treatment,
              dentist: dentist ?? null,
              status: "confirmed",
            }}
            patient={chosenChildName() || patient[lang]}
          />

          <div className="doneLinks">
            <Cta href="/bookings">{t.booking.viewBookings}</Cta>
            <Ghost href="/">{t.booking.backHome}</Ghost>
          </div>
        </div>
      ) : (
        <>
          <Stepper step={step} onBack={setStep} />

          {step > 1 && treatment ? (
            <div className="pickedBar">
              <span className={`disc t-${tintOf(treatment)}`}>
                <ServiceIcon k={treatment} size={20} />
              </span>
              <span className="pt">
                <span className="pn">{t.service[treatment]}</span>
                <span className="pp">{priceShort(treatment)}</span>
              </span>
              <button type="button" className="changeBtn" onClick={() => setStep(1)}>
                {t.common.change}
              </button>
            </div>
          ) : null}

          {step >= 3 && dentist !== undefined ? (
            <div className="pickedBar">
              {chosen ? (
                <DentistAvatar d={chosen} alt={chosen.text[lang].name} size={36} />
              ) : (
                <span className="disc t-lav">
                  <ServiceIcon k="kids" size={20} />
                </span>
              )}
              <span className="pt">
                <span className="pn">{chosen ? chosen.text[lang].name : t.booking.anyone}</span>
                <span className="pp">{chosen ? chosen.text[lang].title : t.booking.anyoneSub}</span>
              </span>
              <button type="button" className="changeBtn" onClick={() => setStep(2)}>
                {t.common.change}
              </button>
            </div>
          ) : null}

          {step === 1 ? (
            <>
              <Eyebrow>{t.booking.popular}</Eyebrow>
              <div className="grid cols4">
                {popular.map((k) => (
                  <button key={k} type="button" className="tile" onClick={() => pickTreatment(k)}>
                    <span className={`disc t-${tintOf(k)}`}>
                      <ServiceIcon k={k} size={22} />
                    </span>
                    <span className="label">{t.service[k]}</span>
                  </button>
                ))}
              </div>

              <Eyebrow>{t.booking.allGroups}</Eyebrow>
              {iconGroups.map((g) => {
                const items = iconLibrary.filter((e) => e.group === g && e.key !== "more");
                if (items.length === 0) return null;
                return (
                  <div key={g} className="pickGroup">
                    <h3>{t.group[g]}</h3>
                    <div className="pick">
                      {items.map((e) => (
                        <TreatRow key={e.key} k={e.key} tint={tintOf(e.key)} onPick={pickTreatment} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Eyebrow>{t.booking.pickDentist}</Eyebrow>
              <div className="pick">
                <button type="button" className="pickRow" onClick={() => pickDentist(null)}>
                  <span className="disc t-lav">
                    <ServiceIcon k="kids" size={21} />
                  </span>
                  <span className="pt">
                    <span className="pn">{t.booking.anyone}</span>
                    <span className="pp">{t.booking.anyoneSub}</span>
                  </span>
                  <Chevron />
                </button>
                {roster.map((d) => (
                  <DentistRow key={d.slug} d={d} onPick={pickDentist} />
                ))}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Eyebrow>{t.booking.pickDate}</Eyebrow>
              <DayCalendar
                today={today}
                date={date}
                onPick={(iso) => {
                  clearHold();
                  setDate(iso);
                  setTime(null);
                }}
                openDays={openDays}
                holidays={holidays}
                slots={slots}
                dentist={dentist ?? null}
                capable={capable}
                load={load}
                chairs={chairs}
              />
              <p className="hint">{t.booking.closedDay}</p>

              {date ? (
                <>
                  <Eyebrow>{t.booking.pickTime}</Eyebrow>
                  <div className="slotWrap">
                    {daySlots.morning.length > 0 ? (
                      <SlotBank label={t.booking.morning} times={daySlots.morning} time={time} onPick={pickTime} />
                    ) : null}
                    {daySlots.afternoon.length > 0 ? (
                      <SlotBank label={t.booking.afternoon} times={daySlots.afternoon} time={time} onPick={pickTime} />
                    ) : null}
                    {daySlots.morning.length === 0 && daySlots.afternoon.length === 0 ? (
                      <p className="hint">{t.booking.fullDay}</p>
                    ) : null}
                    {time && holdToken ? <p className="hint">{t.booking.holdNote}</p> : null}
                  </div>
                </>
              ) : null}

              <div className="stickyBar">
                <div className="sbText">
                  <span className="sbK">{t.common.selected}</span>
                  <span className="sbV">
                    {date ? fmtRelative(t, today, date) : t.booking.pickDate}
                    {time ? ` · ${time}` : ""}
                  </span>
                </div>
                <button type="button" className="cta" disabled={!date || !time} onClick={() => setStep(4)}>
                  {t.booking.contact}
                </button>
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <Eyebrow>{t.booking.contactSub}</Eyebrow>
              <div className="pick">
                <label className="fld">
                  <span className="fk">{t.booking.contactName}</span>
                  <input
                    className="fi"
                    type="text"
                    autoComplete="name"
                    placeholder={t.booking.contactNamePh}
                    value={contactName}
                    onChange={(e) => {
                      setContactName(e.target.value);
                      setContactErr(null);
                    }}
                  />
                </label>
                <label className="fld">
                  <span className="fk">{t.booking.contactTel}</span>
                  <input
                    className="fi"
                    type="text"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={t.booking.contactTelPh}
                    value={contactTel}
                    onChange={(e) => {
                      setContactTel(e.target.value);
                      setContactErr(null);
                    }}
                  />
                </label>
                {contactErr ? <p className="err">{contactErr}</p> : null}
                <p className="hint">{t.booking.contactHint}</p>
              </div>

              <div className="stickyBar">
                <div className="sbText">
                  <span className="sbK">{t.common.selected}</span>
                  <span className="sbV">
                    {date ? fmtRelative(t, today, date) : t.booking.pickDate}
                    {time ? ` · ${time}` : ""}
                  </span>
                </div>
                <button type="button" className="ghostBtn" onClick={() => setStep(3)}>
                  {t.booking.backToTime}
                </button>
                <button type="button" className="cta" onClick={confirmContact}>
                  {t.booking.next}
                </button>
              </div>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <Eyebrow>
                {family.length > 0 ? `${t.booking.welcomeBack} ${family[0].name}` : t.booking.childSubFirst}
              </Eyebrow>
              <div className="pick">
                <button
                  type="button"
                  className="pickRow"
                  onClick={() => {
                    setVisitFor("child");
                    setChildErr(null);
                  }}
                >
                  <span className="disc t-lav">
                    <ServiceIcon k="kids" size={21} />
                  </span>
                  <span className="pt">
                    <span className="pn">{t.booking.forChild}</span>
                    {family.length > 0 ? <span className="pp">{t.booking.childSubBack}</span> : null}
                  </span>
                  {visitFor === "child" ? <Check size={14} /> : null}
                </button>
                <button
                  type="button"
                  className="pickRow"
                  onClick={() => {
                    setVisitFor("self");
                    setChildErr(null);
                  }}
                >
                  <span className="disc t-gold">
                    <ServiceIcon k="checkup" size={21} />
                  </span>
                  <span className="pt">
                    <span className="pn">{t.booking.forSelf}</span>
                    <span className="pp">{t.booking.selfHint}</span>
                  </span>
                  {visitFor === "self" ? <Check size={14} /> : null}
                </button>

                {visitFor === "child" ? (
                  <>
                    {knownKids.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        className="pickRow"
                        onClick={() => {
                          setChildPick(String(k.id));
                          setChildErr(null);
                        }}
                      >
                        <span className="disc t-blue">
                          <ServiceIcon k="kids" size={21} />
                        </span>
                        <span className="pt">
                          <span className="pn">{k.name}</span>
                          {family.length > 1 ? <span className="pp">{k.guardian}</span> : null}
                        </span>
                        {childPick === String(k.id) ? <Check size={14} /> : null}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="pickRow"
                      onClick={() => {
                        setChildPick("new");
                        setChildErr(null);
                      }}
                    >
                      <span className="pt">
                        <span className="pn">{t.booking.newChild}</span>
                      </span>
                      {childPick === "new" ? <Check size={14} /> : null}
                    </button>
                    {childPick === "new" || knownKids.length === 0 ? (
                      <label className="fld">
                        <span className="fk">{t.booking.childName}</span>
                        <input
                          className="fi"
                          type="text"
                          placeholder={t.booking.childNamePh}
                          value={newChildName}
                          onChange={(e) => {
                            setNewChildName(e.target.value);
                            setChildErr(null);
                          }}
                        />
                      </label>
                    ) : null}
                  </>
                ) : null}
                {childErr ? <p className="err">{childErr}</p> : null}
              </div>

              <div className="stickyBar">
                <div className="sbText">
                  <span className="sbK">{t.common.selected}</span>
                  <span className="sbV">
                    {date ? fmtRelative(t, today, date) : t.booking.pickDate}
                    {time ? ` · ${time}` : ""}
                    {visitFor === "self" && contactName.trim() ? ` · ${contactName.trim()}` : ""}
                  </span>
                </div>
                <button type="button" className="ghostBtn" onClick={() => setStep(4)}>
                  {t.booking.backToContact}
                </button>
                <button type="button" className="cta" onClick={confirmChild}>
                  {t.booking.confirm}
                </button>
              </div>
            </>
          ) : null}

          {step === 6 ? (
            <>
              <Eyebrow>{t.booking.step3}</Eyebrow>
              <div className="pick">
                <p className="hint" style={{ padding: "12px 12px 0" }}>
                  {t.booking.reviewHint}
                </p>
                {bookErr ? <p className="err">{bookErr}</p> : null}
                <button
                  type="button"
                  className="cta"
                  style={{ margin: "12px" }}
                  onClick={confirmBooking}
                  disabled={pending}
                >
                  {pending ? t.booking.bookingNow : t.booking.confirmBooking}
                </button>
              </div>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
