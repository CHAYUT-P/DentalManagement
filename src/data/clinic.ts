import type { Lang } from "@/i18n/dict";

/**
 * The clinic's own details. Mock content the owner will replace from the staff
 * app — the shapes are what matters here. Anything the patient can tap (phone,
 * LINE, map) is kept as one canonical string so a page never builds its own URL.
 */

export type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

/** `hours` is null on a closed day. */
export type HoursRow = { day: DayKey; hours: string | null };

export type FacilityKey = "parking" | "wifi" | "cards" | "play" | "sterile" | "family";

/** dialled as-is by the tel: link, so no spaces */
export const tel = "021234567";
export const telDisplay = "02-123-4567";

export const lineId = "@dentakids";
export const lineUrl = "https://line.me/R/ti/p/~@dentakids";

/** the pin the map card opens */
export const geo = { lat: 13.8199, lng: 100.554 };
export const mapUrl = `https://www.google.com/maps/search/?api=1&query=${geo.lat},${geo.lng}`;
export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${geo.lat},${geo.lng}`;

export const hours: HoursRow[] = [
  { day: "mon", hours: "09:00 - 18:00" },
  { day: "tue", hours: "09:00 - 18:00" },
  { day: "wed", hours: "09:00 - 18:00" },
  { day: "thu", hours: "09:00 - 18:00" },
  { day: "fri", hours: "09:00 - 20:00" },
  { day: "sat", hours: "09:00 - 17:00" },
  { day: "sun", hours: null },
];

export const facilities: FacilityKey[] = ["parking", "play", "wifi", "family", "sterile", "cards"];

/** the neighbourhood line under the address, per language */
export const landmark: Record<Lang, string> = {
  th: "ตรงข้ามสวนจตุจักร ใกล้ MRT พหลโยธิน ทางออก 1",
  en: "Opposite Chatuchak Park, MRT Phahon Yothin exit 1",
};
