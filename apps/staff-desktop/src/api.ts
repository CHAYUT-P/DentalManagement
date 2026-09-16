import type { IconKey } from "@/data/icons";
import type { ClinicDaySetting } from "@/lib/clinicSettings";
import type {
  EditableDentist,
  PatientRecord,
  StaffAppointment,
  StaffNotification,
  WaitlistEntry,
} from "@/lib/staffTypes";

/**
 * The desktop app's data layer — the same names the web console's server
 * actions export, so shared files (staffStore, pages) work unchanged. Each is
 * a POST to /api/staff carrying the bearer token the PIN login returned.
 *
 * The token lives in localStorage — the Tauri webview's storage persists, so
 * the desk stays signed in between launches like the web console's cookie.
 */

/** the hosted app origin — also where the sidebar's "patient web" link points.
 *  The double cast keeps both configs happy: vite/client gives env a Record
 *  shape, Next's tsconfig gives it ImportMetaEnv — either way it's a plain
 *  string map at runtime. */
const viteEnv = import.meta.env as unknown as Record<string, string | undefined>;
export const API_BASE = viteEnv?.VITE_API_URL ?? "https://denta-kids-ten.vercel.app";

/** clinic PIN baked into the build — the app signs itself in, no login screen */
const EMBEDDED_PIN = viteEnv?.VITE_STAFF_PIN ?? "";

const API = API_BASE;

const TOKEN_KEY = "dk:staff-token";
let token = localStorage.getItem(TOKEN_KEY) ?? "";

export function hasStaffToken(): boolean {
  return token.length > 0;
}

/**
 * Silent sign-in for clinic builds: if there's no stored token but the build
 * carries the embedded PIN, exchange it once. Returns false when the build
 * has no PIN — the caller then shows the manual login screen.
 */
export async function ensureStaffToken(): Promise<boolean> {
  if (token) return true;
  if (!EMBEDDED_PIN) return false;
  const res = await staffLogin(EMBEDDED_PIN);
  return res.ok;
}

export function staffLogout(): void {
  token = "";
  localStorage.removeItem(TOKEN_KEY);
}

export async function staffLogin(pin: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API}/api/staff/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  const data = (await res.json()) as { ok: boolean; token?: string };
  if (data.ok && data.token) {
    token = data.token;
    localStorage.setItem(TOKEN_KEY, token);
    return { ok: true };
  }
  return { ok: false };
}

async function call<T>(action: string, args: unknown[] = []): Promise<T> {
  const res = await fetch(`${API}/api/staff`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, args }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: T;
    error?: string;
  };
  if (!res.ok) {
    if (res.status === 401) staffLogout();
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data.result as T;
}

/* ── shapes ─────────────────────────────────────────────────────────────── */

export interface StaffBootstrap {
  today: string;
  appointments: StaffAppointment[];
  dentists: EditableDentist[];
  patients: PatientRecord[];
  waitlist: WaitlistEntry[];
  notifications: StaffNotification[];
  schedule: ClinicDaySetting[];
  holidays: { id: number; start: string; end: string; name: string }[];
  servicePrices: Record<IconKey, number | null>;
  settings: { chairs: number };
}

/* ── reads ──────────────────────────────────────────────────────────────── */

export function staffBootstrap() {
  return call<StaffBootstrap>("bootstrap");
}
export function staffPrices() {
  return call<Record<IconKey, number | null>>("prices");
}

/* ── appointments ───────────────────────────────────────────────────────── */

export function staffCreateAppointment(input: {
  date: string;
  time: string;
  treatmentKey: IconKey;
  dentistId: number;
  childName: string;
  guardianName: string;
  phone: string;
  source: "phone" | "walkin" | "online";
  note?: string;
  price?: number | null;
}) {
  return call<string | null>("createAppointment", [input]);
}

export function staffUpdateAppointment<T extends object>(id: number, patch: T) {
  return call<void>("updateAppointment", [id, patch]);
}

export function staffDeleteAppointment(id: number) {
  return call<void>("deleteAppointment", [id]);
}

export function staffSetQueueStatus(
  id: number,
  status: "arrived" | "in_chair" | "completed" | "no_show",
) {
  return call<void>("setQueueStatus", [id, status]);
}

export function assignPoolDentist(id: number, dentistId: number) {
  return call<{ ok: boolean; error?: "taken" | "invalid" }>("assignPoolDentist", [id, dentistId]);
}

export function staffUpdateChairs(chairs: number) {
  return call<void>("updateChairs", [chairs]);
}

/* ── dentists / patients / waitlist ─────────────────────────────────────── */

export function staffUpdateDentist<T extends object>(slug: string, patch: T) {
  return call<void>("updateDentist", [slug, patch]);
}

export function staffCreateDentist<T extends object>(input: T) {
  return call<void>("createDentist", [input]);
}

export function staffUpsertPatient(input: {
  name: string;
  phone: string;
  address?: string;
  children?: { name: string }[];
}) {
  return call<void>("upsertPatient", [input]);
}

export function staffUpdatePatient<T extends object>(id: number, patch: T) {
  return call<void>("updatePatient", [id, patch]);
}

export function staffAddChild(patientId: number, name: string) {
  return call<void>("addChild", [patientId, name]);
}

export function staffAddWaitlist<T extends object>(input: T) {
  return call<void>("addWaitlist", [input]);
}

export function staffSetWaitlistStatus(
  id: number,
  status: WaitlistEntry["status"],
  dentistId?: number | null,
) {
  return call<void>("setWaitlistStatus", [id, status, dentistId]);
}

export function staffRemoveWaitlist(id: number) {
  return call<void>("removeWaitlist", [id]);
}

/* ── prices / schedule / holidays / notifications ───────────────────────── */

export function staffUpdatePrice(key: IconKey, price: number | null) {
  return call<void>("updatePrice", [key, price]);
}

export function staffUpdateDay<T extends object>(day: string, patch: T) {
  return call<void>("updateDay", [day, patch]);
}

export function staffUpdateClinicInfo<T extends object>(patch: T) {
  return call<void>("updateClinicInfo", [patch]);
}

export function staffAddHoliday(start: string, end: string, name: string) {
  return call<void>("addHoliday", [start, end, name]);
}

export function staffRemoveHoliday(id: number) {
  return call<void>("removeHoliday", [id]);
}

export function staffMarkNotificationsRead() {
  return call<void>("markNotificationsRead");
}

export function staffResetDemoData() {
  return call<void>("resetDemoData");
}
