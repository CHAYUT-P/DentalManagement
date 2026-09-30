"use client";

import React, { useState } from "react";
import AppointmentsList from "@/app/staff/appointments/page";
import { ScheduleDay } from "./ScheduleDay";

type View = "day" | "list";

/**
 * ตารางนัด — one menu entry for everything about bookings on other days. "วัน"
 * is the per-dentist calendar (drag to move, click an empty slot to book);
 * "รายการ" is the searchable, filterable directory that used to be its own
 * "จัดการนัดทั้งหมด" page.
 */
export function ScheduleView() {
  const [view, setView] = useState<View>("day");
  return (
    <div className="sched-view">
      <div className="view-switch" role="group" aria-label="มุมมองตารางนัด">
        <button type="button" aria-pressed={view === "day"} onClick={() => setView("day")}>
          วัน
        </button>
        <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
          รายการ
        </button>
      </div>
      {view === "day" ? <ScheduleDay /> : <AppointmentsList />}
    </div>
  );
}
