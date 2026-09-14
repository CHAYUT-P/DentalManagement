"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { IconKey } from "@/data/icons";
import type { ClinicDaySetting } from "@/lib/clinicSettings";
import { todayISO } from "@/lib/dates";
import {
  assignPoolDentist,
  staffAddChild,
  staffAddHoliday,
  staffAddWaitlist,
  staffCreateAppointment,
  staffCreateDentist,
  staffDeleteAppointment,
  staffMarkNotificationsRead,
  staffRemoveHoliday,
  staffRemoveWaitlist,
  staffSetQueueStatus,
  staffSetWaitlistStatus,
  staffUpdateAppointment,
  staffUpdateChairs,
  staffUpdateDay,
  staffUpdateDentist,
  staffUpdatePatient,
  staffUpdatePrice,
  staffResetDemoData,
  staffBootstrap,
  staffUpsertPatient,
  type StaffBootstrap,
} from "@/server/actions";
import type {
  AppointmentStatus,
  EditableDentist,
  PatientRecord,
  StaffAppointment,
  StaffNotification,
  WaitlistEntry,
} from "@/lib/staffTypes";

/**
 * The staff console's state — now backed by Postgres.
 *
 * The provider fetches its working state from the server (`staffBootstrap`)
 * and every mutation goes through a Server Action, then re-reads the
 * bootstrap so every page (and the patient site) shows the same truth.
 * The old localStorage mirror is gone; the database is the store.
 *
 * `initial` is supplied by the staff layout (a server component) so the first
 * paint already has data; `refresh()` re-fetches after each mutation.
 */

export type {
  AppointmentStatus,
  BookingSource,
  StaffAppointment,
  EditableDentist,
  PatientRecord,
  PatientChild,
  WaitlistEntry,
  StaffNotification,
  ShiftHour,
} from "@/lib/staffTypes";

interface StaffContextType {
  today: string;
  appointments: StaffAppointment[];
  dentists: EditableDentist[];
  patients: PatientRecord[];
  waitlist: WaitlistEntry[];
  notifications: StaffNotification[];
  servicePrices: Record<IconKey, number | null>;
  schedule: ClinicDaySetting[];
  holidays: { id: number; start: string; end: string; name: string }[];
  /** booking-rules knobs (chairs caps one wall-clock slot) */
  settings: { chairs: number };
  updateChairs: (chairs: number) => void;
  /** hand a pooled ("any dentist") booking to a dentist */
  assignDentist: (id: string, dentistSlug: string) => void;
  // Actions — same names the UI already calls; each writes to Postgres
  createAppointment: (data: Omit<StaffAppointment, "id" | "ref" | "createdAt" | "dentistId">) => StaffAppointment;
  updateAppointment: (id: string, updates: Partial<StaffAppointment>) => void;
  updateStatus: (id: string, status: AppointmentStatus) => void;
  /** queue transitions — check-in stamps the clinic clock server-side */
  setQueueStatus: (id: string, status: "arrived" | "in_chair" | "completed" | "no_show") => void;
  rescheduleAppointment: (id: string, date: string, time: string, dentistSlug?: string) => void;
  deleteAppointment: (id: string) => void;
  updateDentist: (slug: string, updates: Partial<EditableDentist>) => void;
  createDentist: (input: Parameters<typeof staffCreateDentist>[0]) => void;
  createPatient: (data: Omit<PatientRecord, "id" | "registeredAt">) => void;
  updatePatient: (id: string, updates: Partial<PatientRecord>) => void;
  addPatientChild: (patientId: string, name: string) => void;
  addWaitlist: (entry: Omit<WaitlistEntry, "id" | "arrivedAt" | "status">) => void;
  updateWaitlistStatus: (id: string, status: WaitlistEntry["status"], dentistSlug?: string) => void;
  removeWaitlist: (id: string) => void;
  updateServicePrice: (key: IconKey, price: number | null) => void;
  updateDayOpen: (day: ClinicDaySetting["day"], isOpen: boolean) => void;
  updateDayTime: (day: ClinicDaySetting["day"], field: "start" | "end", val: string) => void;
  addHoliday: (start: string, end: string, name: string) => void;
  removeHoliday: (id: number | string) => void;
  markAllNotificationsRead: () => void;
  simulateOnlineBooking: () => void;
  resetAllData: () => void;
  toast: string | null;
  showToast: (msg: string) => void;
  walkinOpen: boolean;
  setWalkinOpen: (open: boolean) => void;
  /** true while a mutation round-trip is in flight */
  syncing: boolean;
}

const StaffContext = createContext<StaffContextType | null>(null);

/** the bootstrap's schedule rows already match ClinicDaySetting */
function asClinicSchedule(rows: StaffBootstrap["schedule"]): ClinicDaySetting[] {
  return rows.map((r) => ({ day: r.day as ClinicDaySetting["day"], isOpen: r.isOpen, start: r.start, end: r.end }));
}

export function StaffProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial: StaffBootstrap;
}) {
  const [state, setState] = useState<StaffBootstrap>(initial);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [walkinOpen, setWalkinOpen] = useState(false);

  const today = state.today || todayISO();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((current) => (current === msg ? null : current)), 3000);
  }, []);

  /**
   * Run a mutation against the server, then pull fresh state. Errors surface
   * as a toast; the UI stays usable because state only changes on success.
   */
  const mutate = useCallback(
    async (what: string, fn: () => Promise<unknown>) => {
      setSyncing(true);
      try {
        await fn();
        const fresh = await staffBootstrap();
        setState(fresh);
      } catch (e) {
        console.error(e);
        showToast(`ข้อผิดพลาด: ${what} ไม่สำเร็จ`);
      } finally {
        setSyncing(false);
      }
    },
    [showToast],
  );

  const slugToId = useMemo(() => {
    const m = new Map<string, number>();
    // the bootstrap's dentists carry the DB id in `_id` (set by the converter)
    for (const d of state.dentists) {
      const withId = d as EditableDentist & { _id?: number };
      if (typeof withId._id === "number") m.set(d.slug, withId._id);
    }
    return m;
  }, [state.dentists]);

  /* ── appointments ──────────────────────────────────────────────────────── */

  const createAppointment = useCallback(
    (data: Omit<StaffAppointment, "id" | "ref" | "createdAt" | "dentistId">): StaffAppointment => {
      // optimistic shell so the modal can close at once; the real row lands
      // with the refresh a moment later (ref may differ if of a race)
      const optimistic: StaffAppointment = {
        ...data,
        dentistId: null,
        id: `pending-${Date.now()}`,
        ref: "…",
        createdAt: data.date,
      };
      void mutate("บันทึกนัดหมาย", () =>
        staffCreateAppointment({
          date: data.date,
          time: data.time,
          treatmentKey: data.treatmentKey,
          dentistId: slugToId.get(data.dentistSlug) ?? 0,
          childName: data.childName,
          guardianName: data.guardianName,
          phone: data.phone,
          source: data.source,
          note: data.notes,
          price: data.price ?? null,
        }),
      );
      return optimistic;
    },
    [mutate, slugToId],
  );

  const updateAppointment = useCallback(
    (id: string, updates: Partial<StaffAppointment>) => {
      const numeric = Number(id);
      if (!Number.isFinite(numeric)) return; // optimistic shell, not yet persisted
      void mutate("แก้ไขนัดหมาย", () =>
        staffUpdateAppointment(numeric, {
          date: updates.date,
          time: updates.time,
          dentistId: updates.dentistSlug ? slugToId.get(updates.dentistSlug) : undefined,
          note: updates.notes,
          price: updates.price,
          childName: updates.childName,
          guardianName: updates.guardianName,
          phone: updates.phone,
          status: updates.status,
        }),
      );
    },
    [mutate, slugToId],
  );

  const updateStatus = useCallback(
    (id: string, status: AppointmentStatus) => {
      updateAppointment(id, { status });
    },
    [updateAppointment],
  );

  const setQueueStatus = useCallback(
    (id: string, status: "arrived" | "in_chair" | "completed" | "no_show") => {
      const numeric = Number(id);
      if (!Number.isFinite(numeric)) return;
      void mutate("อัปเดตคิว", () => staffSetQueueStatus(numeric, status));
    },
    [mutate],
  );

  const rescheduleAppointment = useCallback(
    (id: string, date: string, time: string, dentistSlug?: string) => {
      updateAppointment(id, { date, time, dentistSlug, status: "confirmed" });
    },
    [updateAppointment],
  );

  const deleteAppointment = useCallback(
    (id: string) => {
      const numeric = Number(id);
      if (!Number.isFinite(numeric)) return;
      void mutate("ลบนัดหมาย", () => staffDeleteAppointment(numeric));
    },
    [mutate],
  );

  /* ── dentists ──────────────────────────────────────────────────────────── */

  const updateDentist = useCallback(
    (slug: string, updates: Partial<EditableDentist>) => {
      void mutate("บันทึกข้อมูลแพทย์", () =>
        staffUpdateDentist(slug, {
          years: updates.years,
          tint: updates.tint,
          isActive: updates.isActive,
          photoSmall: updates.photo?.small,
          photoLarge: updates.photo?.large,
          text: updates.text,
          treats: updates.treats,
          shifts: updates.shifts,
        }),
      );
    },
    [mutate],
  );

  const createDentist = useCallback(
    (input: Parameters<typeof staffCreateDentist>[0]) => {
      void mutate("เพิ่มทันตแพทย์", () => staffCreateDentist(input));
    },
    [mutate],
  );

  /* ── patients ──────────────────────────────────────────────────────────── */

  const createPatient = useCallback(
    (data: Omit<PatientRecord, "id" | "registeredAt">) => {
      void mutate("เพิ่มผู้ปกครอง", () =>
        staffUpsertPatient({
          name: data.guardianName,
          phone: data.phone,
          address: data.address,
          children: data.children.map((c) => ({ name: c.name })),
        }),
      );
    },
    [mutate],
  );

  const updatePatient = useCallback(
    (id: string, updates: Partial<PatientRecord>) => {
      void mutate("บันทึกข้อมูลผู้ปกครอง", () =>
        staffUpdatePatient(Number(id), {
          name: updates.guardianName,
          phone: updates.phone,
          address: updates.address,
        }),
      );
    },
    [mutate],
  );

  const addPatientChild = useCallback(
    (patientId: string, name: string) => {
      void mutate("เพิ่มเด็ก", () => staffAddChild(Number(patientId), name));
    },
    [mutate],
  );

  /* ── waitlist ──────────────────────────────────────────────────────────── */

  const addWaitlist = useCallback(
    (entry: Omit<WaitlistEntry, "id" | "arrivedAt" | "status">) => {
      void mutate("ลงชื่อ Walk-in", () =>
        staffAddWaitlist({
          childName: entry.childName,
          guardianPhone: entry.guardianPhone,
          treatmentKey: entry.treatmentKey,
          dentistId: entry.dentistSlug ? slugToId.get(entry.dentistSlug) ?? null : null,
          note: entry.notes,
        }),
      );
    },
    [mutate, slugToId],
  );

  const updateWaitlistStatus = useCallback(
    (id: string, status: WaitlistEntry["status"], dentistSlug?: string) => {
      void mutate("อัปเดตคิว", () =>
        staffSetWaitlistStatus(Number(id), status, dentistSlug ? slugToId.get(dentistSlug) ?? null : undefined),
      );
    },
    [mutate, slugToId],
  );

  const removeWaitlist = useCallback(
    (id: string) => {
      void mutate("ลบคิว", () => staffRemoveWaitlist(Number(id)));
    },
    [mutate],
  );

  /* ── pool ("any dentist") assignment ─────────────────────────────────── */

  const assignDentist = useCallback(
    (id: string, dentistSlug: string) => {
      const numeric = Number(id);
      const dentistId = slugToId.get(dentistSlug);
      if (!Number.isFinite(numeric) || dentistId === undefined) return;
      void mutate("จัดแพทย์", async () => {
        const res = await assignPoolDentist(numeric, dentistId);
        if (!res.ok) showToast("เวลานั้นไม่ว่างแล้ว กรุณาเลือกแพทย์ท่านอื่น");
      });
    },
    [mutate, slugToId, showToast],
  );

  /* ── prices / schedule / holidays ──────────────────────────────────────── */

  const updateServicePrice = useCallback(
    (key: IconKey, price: number | null) => {
      setState((s) => ({ ...s, servicePrices: { ...s.servicePrices, [key]: price } }));
      void mutate("บันทึกราคา", () => staffUpdatePrice(key, price));
    },
    [mutate],
  );

  const updateDayOpen = useCallback(
    (day: ClinicDaySetting["day"], isOpen: boolean) => {
      setState((s) => ({ ...s, schedule: s.schedule.map((d) => (d.day === day ? { ...d, isOpen } : d)) }));
      void mutate("บันทึกวันทำการ", () => staffUpdateDay(day, { isOpen }));
    },
    [mutate],
  );

  const updateDayTime = useCallback(
    (day: ClinicDaySetting["day"], field: "start" | "end", val: string) => {
      setState((s) => ({ ...s, schedule: s.schedule.map((d) => (d.day === day ? { ...d, [field]: val } : d)) }));
      void mutate("บันทึกเวลาทำการ", () => staffUpdateDay(day, { [field]: val }));
    },
    [mutate],
  );

  const addHoliday = useCallback(
    (start: string, end: string, name: string) => {
      void mutate("เพิ่มวันหยุด", () => staffAddHoliday(start, end, name));
    },
    [mutate],
  );

  const removeHoliday = useCallback(
    (id: number | string) => {
      void mutate("ลบวันหยุด", () => staffRemoveHoliday(Number(id)));
    },
    [mutate],
  );

  const updateChairs = useCallback(
    (chairs: number) => {
      const n = Number.isFinite(chairs) && chairs > 0 ? Math.floor(chairs) : 3;
      setState((s) => ({ ...s, settings: { ...s.settings, chairs: n } }));
      void mutate("บันทึกจำนวนเก้าอี้", () => staffUpdateChairs(n));
    },
    [mutate],
  );

  /* ── notifications / demo helpers ──────────────────────────────────────── */

  const markAllNotificationsRead = useCallback(() => {
    void mutate("อ่านแจ้งเตือน", () => staffMarkNotificationsRead());
  }, [mutate]);

  const simulateOnlineBooking = useCallback(() => {
    const picks = [
      { child: "น้องภูผา", age: 6, parent: "คุณแม่อริสา", phone: "0819987766", treat: "fluoride" as IconKey, doc: "naree" },
      { child: "น้องพอร์ช", age: 4, parent: "คุณพ่อวิเชียร", phone: "0897765544", treat: "checkup" as IconKey, doc: "manee" },
      { child: "น้องลลิน", age: 7, parent: "คุณแม่สุชาดา", phone: "0853321100", treat: "filling" as IconKey, doc: "siriporn" },
    ];
    const pick = picks[Math.floor(Math.random() * picks.length)];
    const times = ["14:00", "15:30", "16:00", "16:30"];
    const time = times[Math.floor(Math.random() * times.length)];
    createAppointment({
      date: today,
      time,
      durationMin: 30,
      childName: pick.child,
      childAge: pick.age,
      guardianName: pick.parent,
      phone: pick.phone,
      dentistSlug: pick.doc,
      treatmentKey: pick.treat,
      source: "online",
      status: "confirmed",
      notes: "จองผ่าน LINE LIFF ออนไลน์ (จำลอง)",
      price: state.servicePrices[pick.treat] ?? 300,
    });
    showToast("จำลองการจองออนไลน์เรียบร้อย");
  }, [createAppointment, today, state.servicePrices, showToast]);

  const resetAllData = useCallback(() => {
    void mutate("รีเซ็ตข้อมูล", () => staffResetDemoData());
    showToast("รีเซ็ตข้อมูลตัวอย่างแล้ว");
  }, [mutate, showToast]);

  const value = useMemo<StaffContextType>(
    () => ({
      today,
      appointments: state.appointments,
      dentists: state.dentists,
      patients: state.patients,
      waitlist: state.waitlist,
      notifications: state.notifications,
      servicePrices: state.servicePrices,
      schedule: asClinicSchedule(state.schedule),
      holidays: state.holidays,
      settings: state.settings ?? { chairs: 3 },
      updateChairs,
      assignDentist,
      createAppointment,
      updateAppointment,
      updateStatus,
      setQueueStatus,
      rescheduleAppointment,
      deleteAppointment,
      updateDentist,
      createDentist,
      createPatient,
      updatePatient,
      addPatientChild,
      addWaitlist,
      updateWaitlistStatus,
      removeWaitlist,
      updateServicePrice,
      updateDayOpen,
      updateDayTime,
      addHoliday,
      removeHoliday,
      markAllNotificationsRead,
      simulateOnlineBooking,
      resetAllData,
      toast,
      showToast,
      walkinOpen,
      setWalkinOpen,
      syncing,
    }),
    [
      today, state, toast, showToast, walkinOpen, syncing,
      createAppointment, updateAppointment, updateStatus, setQueueStatus, rescheduleAppointment,
      deleteAppointment, updateDentist, createDentist, createPatient, updatePatient, addPatientChild,
      addWaitlist, updateWaitlistStatus, removeWaitlist, updateServicePrice,
      updateDayOpen, updateDayTime, addHoliday, removeHoliday, updateChairs, assignDentist,
      markAllNotificationsRead, simulateOnlineBooking, resetAllData,
    ],
  );

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaff() {
  const context = useContext(StaffContext);
  if (!context) {
    throw new Error("useStaff must be used within a StaffProvider");
  }
  return context;
}
