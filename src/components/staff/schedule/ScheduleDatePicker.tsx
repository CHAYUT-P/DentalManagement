"use client";

import React, { useState } from "react";
import { useT } from "@/i18n/lang";
import {
  addDays,
  addMonths,
  dayOfMonth,
  daysInMonth,
  monthKey,
  monthStart,
  weekdayIndex,
  yearOf,
} from "@/lib/dates";
import { IconCalendar, IconChevronLeft, IconChevronRight } from "@/components/staff/shell/staffIcons";

/** Sunday-first columns, like a wall calendar */
const DOW_ORDER = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/**
 * The schedule page's date jump: a button that opens a real month calendar.
 * Unlike the patient calendar this one is unbounded — staff look at the past
 * as often as the future — and every day that holds bookings carries a count
 * so a busy day reads busy before it is opened.
 *
 * All date math is pure UTC on `YYYY-MM-DD` strings (see `src/lib/dates.ts`),
 * so what the button shows can never drift from what the grid draws.
 */
export function ScheduleDatePicker({
  today,
  value,
  onChange,
  counts,
}: {
  /** YYYY-MM-DD in Asia/Bangkok */
  today: string;
  /** the currently selected day */
  value: string;
  onChange: (iso: string) => void;
  /** bookings per day, keyed by ISO date — drawn as the small number under a day */
  counts?: Record<string, number>;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => monthStart(value));

  const toggle = () => {
    // reopening always lands on the month of the day being viewed, not on
    // whatever month was browsed to last time
    if (!open) setView(monthStart(value));
    setOpen(!open);
  };

  const pick = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  const cells: (string | null)[] = [];
  for (let i = 0; i < weekdayIndex(view); i++) cells.push(null);
  for (let d = 0; d < daysInMonth(view); d++) cells.push(addDays(view, d));

  return (
    <div className="dp">
      <button
        type="button"
        className={`dpTrigger${open ? " active" : ""}`}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <IconCalendar size={15} />
        <span>
          {dayOfMonth(value)} {t.month[monthKey(value)]} {yearOf(value) + 543}
        </span>
      </button>

      {open ? (
        <>
          {/* click-away layer */}
          <div className="dpOverlay" onClick={() => setOpen(false)} />
          <div className="dpPop" role="dialog" aria-label="เลือกวันที่">
            <div className="dpHead">
              <button
                type="button"
                className="dpNav"
                aria-label="เดือนก่อนหน้า"
                onClick={() => setView(addMonths(view, -1))}
              >
                <IconChevronLeft size={15} />
              </button>
              <span className="dpTitle">
                {t.month[monthKey(view)]} {yearOf(view) + 543}
              </span>
              <button
                type="button"
                className="dpNav"
                aria-label="เดือนถัดไป"
                onClick={() => setView(addMonths(view, 1))}
              >
                <IconChevronRight size={15} />
              </button>
            </div>

            <div className="dpGrid">
              {DOW_ORDER.map((w) => (
                <span key={w} className={`dpDow${w === "sun" ? " sun" : ""}`}>
                  {t.weekday[w]}
                </span>
              ))}
              {cells.map((iso, i) => {
                if (iso === null) return <span key={`pad${i}`} aria-hidden="true" />;
                const n = counts?.[iso] ?? 0;
                return (
                  <button
                    key={iso}
                    type="button"
                    className={`dpDay${iso === today ? " today" : ""}${iso === value ? " on" : ""}`}
                    onClick={() => pick(iso)}
                  >
                    <span className="dpNum">{dayOfMonth(iso)}</span>
                    {n > 0 ? <span className="dpCount">{n}</span> : null}
                  </button>
                );
              })}
            </div>

            <div className="dpFoot">
              <button
                type="button"
                className="dpTodayBtn"
                onClick={() => pick(today)}
                disabled={value === today}
              >
                กลับไปที่วันนี้
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
