"use client";

/** staff data lives in Postgres — render on request, never prerender */
export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { useStaff } from "@/lib/staffStore";
import {
  telDisplay,
  lineId,
  landmark,
  geo,
  type DayKey,
} from "@/data/clinic";
import {
  IconSettings,
  IconClock,
  IconCheck,
  IconZap,
  IconBuilding,
  IconBell,
  IconX,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
} from "@/components/staff/staffIcons";
import {
  addDays,
  addMonths,
  dayOfMonth,
  daysInMonth,
  monthStart,
  weekdayIndex,
} from "@/lib/dates";
import { holidayCovers, type HolidayItem } from "@/lib/clinicSettings";

const DAY_LABELS: Record<DayKey, { th: string; en: string }> = {
  mon: { th: "วันจันทร์", en: "Monday" },
  tue: { th: "วันอังคาร", en: "Tuesday" },
  wed: { th: "วันพุธ", en: "Wednesday" },
  thu: { th: "วันพฤหัสบดี", en: "Thursday" },
  fri: { th: "วันศุกร์", en: "Friday" },
  sat: { th: "วันเสาร์", en: "Saturday" },
  sun: { th: "วันอาทิตย์", en: "Sunday" },
};

type SettingsTab = "hours" | "booking" | "profile" | "staff_notif";

const TH_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const TH_DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function fmtTHDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
}

function fmtHolidayRange(h: Pick<HolidayItem, "start" | "end">): string {
  return h.start === h.end ? fmtTHDate(h.start) : `${fmtTHDate(h.start)} – ${fmtTHDate(h.end)}`;
}

function dayCount(start: string, end: string): number {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  return (
    Math.round(
      (Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86400000,
    ) + 1
  );
}

/**
 * Our own month calendar for picking special holidays. Click once for a
 * single closed day, click a second day for a closed range (order doesn't
 * matter). Past days are disabled; already-saved holidays are marked red.
 */
function HolidayCalendar({
  today,
  holidays,
  selStart,
  selEnd,
  hover,
  onHover,
  onPick,
}: {
  today: string;
  holidays: HolidayItem[];
  selStart: string | null;
  selEnd: string | null;
  hover: string | null;
  onHover: (iso: string | null) => void;
  onPick: (iso: string) => void;
}) {
  const [view, setView] = useState(() => monthStart(today));
  const [y, m] = view.split("-").map(Number);

  const inSel = (iso: string) => {
    if (!selStart) return false;
    const end = selEnd ?? hover ?? selStart;
    const [s, e] = selStart <= end ? [selStart, end] : [end, selStart];
    return iso >= s && iso <= e;
  };

  const cells: (string | null)[] = [];
  for (let i = 0; i < weekdayIndex(view); i++) cells.push(null);
  for (let d = 0; d < daysInMonth(view); d++) cells.push(addDays(view, d));

  const btn: React.CSSProperties = {
    aspectRatio: "1",
    borderRadius: "10px",
    border: "1px solid var(--staff-border)",
    background: "#ffffff",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--staff-ink)",
    cursor: "pointer",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    lineHeight: 1,
  };

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <button type="button" className="btn-action-icon" style={{ width: "30px", height: "30px" }} onClick={() => setView((v) => addMonths(v, -1))} aria-label="เดือนก่อนหน้า">
          <IconChevronLeft size={15} />
        </button>
        <strong style={{ fontSize: "14.5px", color: "var(--staff-ink)" }}>
          {TH_MONTHS[m - 1]} {y + 543}
        </strong>
        <button type="button" className="btn-action-icon" style={{ width: "30px", height: "30px" }} onClick={() => setView((v) => addMonths(v, 1))} aria-label="เดือนถัดไป">
          <IconChevronRight size={15} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
        {TH_DOW.map((d, i) => (
          <span key={i} style={{ textAlign: "center", fontSize: "11px", fontWeight: 700, color: "var(--staff-ink-muted)", padding: "4px 0" }}>
            {d}
          </span>
        ))}
        {cells.map((iso, i) => {
          if (iso === null) return <span key={`pad${i}`} />;
          const past = iso < today;
          const saved = holidays.find((h) => holidayCovers(h, iso));
          const selected = inSel(iso);
          return (
            <button
              key={iso}
              type="button"
              disabled={past}
              title={saved ? `วันหยุด: ${saved.name}` : fmtTHDate(iso)}
              onClick={() => onPick(iso)}
              onMouseEnter={() => onHover(iso)}
              onMouseLeave={() => onHover(null)}
              style={{
                ...btn,
                background: selected ? "var(--staff-primary)" : saved ? "#ffe3e3" : btn.background,
                borderColor: selected ? "var(--staff-primary)" : saved ? "#ffa8a8" : "var(--staff-border)",
                color: selected ? "#ffffff" : saved ? "#c92a2a" : btn.color,
                opacity: past ? 0.35 : 1,
                cursor: past ? "not-allowed" : "pointer",
                fontWeight: selected || saved ? 800 : 600,
              }}
            >
              {dayOfMonth(iso)}
              {saved && !selected ? (
                <span style={{ position: "absolute", bottom: "4px", left: "50%", transform: "translateX(-50%)", width: "5px", height: "5px", borderRadius: "50%", background: "#e03131" }} />
              ) : null}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "14px", marginTop: "10px", fontSize: "11.5px", color: "var(--staff-ink-muted)", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: "var(--staff-primary)", display: "inline-block" }} /> วันที่กำลังเลือก
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: "#ffa8a8", display: "inline-block" }} /> วันหยุดที่บันทึกแล้ว
        </span>
      </div>
    </div>
  );
}

export default function StaffSettingsPage() {
  const {
    today,
    resetAllData,
    showToast,
    schedule,
    holidays,
    updateDayOpen,
    updateDayTime,
    addHoliday,
    removeHoliday,
  } = useStaff();

  const [activeTab, setActiveTab] = useState<SettingsTab>("hours");

  // Special-holiday range selection (the saved list lives in the staff store
  // so patient booking also sees it). Click once = single day, twice = range.
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const [selHover, setSelHover] = useState<string | null>(null);
  const [newHolidayName, setNewHolidayName] = useState("");

  // Booking rules state
  const [chairCount, setChairCount] = useState<number>(3);
  const [slotGranularity, setSlotGranularity] = useState("30");
  const [advanceDays, setAdvanceDays] = useState("14");
  const [leadCutoffMin, setLeadCutoffMin] = useState("60");
  const [hasLunchBreak, setHasLunchBreak] = useState(true);
  const [lunchStart, setLunchStart] = useState("12:00");
  const [lunchEnd, setLunchEnd] = useState("13:00");
  const [cancelDeadlineHours, setCancelDeadlineHours] = useState("2");

  // Clinic profile state
  const [clinicNameTh, setClinicNameTh] = useState("Denta Kids คลินิกทันตกรรมสำหรับเด็ก");
  const [clinicNameEn, setClinicNameEn] = useState("Denta Kids Pediatric Dental Clinic");
  const [tel, setTel] = useState(telDisplay);
  const [line, setLine] = useState(lineId);
  const [addressTh, setAddressTh] = useState(landmark.th);
  const [addressEn, setAddressEn] = useState(landmark.en);
  const [latitude, setLatitude] = useState(String(geo.lat));
  const [longitude, setLongitude] = useState(String(geo.lng));

  // Notification settings state
  const [enableD1Reminder, setEnableD1Reminder] = useState(true);
  const [d1ReminderTime, setD1ReminderTime] = useState("18:00");
  const [enableD0Reminder, setEnableD0Reminder] = useState(true);
  const [d0ReminderTime, setD0ReminderTime] = useState("08:00");
  const [soundAlerts, setSoundAlerts] = useState(true);

  const handlePickDay = (iso: string) => {
    if (!selStart || (selStart && selEnd)) {
      setSelStart(iso);
      setSelEnd(null);
    } else if (iso === selStart) {
      setSelEnd(iso); // clicked twice = single day
    } else if (iso < selStart) {
      setSelEnd(selStart);
      setSelStart(iso);
    } else {
      setSelEnd(iso);
    }
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selStart || !newHolidayName.trim()) return;
    const end = selEnd ?? selStart;
    addHoliday(selStart, end, newHolidayName.trim());
    setSelStart(null);
    setSelEnd(null);
    setNewHolidayName("");
    const [s, x] = selStart <= end ? [selStart, end] : [end, selStart];
    showToast(
      s === x
        ? `ปิดรับจองวันที่ ${fmtTHDate(s)} แล้ว`
        : `ปิดรับจอง ${fmtTHDate(s)} – ${fmtTHDate(x)} แล้ว`,
    );
  };

  const handleRemoveHoliday = (id: number | string) => {
    removeHoliday(id);
    showToast("ลบวันหยุดพิเศษแล้ว");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("บันทึกการตั้งค่าคลินิกเรียบร้อยแล้ว");
  };

  const handleResetData = () => {
    if (
      window.confirm(
        "ต้องการรีเซ็ตข้อมูลจำลองทั้งหมดกลับเป็นค่าเริ่มต้นหรือไม่? (ตารางนัดหมาย, คนไข้, แพทย์)"
      )
    ) {
      resetAllData();
      showToast("รีเซ็ตข้อมูลตัวอย่างเรียบร้อยแล้ว");
    }
  };

  return (
    <div className="staff-container" style={{ width: "100%", maxWidth: "100%", padding: "24px 28px" }}>
      {/* Page Header */}
      <div className="staff-page-header">
        <div>
          <h2>ตั้งค่าการทำงานคลินิก (Clinic Operations Settings)</h2>
          <p>จัดการเวลาทำการ เก้าอี้ตรวจ กฎการจองคิวออนไลน์ ข้อมูลคลินิก และระบบแจ้งเตือนอัตโนมัติ</p>
        </div>

        <button
          type="button"
          className="btn-primary-staff"
          onClick={handleSave}
        >
          <IconCheck size={16} />
          <span>บันทึกการตั้งค่าทั้งหมด</span>
        </button>
      </div>

      {/* Settings Tab Navigation */}
      <div className="staff-toolbar" style={{ padding: "6px 8px" }}>
        <div className="staff-pill-group" style={{ border: "none", background: "transparent" }}>
          <button
            type="button"
            className={`staff-pill-btn ${activeTab === "hours" ? "active" : ""}`}
            style={{ padding: "7px 16px", fontSize: "13px" }}
            onClick={() => setActiveTab("hours")}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <IconClock size={15} />
              <span>เวลาทำการ & วันหยุด</span>
            </span>
          </button>

          <button
            type="button"
            className={`staff-pill-btn ${activeTab === "booking" ? "active" : ""}`}
            style={{ padding: "7px 16px", fontSize: "13px" }}
            onClick={() => setActiveTab("booking")}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <IconSettings size={15} />
              <span>กฎการจอง & ห้องตรวจ ({chairCount} เก้าอี้)</span>
            </span>
          </button>

          <button
            type="button"
            className={`staff-pill-btn ${activeTab === "profile" ? "active" : ""}`}
            style={{ padding: "7px 16px", fontSize: "13px" }}
            onClick={() => setActiveTab("profile")}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <IconBuilding size={15} />
              <span>ข้อมูลคลินิก & ที่ตั้ง</span>
            </span>
          </button>

          <button
            type="button"
            className={`staff-pill-btn ${activeTab === "staff_notif" ? "active" : ""}`}
            style={{ padding: "7px 16px", fontSize: "13px" }}
            onClick={() => setActiveTab("staff_notif")}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <IconBell size={15} />
              <span>การแจ้งเตือน & บัญชีผู้ใช้</span>
            </span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* ====================================================================
            TAB 1: เวลาทำการ & วันหยุดพิเศษ
            ==================================================================== */}
        {activeTab === "hours" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "stretch" }}>
            {/* Weekly Schedule */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid var(--staff-border)",
                borderRadius: "14px",
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                boxShadow: "var(--staff-shadow-sm)",
              }}
            >
              <div>
                <strong style={{ fontSize: "15px", color: "var(--staff-ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <IconClock size={17} color="var(--staff-primary)" />
                  <span>เวลาเปิด-ปิดทำการประจำสัปดาห์ (Weekly Operating Schedule)</span>
                </strong>
                <div style={{ fontSize: "12px", color: "var(--staff-ink-muted)", marginTop: "2px" }}>
                  กำหนดวันและช่วงเวลาที่คลินิกเปิดให้บริการ (จะแสดงบนหน้าแรกและหน้าข้อมูลคลินิกของคนไข้)
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(430px, 1fr))", gap: "8px" }}>
                {schedule.map((item) => (
                  <div
                    key={item.day}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      flexWrap: "wrap",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid",
                      borderColor: item.isOpen ? "var(--staff-border)" : "transparent",
                      background: item.isOpen ? "#ffffff" : "var(--staff-surface-subtle)",
                      transition: "all 0.15s",
                    }}
                  >
                    {/* Open/close + day — always a single line */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: "1 1 220px", whiteSpace: "nowrap", overflow: "hidden" }}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={item.isOpen}
                        title={item.isOpen ? "ปิดวันนี้" : "เปิดวันนี้"}
                        onClick={() => updateDayOpen(item.day, !item.isOpen)}
                        style={{
                          width: "38px",
                          height: "22px",
                          borderRadius: "999px",
                          border: "none",
                          background: item.isOpen ? "var(--staff-primary)" : "#ced4da",
                          position: "relative",
                          cursor: "pointer",
                          flexShrink: 0,
                          padding: 0,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: "3px",
                            left: item.isOpen ? "20px" : "3px",
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            background: "#ffffff",
                            transition: "left 0.15s",
                          }}
                        />
                      </button>

                      <strong
                        style={{
                          fontSize: "13.5px",
                          color: item.isOpen ? "var(--staff-ink)" : "var(--staff-ink-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.isOpen ? "เปิดทำการ" : "ปิดทำการ"} · {DAY_LABELS[item.day].th}
                      </strong>
                    </div>

                    {/* Time Pickers */}
                    {item.isOpen ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                        <span style={{ fontSize: "12px", color: "var(--staff-ink-muted)" }}>เวลา:</span>
                        <input
                          type="time"
                          className="form-control"
                          style={{ padding: "4px 8px", width: "110px", fontSize: "13px" }}
                          value={item.start}
                          onChange={(e) => updateDayTime(item.day, "start", e.target.value)}
                        />
                        <span style={{ fontSize: "12px", color: "var(--staff-ink-muted)" }}>ถึง</span>
                        <input
                          type="time"
                          className="form-control"
                          style={{ padding: "4px 8px", width: "110px", fontSize: "13px" }}
                          value={item.end}
                          onChange={(e) => updateDayTime(item.day, "end", e.target.value)}
                        />
                        <span style={{ fontSize: "12px", color: "var(--staff-ink-muted)" }}>น.</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: "12px", color: "var(--staff-ink-muted)", fontStyle: "italic" }}>
                        ปิดทำการประจำสัปดาห์ (ไม่เปิดให้จองคิว)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Special Holidays — own calendar, single day or range */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid var(--staff-border)",
                borderRadius: "14px",
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                boxShadow: "var(--staff-shadow-sm)",
              }}
            >
              <div>
                <strong style={{ fontSize: "15px", color: "var(--staff-ink)" }}>
                  วันหยุดพิเศษของคลินิก (Special Holidays / Closed Dates)
                </strong>
                <div style={{ fontSize: "12px", color: "var(--staff-ink-muted)", marginTop: "2px" }}>
                  จิ้มวันเดียว = ปิดวันนั้นวันเดียว · จิ้มสองวัน = ปิดเป็นช่วง (เช่น 30 ธ.ค. – 3 ม.ค.) · ระบบจะปิดรับการจองคิวออนไลน์อัตโนมัติ
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "22px", alignItems: "start" }}>
                <HolidayCalendar
                  today={today}
                  holidays={holidays}
                  selStart={selStart}
                  selEnd={selEnd}
                  hover={selHover}
                  onHover={setSelHover}
                  onPick={handlePickDay}
                />

                <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 }}>
                  <form
                    onSubmit={handleAddHoliday}
                    style={{
                      background: "var(--staff-primary-light)",
                      border: "1px solid var(--staff-primary)",
                      borderRadius: "10px",
                      padding: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--staff-ink)" }}>
                      {selStart ? (
                        <>ปิดรับจอง: <span style={{ color: "var(--staff-primary)" }}>{fmtHolidayRange({ start: selStart, end: selEnd ?? selStart })}</span></>
                      ) : (
                        <span style={{ fontWeight: 500, color: "var(--staff-ink-muted)" }}>จิ้มวันที่ปฏิทินเพื่อเลือกวันหยุด…</span>
                      )}
                    </div>
                    {selStart ? (
                      <button type="button" className="btn-secondary-staff" style={{ alignSelf: "flex-start", padding: "4px 12px", fontSize: "12px" }} onClick={() => { setSelStart(null); setSelEnd(null); }}>
                        <span>ล้างที่เลือก</span>
                      </button>
                    ) : null}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>ชื่อวันหยุด / เหตุผล</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="เช่น วันแรงงานแห่งชาติ, ปิดปรับปรุงระบบ"
                        value={newHolidayName}
                        onChange={(e) => setNewHolidayName(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-primary-staff"
                      disabled={!selStart || !newHolidayName.trim()}
                      style={{ height: "36px", opacity: !selStart || !newHolidayName.trim() ? 0.5 : 1 }}
                    >
                      <IconCheck size={15} />
                      <span>+ เพิ่มวันหยุดช่วงนี้</span>
                    </button>
                  </form>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <strong style={{ fontSize: "13px", color: "var(--staff-ink)" }}>
                      วันหยุดที่บันทึกแล้ว ({holidays.length})
                    </strong>
                    {holidays.length === 0 ? (
                      <span style={{ fontSize: "12.5px", color: "var(--staff-ink-muted)" }}>ยังไม่มีวันหยุดพิเศษ</span>
                    ) : (
                      holidays.map((h) => (
                        <div
                          key={h.id}
                          style={{
                            background: "var(--staff-surface-subtle)",
                            border: "1px solid var(--staff-border)",
                            borderRadius: "8px",
                            padding: "12px 16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ fontSize: "13.5px", color: "var(--staff-ink)" }}>{h.name}</strong>
                            <div style={{ fontSize: "12px", color: "var(--staff-ink-muted)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <IconCalendar size={12} />
                              <span>{fmtHolidayRange(h)}{h.start !== h.end ? ` (${dayCount(h.start, h.end)} วัน)` : ""}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn-action-icon danger"
                            style={{ width: "28px", height: "28px", flexShrink: 0 }}
                            onClick={() => handleRemoveHoliday(h.id)}
                            title="ลบวันหยุด"
                          >
                            <IconX size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 2: กฎการจอง & ห้องตรวจ
            ==================================================================== */}
        {activeTab === "booking" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: "20px", alignItems: "start" }}>
            {/* Chairs & Capacity */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid var(--staff-border)",
                borderRadius: "14px",
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                boxShadow: "var(--staff-shadow-sm)",
              }}
            >
              <strong style={{ fontSize: "15px", color: "var(--staff-ink)" }}>
                ความจุห้องตรวจและเก้าอี้ทำฟัน (Clinic Chairs & Room Capacity)
              </strong>

              <div className="form-group">
                <label>จำนวนเก้าอี้ทำฟันที่พร้อมใช้งาน (Active Dental Chairs)</label>
                <select
                  className="form-control"
                  value={chairCount}
                  onChange={(e) => setChairCount(Number(e.target.value))}
                >
                  <option value={1}>1 เก้าอี้ (คลินิกขนาดเล็ก)</option>
                  <option value={2}>2 เก้าอี้</option>
                  <option value={3}>3 เก้าอี้ (มาตรฐาน Denta Kids)</option>
                  <option value={4}>4 เก้าอี้</option>
                  <option value={5}>5 เก้าอี้</option>
                </select>
                <span style={{ fontSize: "11.5px", color: "var(--staff-ink-muted)" }}>
                  จำกัดจำนวนคนไข้ที่สามารถจองในเวลาเดียวกันไม่เกินจำนวนเก้าอี้
                </span>
              </div>

              <div className="form-group">
                <label>ความยาวต่อ 1 ช่องเวลา (Slot Duration)</label>
                <select
                  className="form-control"
                  value={slotGranularity}
                  onChange={(e) => setSlotGranularity(e.target.value)}
                >
                  <option value="15">15 นาที</option>
                  <option value="30">30 นาที (ค่าเริ่มต้นที่แนะนำ)</option>
                  <option value="45">45 นาที</option>
                  <option value="60">60 นาที (1 ชั่วโมง)</option>
                </select>
                <span style={{ fontSize: "11.5px", color: "var(--staff-ink-muted)" }}>
                  ระยะเวลาพื้นฐานสำหรับนัดหมายตรวจสุขภาพฟันและหัตถการทั่วไป
                </span>
              </div>
            </div>

            {/* Lunch Break & Rules */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid var(--staff-border)",
                borderRadius: "14px",
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                boxShadow: "var(--staff-shadow-sm)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <strong style={{ fontSize: "15px", color: "var(--staff-ink)" }}>
                    ช่วงเวลาพักเที่ยง (Lunch Break Slot Rules)
                  </strong>
                  <div style={{ fontSize: "12px", color: "var(--staff-ink-muted)", marginTop: "2px" }}>
                    เว้นว่างไม่เปิดให้คนไข้จองคิวออนไลน์ในช่วงพัก
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHasLunchBreak(!hasLunchBreak)}
                  className={`status-pill ${hasLunchBreak ? "completed" : "cancelled"}`}
                  style={{ cursor: "pointer", border: "none" }}
                >
                  {hasLunchBreak ? (
                    <>
                      <IconCheck size={11} />
                      <span>เปิดใช้พักเที่ยง</span>
                    </>
                  ) : (
                    <>
                      <IconX size={11} />
                      <span>ไม่พักเที่ยง</span>
                    </>
                  )}
                </button>
              </div>

              {hasLunchBreak && (
                <div className="form-row-2">
                  <div className="form-group">
                    <label>เริ่มพักเที่ยง</label>
                    <input
                      type="time"
                      className="form-control"
                      value={lunchStart}
                      onChange={(e) => setLunchStart(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>สิ้นสุดพักเที่ยง</label>
                    <input
                      type="time"
                      className="form-control"
                      value={lunchEnd}
                      onChange={(e) => setLunchEnd(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Advance Booking & Cutoff */}
            <div
              style={{
                gridColumn: "1 / -1",
                background: "#ffffff",
                border: "1px solid var(--staff-border)",
                borderRadius: "14px",
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                boxShadow: "var(--staff-shadow-sm)",
              }}
            >
              <strong style={{ fontSize: "15px", color: "var(--staff-ink)" }}>
                กรอบเวลาการจองและยกเลิกนัด (Advance Window & Cancellation Policy)
              </strong>

              <div className="form-row-2">
                <div className="form-group">
                  <label>เปิดให้จองล่วงหน้าได้สูงสุด (วัน)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={advanceDays}
                    onChange={(e) => setAdvanceDays(e.target.value)}
                    min={1}
                    max={60}
                  />
                  <span style={{ fontSize: "11.5px", color: "var(--staff-ink-muted)" }}>
                    ผู้ปกครองสามารถเลือกวันตรวจได้ไม่เกิน {advanceDays} วันนับจากวันนี้
                  </span>
                </div>

                <div className="form-group">
                  <label>ปิดรับการจองก่อนถึงเวลาเริ่มนัด (นาที)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={leadCutoffMin}
                    onChange={(e) => setLeadCutoffMin(e.target.value)}
                    min={0}
                    max={240}
                  />
                  <span style={{ fontSize: "11.5px", color: "var(--staff-ink-muted)" }}>
                    ป้องกันการจองฉุกเฉินกระชั้นชิดเกินกว่าที่คลินิกจะเตรียมห้องทัน
                  </span>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>ผู้ปกครองสามารถกดยกเลิกนัดเองได้ล่วงหน้าอย่างน้อย (ชั่วโมง)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={cancelDeadlineHours}
                    onChange={(e) => setCancelDeadlineHours(e.target.value)}
                    min={1}
                    max={48}
                  />
                </div>

                <div className="form-group">
                  <label>รูปแบบการยืนยันการจองออนไลน์ (LINE LIFF Booking Flow)</label>
                  <input
                    type="text"
                    className="form-control"
                    value="อนุมัติและออกรหัสนัดทันที (Auto-confirmed, No waiting approval)"
                    disabled
                    style={{ background: "var(--staff-surface-subtle)" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 3: ข้อมูลคลินิก & ที่ตั้ง
            ==================================================================== */}
        {activeTab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: "20px", alignItems: "start" }}>
              {/* General Info */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--staff-border)",
                  borderRadius: "14px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxShadow: "var(--staff-shadow-sm)",
                }}
              >
                <strong style={{ fontSize: "15px", color: "var(--staff-ink)" }}>
                  ข้อมูลชื่อคลินิกและการติดต่อ (Clinic Branding & Contacts)
                </strong>

                <div className="form-group">
                  <label>ชื่อคลินิก (ภาษาไทย) *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={clinicNameTh}
                    onChange={(e) => setClinicNameTh(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Clinic Name (English) *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={clinicNameEn}
                    onChange={(e) => setClinicNameEn(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>เบอร์โทรศัพท์คลินิก *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={tel}
                      onChange={(e) => setTel(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>LINE Official Account ID *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={line}
                      onChange={(e) => setLine(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Address & GPS */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--staff-border)",
                  borderRadius: "14px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxShadow: "var(--staff-shadow-sm)",
                }}
              >
                <strong style={{ fontSize: "15px", color: "var(--staff-ink)" }}>
                  ที่อยู่และพิกัดแผนที่ (Location & Navigation)
                </strong>

                <div className="form-group">
                  <label>ที่อยู่และจุดสังเกต (ภาษาไทย)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={addressTh}
                    onChange={(e) => setAddressTh(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Address & Landmarks (English)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={addressEn}
                    onChange={(e) => setAddressEn(e.target.value)}
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>พิกัดละติจูด (Latitude)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>พิกัดลองจิจูด (Longitude)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ====================================================================
            TAB 4: การแจ้งเตือน & บัญชีผู้ใช้
            ==================================================================== */}
        {activeTab === "staff_notif" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* LINE Reminders */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid var(--staff-border)",
                borderRadius: "14px",
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                boxShadow: "var(--staff-shadow-sm)",
              }}
            >
              <strong style={{ fontSize: "15px", color: "var(--staff-ink)" }}>
                ระบบส่งข้อความแจ้งเตือนอัตโนมัติ (LINE Messaging API Reminders)
              </strong>

              <div
                style={{
                  background: "var(--staff-surface-subtle)",
                  padding: "14px 18px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <strong style={{ fontSize: "14px" }}>เตือนนัดหมายล่วงหน้า 1 วัน (D-1 Reminder)</strong>
                  <div style={{ fontSize: "12px", color: "var(--staff-ink-muted)", marginTop: "2px" }}>
                    ส่งข้อความเตือนผู้ปกครองทาง LINE ในช่วงเย็นก่อนถึงวันนัด 1 วัน
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="time"
                    className="form-control"
                    style={{ width: "105px", padding: "5px 8px" }}
                    value={d1ReminderTime}
                    onChange={(e) => setD1ReminderTime(e.target.value)}
                    disabled={!enableD1Reminder}
                  />
                  <input
                    type="checkbox"
                    checked={enableD1Reminder}
                    onChange={() => setEnableD1Reminder(!enableD1Reminder)}
                  />
                </div>
              </div>

              <div
                style={{
                  background: "var(--staff-surface-subtle)",
                  padding: "14px 18px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <strong style={{ fontSize: "14px" }}>เตือนนัดหมายในวันตรวจ (Day-Of Morning Reminder)</strong>
                  <div style={{ fontSize: "12px", color: "var(--staff-ink-muted)", marginTop: "2px" }}>
                    ส่งข้อความเตือนในเช้าวันนัดหมายเพื่อป้องกันการลืมนัด
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="time"
                    className="form-control"
                    style={{ width: "105px", padding: "5px 8px" }}
                    value={d0ReminderTime}
                    onChange={(e) => setD0ReminderTime(e.target.value)}
                    disabled={!enableD0Reminder}
                  />
                  <input
                    type="checkbox"
                    checked={enableD0Reminder}
                    onChange={() => setEnableD0Reminder(!enableD0Reminder)}
                  />
                </div>
              </div>

              <div
                style={{
                  background: "var(--staff-surface-subtle)",
                  padding: "14px 18px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <strong style={{ fontSize: "14px" }}>เสียงแจ้งเตือนเมื่อมีการจองออนไลน์ใหม่ (In-App Audio Chime)</strong>
                  <div style={{ fontSize: "12px", color: "var(--staff-ink-muted)", marginTop: "2px" }}>
                    ส่งเสียงแจ้งเตือนที่เครื่องเคาน์เตอร์ทันทีเมื่อคนไข้กดจองผ่าน LINE
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={soundAlerts}
                  onChange={() => setSoundAlerts(!soundAlerts)}
                />
              </div>
            </div>

            {/* Staff Users Roles */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid var(--staff-border)",
                borderRadius: "14px",
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                boxShadow: "var(--staff-shadow-sm)",
              }}
            >
              <strong style={{ fontSize: "15px", color: "var(--staff-ink)" }}>
                บัญชีผู้ใช้งานระบบคลินิก (Staff Accounts & Roles)
              </strong>

              <div className="staff-table-wrap">
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th>ชื่อ-นามสกุล</th>
                      <th>ชื่อผู้ใช้ (Username)</th>
                      <th>บทบาท (Role)</th>
                      <th>สิทธิ์การใช้งาน</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>พยาบาลขวัญใจ (Kwan)</strong>
                      </td>
                      <td>kwan_front</td>
                      <td>
                        <span className="status-pill completed">Front Desk & Admin</span>
                      </td>
                      <td style={{ fontSize: "12.5px", color: "var(--staff-ink-2)" }}>
                        จัดการนัดหมาย, คิวตรวจ, แก้ไขข้อมูลแพทย์, ตั้งค่าคลินิก
                      </td>
                      <td>
                        <span style={{ color: "#2b8a3e", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                          <IconCheck size={14} />
                          <span>กำลังใช้งาน</span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>ทันตแพทย์ประจำคลินิก (Dentist Roster)</strong>
                      </td>
                      <td>dentist_staff</td>
                      <td>
                        <span className="status-pill confirmed">Dentist (แพทย์)</span>
                      </td>
                      <td style={{ fontSize: "12.5px", color: "var(--staff-ink-2)" }}>
                        ดูตารางนัดหมาย, บันทึกการตรวจ, จัดการสถานะเคส
                      </td>
                      <td>
                        <span style={{ color: "#2b8a3e", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                          <IconCheck size={14} />
                          <span>ใช้งานได้</span>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Developer Reset Section */}
            <div
              style={{
                background: "#fff5f5",
                border: "1px solid #ffc9c9",
                borderRadius: "14px",
                padding: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <strong style={{ fontSize: "14px", color: "#e03131" }}>
                  รีเซ็ตข้อมูลตัวอย่างทั้งหมด (Reset Demo Seed Data)
                </strong>
                <div style={{ fontSize: "12px", color: "#c92a2a", marginTop: "2px" }}>
                  ล้างข้อมูลใน localStorage และโหลดตัวอย่างเริ่มต้น (นัดหมาย, คนไข้, แพทย์)
                </div>
              </div>

              <button
                type="button"
                className="btn-secondary-staff"
                style={{ color: "#e03131", borderColor: "#ffc9c9", background: "#ffffff" }}
                onClick={handleResetData}
              >
                <IconZap size={14} />
                <span>รีเซ็ตข้อมูลเริ่มต้น</span>
              </button>
            </div>
          </div>
        )}

        {/* Global Save Button */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "16px 0",
            borderTop: "1px solid var(--staff-border)",
            gap: "12px",
          }}
        >
          <button type="submit" className="btn-primary-staff" style={{ padding: "9px 22px" }}>
            <IconCheck size={16} />
            <span>บันทึกการตั้งค่าทั้งหมด</span>
          </button>
        </div>
      </form>
    </div>
  );
}
