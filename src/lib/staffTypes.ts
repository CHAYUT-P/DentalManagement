import type { IconKey } from "@/data/icons";

/**
 * The staff console's UI types. They used to live inside staffStore.tsx; they
 * are extracted here so server-side modules can import them without pulling in
 * the client store (and its React context) into the server bundle.
 */

export type AppointmentStatus = "confirmed" | "completed" | "cancelled";
export type BookingSource = "online" | "phone" | "walkin";

export interface StaffAppointment {
  id: string;
  ref: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMin: number;
  childName: string;
  childAge?: number;
  guardianName: string;
  phone: string;
  dentistSlug: string;
  /** null = pooled "any dentist" booking still waiting for assignment */
  dentistId: number | null;
  treatmentKey: IconKey;
  source: BookingSource;
  status: AppointmentStatus;
  notes?: string;
  price?: number;
  createdAt: string;
  /** true when the patient booked for themselves (adult, no child involved) */
  forSelf?: boolean;
}

export interface ShiftHour {
  weekday: number; // 0 = Sun, 1 = Mon … 6 = Sat
  enabled: boolean;
  start: string;
  end: string;
}

export interface EditableDentist {
  slug: string;
  years: number;
  tint: string;
  face: Record<string, unknown>;
  photo: { small: string; large: string };
  treats: IconKey[];
  text: Record<"th" | "en", {
    name: string;
    title: string;
    blurb: string;
    bio: string;
    credentials: string[];
    languages: string;
    days: string;
  }>;
  isActive: boolean;
  shifts: ShiftHour[];
}

export interface PatientChild {
  id: string;
  /** everyday display name, e.g. "น้องเจได" */
  name: string;
  fullName?: string;
  nickname?: string;
  birthdate?: string;
  age?: number;
  gender?: "male" | "female";
  hn?: string;
  bloodType?: "" | "A" | "B" | "O" | "AB";
  conditions?: string;
  medications?: string;
  allergies?: string;
  notes?: string;
}

export interface PatientRecord {
  id: string;
  guardianName: string;
  guardianFullName?: string;
  guardianRelation?: string;
  phone: string;
  lineId?: string;
  address?: string;
  children: PatientChild[];
  registeredAt: string;
}

export interface WaitlistEntry {
  id: string;
  childName: string;
  guardianPhone: string;
  treatmentKey: IconKey;
  dentistSlug?: string;
  arrivedAt: string;
  status: "waiting" | "in_chair" | "done";
  notes?: string;
}

export interface StaffNotification {
  id: string;
  type: "online_booking" | "cancellation" | "check_in" | "reminder";
  title: string;
  body: string;
  time: string;
  unread: boolean;
  refCode?: string;
}
