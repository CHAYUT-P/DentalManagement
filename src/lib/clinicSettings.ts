import { hours as clinicHours, type DayKey } from "@/data/clinic";

/**
 * The clinic's weekly schedule + special holidays (closed dates), shared by
 * the staff settings page (which edits them) and the patient booking calendar
 * (which blocks those days). Persisted in localStorage by the staff store —
 * same pattern as appointments/dentists/prices.
 */

export interface ClinicDaySetting {
  day: DayKey;
  isOpen: boolean;
  start: string; // HH:MM
  end: string; // HH:MM
}

export interface HolidayItem {
  id: number | string;
  /** first closed day, YYYY-MM-DD */
  start: string;
  /** last closed day, YYYY-MM-DD — equals start for a single day off */
  end: string;
  name: string;
}

export const SCHEDULE_KEY = "dk:staff:store_v1:schedule";
export const HOLIDAYS_KEY = "dk:staff:store_v1:holidays";

const DAY_KEYS: ReadonlySet<string> = new Set([
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
]);

export function defaultSchedule(): ClinicDaySetting[] {
  return clinicHours.map((h) => {
    const parts = h.hours ? h.hours.split(" - ") : ["09:00", "18:00"];
    return {
      day: h.day,
      isOpen: h.hours !== null,
      start: parts[0] || "09:00",
      end: parts[1] || (h.day === "fri" ? "20:00" : h.day === "sat" ? "17:00" : "18:00"),
    };
  });
}

export function defaultHolidays(): HolidayItem[] {
  return [
    { id: "h1", start: "2026-12-31", end: "2026-12-31", name: "วันสิ้นปี" },
    { id: "h2", start: "2027-01-01", end: "2027-01-01", name: "วันขึ้นปีใหม่" },
    { id: "h3", start: "2027-04-13", end: "2027-04-15", name: "วันสงกรานต์" },
  ];
}

function isValidSchedule(v: unknown): v is ClinicDaySetting[] {
  if (!Array.isArray(v) || v.length !== 7) return false;
  const seen = new Set<string>();
  for (const r of v) {
    if (!r || typeof r !== "object") return false;
    const row = r as ClinicDaySetting;
    if (!DAY_KEYS.has(row.day)) return false;
    if (typeof row.isOpen !== "boolean") return false;
    if (typeof row.start !== "string" || typeof row.end !== "string") return false;
    if (seen.has(row.day)) return false;
    seen.add(row.day);
  }
  return true;
}

function isValidHolidays(v: unknown): v is HolidayItem[] {
  return (
    Array.isArray(v) &&
    v.every((h) => {
      if (!h || typeof h !== "object") return false;
      const item = h as HolidayItem & { date?: unknown };
      // legacy single-date shape { id, date, name } is migrated on load
      const start = typeof item.start === "string" ? item.start : item.date;
      const end = typeof item.end === "string" ? item.end : item.date;
      return (
        typeof item.id === "string" &&
        typeof start === "string" &&
        typeof end === "string" &&
        typeof item.name === "string"
      );
    })
  );
}

/** range check — ISO days compare lexicographically */
export function holidayCovers(h: { start: string; end: string }, iso: string): boolean {
  return iso >= h.start && iso <= h.end;
}

/* ------------------------------------------------------------------ */
/* Patient lookup (returning-patient matching by phone number)         */
/*                                                                     */
/* The staff store persists patient records under PATIENTS_KEY. The    */
/* patient booking flow reads the same key to recognize a returning    */
/* family by phone — in production this becomes a backend lookup by    */
/* tel / LINE userId, but the matching rules stay the same.            */
/* ------------------------------------------------------------------ */

export interface StoredChild {
  id: string;
  name: string;
}

export interface StoredPatient {
  id: string;
  guardianName: string;
  phone: string;
  children: StoredChild[];
}

export const PATIENTS_KEY = "dk:staff:store_v1:patients";

export function digitsOnly(s: string): string {
  return (s || "").replace(/[^0-9]/g, "");
}

/** normalize a Thai child name so "น้องเจได", "เจได", "ด.ช.เจได" and
 *  "น้องเจได (Jedi)" all match */
export function normalizeName(s: string): string {
  return (s || "")
    .replace(/\(.*?\)/g, " ")
    .trim()
    .replace(/^(น้อง|ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง|นาย|นาง|น\.ส\.|คุณ)\s*/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isValidPatients(v: unknown): v is StoredPatient[] {
  return (
    Array.isArray(v) &&
    v.every((p) => {
      if (!p || typeof p !== "object") return false;
      const rec = p as StoredPatient;
      return (
        typeof rec.id === "string" &&
        typeof rec.guardianName === "string" &&
        typeof rec.phone === "string" &&
        Array.isArray(rec.children) &&
        rec.children.every(
          (c) => c && typeof c === "object" && typeof c.id === "string" && typeof c.name === "string",
        )
      );
    })
  );
}

export function loadPatients(): StoredPatient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PATIENTS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValidPatients(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/** all patient records whose phone matches (dashes/spaces ignored) */
export function findPatientsByPhone(tel: string): StoredPatient[] {
  const want = digitsOnly(tel);
  if (!want) return [];
  return loadPatients().filter((p) => digitsOnly(p.phone) === want);
}

export function loadSchedule(): ClinicDaySetting[] {
  if (typeof window === "undefined") return defaultSchedule();
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValidSchedule(parsed)) return parsed;
    }
  } catch {}
  return defaultSchedule();
}

export function loadHolidays(): HolidayItem[] {
  if (typeof window === "undefined") return defaultHolidays();
  try {
    const raw = localStorage.getItem(HOLIDAYS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValidHolidays(parsed)) {
        // normalize legacy { date } entries to { start, end }
        return parsed.map((h) => {
          const legacy = h as HolidayItem & { date?: string };
          const start = legacy.start ?? legacy.date ?? "";
          const end = legacy.end ?? legacy.date ?? start;
          return { id: legacy.id, start, end, name: legacy.name };
        });
      }
    }
  } catch {}
  return defaultHolidays();
}
