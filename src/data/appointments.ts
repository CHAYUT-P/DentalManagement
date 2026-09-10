import type { Lang } from "@/i18n/dict";
import type { IconKey } from "./icons";

/**
 * Mock appointments and notices for the signed-in patient. LINE login is not
 * wired up yet, so this stands in for "whoever opened the LIFF app".
 *
 * Dates are stored as an offset in days from today rather than a fixed date, so
 * the demo never rots into showing a past appointment as upcoming. The page
 * turns the offset into a real date using the Bangkok `todayISO` the server
 * passes down — never `new Date()` inside a client component, which would
 * disagree with the server render.
 */

export type Appt = {
  ref: string;
  /** + future, − past, relative to today in Bangkok */
  inDays: number;
  time: string;
  treatment: IconKey;
  /** dentist slug, or null for "any dentist" */
  dentist: string | null;
  status: "confirmed" | "done" | "cancelled";
};

/** the child the appointment is for — Mali is the face used for this name */
export const patient: Record<Lang, string> = { th: "น้องเจได", en: "Jedi" };

export const upcoming: Appt[] = [
  { ref: "DK-4821", inDays: 3, time: "10:30", treatment: "checkup", dentist: "naree", status: "confirmed" },
];

export const past: Appt[] = [
  { ref: "DK-4477", inDays: -24, time: "16:00", treatment: "fluoride", dentist: "naree", status: "done" },
  { ref: "DK-4310", inDays: -58, time: "11:00", treatment: "filling", dentist: "siriporn", status: "done" },
  { ref: "DK-4192", inDays: -96, time: "09:30", treatment: "scaling", dentist: "manee", status: "cancelled" },
  { ref: "DK-4088", inDays: -142, time: "14:30", treatment: "checkup", dentist: null, status: "done" },
];

export type Notice = {
  id: string;
  kind: "reminder" | "news" | "promo";
  inDays: number;
  unread: boolean;
  text: Record<Lang, { title: string; body: string }>;
};

export const notices: Notice[] = [
  {
    id: "n1",
    kind: "reminder",
    inDays: -1,
    unread: true,
    text: {
      th: {
        title: "นัดหมายของน้องเจได",
        body: "ใกล้ถึงวันนัดแล้ว ตรวจสุขภาพฟันกับ ทพญ. นรี เวลา 10:30 น. กรุณามาถึงก่อนเวลา 10 นาที",
      },
      en: {
        title: "Jedi's appointment",
        body: "Your visit is coming up — a check-up with Dr. Naree at 10:30. Please arrive ten minutes early.",
      },
    },
  },
  {
    id: "n2",
    kind: "promo",
    inDays: -4,
    unread: true,
    text: {
      th: {
        title: "เคลือบฟลูออไรด์ราคาพิเศษเดือนนี้",
        body: "เคลือบฟลูออไรด์พร้อมตรวจสุขภาพฟัน 750 บาท ตลอดเดือนนี้ สำหรับเด็กอายุไม่เกิน 12 ปี",
      },
      en: {
        title: "Fluoride offer this month",
        body: "Fluoride with a check-up for 750 baht all month, for children up to 12 years old.",
      },
    },
  },
  {
    id: "n3",
    kind: "news",
    inDays: -11,
    unread: false,
    text: {
      th: {
        title: "วันศุกร์เปิดถึง 20:00 น.",
        body: "ตั้งแต่เดือนนี้คลินิกเปิดถึง 20:00 น. ทุกวันศุกร์ เพื่อผู้ปกครองที่มารับลูกหลังเลิกงาน",
      },
      en: {
        title: "Open until 20:00 on Fridays",
        body: "From this month the clinic stays open until 20:00 every Friday, for parents coming after work.",
      },
    },
  },
  {
    id: "n4",
    kind: "reminder",
    inDays: -24,
    unread: false,
    text: {
      th: {
        title: "ขอบคุณที่มาตามนัด",
        body: "การเคลือบฟลูออไรด์เสร็จเรียบร้อย นัดครั้งถัดไปแนะนำอีก 6 เดือน",
      },
      en: {
        title: "Thanks for coming in",
        body: "The fluoride treatment is done. We suggest the next visit in six months.",
      },
    },
  },
];
