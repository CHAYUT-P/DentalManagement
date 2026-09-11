import { sql } from "drizzle-orm";

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Denta Kids — database schema.
 *
 * Conventions
 * -----------
 * · `snake_case` in Postgres, camelCase in TypeScript (drizzle maps them).
 * · Every table carries `created_at`; mutable ones also `updated_at`
 *   (maintained by `touch()` in src/db/queries.ts — one place to keep honest).
 * · Currency is integer baht — no floats for money.
 * · `IconKey`-shaped columns (treatment keys, tints, slugs) are plain text at
 *   the DB level; validation against the union types happens in the data layer,
 *   so the app can grow a new treatment without a migration.
 * · Timezone is Asia/Bangkok. A slot is `date` + `time` (clinic-local), stored
 *   as two columns rather than a timestamptz — the clinic books in wall-clock
 *   time, and this keeps "09:30" meaning 09:30 at the front desk.
 */

/* ────────────────────────────── content the patient site shows ─────────── */

/**
 * The dentist roster. The two-language profile copy lives in dentist_text
 * (one row per language) so adding Thai/English never squeezes columns.
 */
export const dentist = pgTable(
  "dentist",
  {
    id: serial("id").primaryKey(),
    /** URL key used by /dentists/[slug] and booking references */
    slug: text("slug").notNull(),
    years: integer("years").notNull().default(0),
    /** disc colour behind the portrait — validated as Tint in the data layer */
    tint: text("tint").notNull().default("lav"),
    /** drawn stand-in face (see portrait.tsx) while photos are empty */
    face: jsonb("face").notNull().default({}),
    photoSmall: text("photo_small").notNull().default(""),
    photoLarge: text("photo_large").notNull().default(""),
    /** hidden dentists drop out of the site and the booking roster */
    isActive: boolean("is_active").notNull().default(true),
    /** smaller sorts earlier in lists */
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("dentist_slug_idx").on(t.slug)],
);

export const dentistText = pgTable(
  "dentist_text",
  {
    id: serial("id").primaryKey(),
    dentistId: integer("dentist_id")
      .notNull()
      .references(() => dentist.id, { onDelete: "cascade" }),
    /** "th" | "en" — kept text so a third language needs no migration */
    lang: text("lang").notNull(),
    name: text("name").notNull(),
    title: text("title").notNull().default(""),
    blurb: text("blurb").notNull().default(""),
    bio: text("bio").notNull().default(""),
    /** JSON array of strings */
    credentials: jsonb("credentials").notNull().default([]),
    languages: text("languages").notNull().default(""),
    /** display string like "จันทร์, พุธ, ศุกร์" — informative only; the real
     *  weekly availability lives in dentist_shift */
    days: text("days").notNull().default(""),
  },
  (t) => [uniqueIndex("dentist_text_lang_idx").on(t.dentistId, t.lang)],
);

/** who takes which treatment */
export const dentistTreat = pgTable(
  "dentist_treat",
  {
    id: serial("id").primaryKey(),
    dentistId: integer("dentist_id")
      .notNull()
      .references(() => dentist.id, { onDelete: "cascade" }),
    /** IconKey, e.g. "checkup", "braces" */
    treatmentKey: text("treatment_key").notNull(),
  },
  (t) => [uniqueIndex("dentist_treat_idx").on(t.dentistId, t.treatmentKey)],
);

/** weekly shift per dentist. `weekday`: 0 = Sunday … 6 = Saturday. */
export const dentistShift = pgTable(
  "dentist_shift",
  {
    id: serial("id").primaryKey(),
    dentistId: integer("dentist_id")
      .notNull()
      .references(() => dentist.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    start: text("start").notNull().default("09:00"),
    end: text("end").notNull().default("17:00"),
  },
  (t) => [uniqueIndex("dentist_shift_idx").on(t.dentistId, t.weekday)],
);

/** the treatment/price list the patient site renders */
export const treatment = pgTable(
  "treatment",
  {
    id: serial("id").primaryKey(),
    /** IconKey — the stable join to icons, names and drawings */
    key: text("key").notNull(),
    /** baht; null = quoted at the visit; 0 = included with the visit */
    price: integer("price"),
    durationMin: integer("duration_min").notNull().default(30),
    isActive: boolean("is_active").notNull().default(true),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("treatment_key_idx").on(t.key)],
);

/** promotions/banners for the notification & home surfaces */
export const promotion = pgTable("promotion", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  image: text("image").notNull().default(""),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ────────────────────────────── patients ───────────────────────────────── */

/** the guardian — the account holder. LINE userId joins here at LIFF time. */
export const guardian = pgTable(
  "guardian",
  {
    id: serial("id").primaryKey(),
    /** everyday name, e.g. "คุณแม่มณฑิรา (Mon)" */
    name: text("name").notNull(),
    fullName: text("full_name").notNull().default(""),
    /** digits only, e.g. "0812345678" — the booking-flow lookup key */
    phone: text("phone").notNull(),
    lineUserId: text("line_user_id"),
    address: text("address").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /** one row per phone — the booking-flow lookup key and the upsert target */
    uniqueIndex("guardian_phone_idx").on(t.phone),
    /** unique when present — one LINE account is one guardian */
    uniqueIndex("guardian_line_idx").on(t.lineUserId),
  ],
);

/** the child — the actual patient */
export const child = pgTable(
  "child",
  {
    id: serial("id").primaryKey(),
    guardianId: integer("guardian_id")
      .notNull()
      .references(() => guardian.id, { onDelete: "cascade" }),
    /** everyday display name, e.g. "น้องเจได" */
    name: text("name").notNull(),
    fullName: text("full_name").notNull().default(""),
    /** what the family calls them, e.g. "เจได" */
    nickname: text("nickname"),
    /** fallback when the exact birthdate is unknown (demo data has no DOB) */
    age: integer("age"),
    birthdate: text("birthdate"),
    gender: text("gender"),
    /** clinic running number, e.g. "DK-004821" */
    hn: text("hn"),
    bloodType: text("blood_type").notNull().default(""),
    conditions: text("conditions").notNull().default(""),
    medications: text("medications").notNull().default(""),
    allergies: text("allergies").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("child_guardian_idx").on(t.guardianId), uniqueIndex("child_name_idx").on(t.guardianId, t.name)],
);

/* ────────────────────────────── booking ────────────────────────────────── */

export type AppointmentSource = "online" | "phone" | "walkin";
export type AppointmentStatus = "confirmed" | "completed" | "cancelled";

export const appointment = pgTable(
  "appointment",
  {
    id: serial("id").primaryKey(),
    /** human reference, e.g. "DK-4821" */
    ref: text("ref").notNull(),
    /** null when the family is new — reception completes it at the visit */
    childId: integer("child_id").references(() => child.id, { onDelete: "set null" }),
    /** free-text child name; matches child.name when childId is set */
    childName: text("child_name").notNull(),
    guardianId: integer("guardian_id").references(() => guardian.id, { onDelete: "set null" }),
    guardianName: text("guardian_name").notNull(),
    phone: text("phone").notNull(),
    dentistId: integer("dentist_id").references(() => dentist.id, { onDelete: "restrict" }),
    /** NULL = pooled "any dentist" booking waiting for assignment (see settlePool).
     *  Postgres treats NULLs as distinct in the unique slot index below, so any
     *  number of pooled rows can share one wall-clock slot — chairs, not the
     *  index, are what limit them. */
    treatmentKey: text("treatment_key").notNull(),
    /** clinic-local wall clock, Asia/Bangkok */
    date: text("date").notNull(), // YYYY-MM-DD
    time: text("time").notNull(), // HH:MM
    durationMin: integer("duration_min").notNull().default(30),
    source: text("source").notNull().default("online"), // AppointmentSource
    status: text("status").notNull().default("confirmed"), // AppointmentStatus
    note: text("note").notNull().default(""),
    price: integer("price"),
    /** visitFor = "self" → the booker is the patient (adult), no child */
    forSelf: boolean("for_self").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("appointment_ref_idx").on(t.ref),
    /** the double-booking guard: one dentist, one wall-clock slot — but only
     *  while the booking is live; a cancelled one frees the slot for rebooking
     *  (partial index, same predicate as the ON CONFLICT clause in queries) */
    uniqueIndex("appointment_slot_idx")
      .on(t.dentistId, t.date, t.time)
      .where(sql`status <> 'cancelled'`),
    index("appointment_date_idx").on(t.date),
    index("appointment_phone_idx").on(t.phone),
  ],
);

/** LINE push log — written by the (future) reminder scheduler */
export const messageLog = pgTable("message_log", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").references(() => appointment.id, {
    onDelete: "set null",
  }),
  /** "confirm" | "reminder_day_before" | "reminder_morning" | "custom" */
  kind: text("kind").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  lineResponse: jsonb("line_response"),
});

/* ────────────────────────────── clinic config ──────────────────────────── */

/** weekly open/close — one row per weekday, fixed at seven */
export const clinicDay = pgTable(
  "clinic_day",
  {
    id: serial("id").primaryKey(),
    /** "sun" … "sat" */
    day: text("day").notNull(),
    isOpen: boolean("is_open").notNull().default(true),
    start: text("start").notNull().default("09:00"),
    end: text("end").notNull().default("18:00"),
  },
  (t) => [uniqueIndex("clinic_day_idx").on(t.day)],
);

/**
 * The clinic's own contact details — one row (id = 1). The patient site's
 * /clinic page and the home info card read this; the staff settings page
 * edits it. Kept to facts the front desk actually owns (phone, LINE, map,
 * address); descriptive copy stays in the i18n dictionary.
 */
export const clinicInfo = pgTable("clinic_info", {
  id: serial("id").primaryKey(),
  /** dialled as-is by the tel: link, so no spaces */
  phone: text("phone").notNull(),
  /** how the number is shown on the page, e.g. "02-123-4567" */
  phoneDisplay: text("phone_display").notNull(),
  lineId: text("line_id").notNull().default(""),
  lineUrl: text("line_url").notNull().default(""),
  /** the Google Maps pin the map card opens */
  mapUrl: text("map_url").notNull().default(""),
  directionsUrl: text("directions_url").notNull().default(""),
  addressTh: text("address_th").notNull().default(""),
  addressEn: text("address_en").notNull().default(""),
  /** the neighbourhood line under the address, per language */
  landmarkTh: text("landmark_th").notNull().default(""),
  landmarkEn: text("landmark_en").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** special closed dates, as an inclusive range */
export const holiday = pgTable("holiday", {
  id: serial("id").primaryKey(),
  start: text("start").notNull(), // YYYY-MM-DD
  end: text("end").notNull(), // YYYY-MM-DD
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Single knobs the staff console owns, as key/value rows. Only `chairs` is
 * read today: the number of treatment chairs, which caps how many live
 * bookings (assigned + pooled "any dentist") may hold one wall-clock slot —
 * the point is a patient never waits for a chair. Seeded to 3.
 */
export const clinicSetting = pgTable("clinic_setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** staff-side bell: online bookings, cancellations, check-ins, reminders */
export const staffNotification = pgTable("staff_notification", {
  id: serial("id").primaryKey(),
  /** "online_booking" | "cancellation" | "check_in" | "reminder" */
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  refCode: text("ref_code"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** walk-in queue board (waiting → in_chair → done) */
export const waitlistEntry = pgTable("waitlist_entry", {
  id: serial("id").primaryKey(),
  childName: text("child_name").notNull(),
  guardianPhone: text("guardian_phone").notNull().default(""),
  treatmentKey: text("treatment_key").notNull(),
  dentistId: integer("dentist_id").references(() => dentist.id, { onDelete: "set null" }),
  /** HH:MM arrival time, clinic clock */
  arrivedAt: text("arrived_at").notNull(),
  /** "waiting" | "in_chair" | "done" */
  status: text("status").notNull().default("waiting"),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
