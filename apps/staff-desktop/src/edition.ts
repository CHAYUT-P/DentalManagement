import type { StaffEdition } from "@/lib/staffTypes";

/**
 * Which feature bundle this build carries, stamped at compile time:
 *   pnpm build            → "queue"  (queue + bookings + website content)
 *   pnpm build:full       → "full"   (+ patient records + room pages)
 * Vite's `define` swaps __STAFF_EDITION__ for a string literal; without it
 * (plain `vite` dev) the typeof check keeps this from throwing.
 */
declare const __STAFF_EDITION__: string | undefined;

export const STAFF_EDITION: StaffEdition =
  typeof __STAFF_EDITION__ === "string" && __STAFF_EDITION__ === "full" ? "full" : "queue";
