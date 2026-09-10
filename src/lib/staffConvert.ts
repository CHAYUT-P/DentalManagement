import type { StaffAppointment, EditableDentist, PatientRecord, WaitlistEntry, StaffNotification, ShiftHour } from "@/lib/staffStore";
import type {
  AppointmentDTO,
  DentistDTO,
  GuardianDTO,
  NotificationDTO,
  WaitlistDTO,
} from "@/server/queries";

/**
 * DB → staff-UI adapters. The staff console's components render the shapes from
 * src/lib/staffStore.tsx (StaffAppointment, EditableDentist, PatientRecord…);
 * the database stores the same facts normalised across tables. These pure
 * functions convert one to the other so the UI keeps working unchanged while
 * the storage underneath becomes Postgres.
 */

export function toUIAppointment(a: AppointmentDTO): StaffAppointment {
  return {
    id: String(a.id),
    ref: a.ref,
    date: a.date,
    time: a.time,
    durationMin: a.durationMin,
    childName: a.childName,
    guardianName: a.guardianName,
    phone: a.phone,
    dentistSlug: a.dentistSlug,
    treatmentKey: a.treatmentKey,
    source: a.source,
    status: a.status,
    notes: a.note,
    price: a.price ?? undefined,
    forSelf: a.forSelf,
    createdAt: a.date,
  };
}

export function toUIAppointments(list: AppointmentDTO[]): StaffAppointment[] {
  return list.map(toUIAppointment);
}

export function toUIEditableDentist(d: DentistDTO): EditableDentist {
  const shifts: ShiftHour[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
    const s = d.shifts.find((x) => x.weekday === weekday);
    return {
      weekday,
      enabled: s?.enabled ?? false,
      start: s?.start ?? "09:00",
      end: s?.end ?? "17:00",
    };
  });
  return {
    ...({ _id: d.id } as object), // the DB id, carried for booking mutations
    slug: d.slug,
    years: d.years,
    tint: d.tint as EditableDentist["tint"],
    face: d.face as EditableDentist["face"],
    photo: { small: d.photoSmall, large: d.photoLarge },
    treats: d.treats,
    text: d.text as EditableDentist["text"],
    isActive: d.isActive,
    shifts,
  };
}

export function toUIEditableDentists(list: DentistDTO[]): EditableDentist[] {
  return list.map(toUIEditableDentist);
}

export function toUIPatient(g: GuardianDTO): PatientRecord {
  return {
    id: String(g.id),
    guardianName: g.name,
    phone: g.phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3"),
    lineId: g.lineUserId ?? undefined,
    children: g.children.map((c) => ({
      id: String(c.id),
      name: c.name,
      age: c.age ?? undefined,
      birthdate: c.birthdate ?? undefined,
      allergies: c.allergies,
      notes: c.notes,
    })),
    registeredAt: g.registeredAt,
  };
}

export function toUIPatients(list: GuardianDTO[]): PatientRecord[] {
  return list.map(toUIPatient);
}

export function toUIWaitlistEntry(w: WaitlistDTO): WaitlistEntry {
  return {
    id: String(w.id),
    childName: w.childName,
    guardianPhone: w.guardianPhone,
    treatmentKey: w.treatmentKey,
    dentistSlug: w.dentistSlug ?? undefined,
    arrivedAt: w.arrivedAt,
    status: w.status,
    notes: w.note,
  };
}

export function toUIWaitlist(list: WaitlistDTO[]): WaitlistEntry[] {
  return list.map(toUIWaitlistEntry);
}

export function toUINotification(n: NotificationDTO): StaffNotification {
  return {
    id: String(n.id),
    type: n.type as StaffNotification["type"],
    title: n.title,
    body: n.body,
    time: n.createdAt.slice(11, 16),
    unread: !n.isRead,
    refCode: n.refCode ?? undefined,
  };
}

export function toUINotifications(list: NotificationDTO[]): StaffNotification[] {
  return list.map(toUINotification);
}
