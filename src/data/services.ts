import type { IconKey, Tint } from "./icons";

/** A tile in the services grid. The name it shows lives in the string table
 *  (src/i18n/dict.ts, keyed by `key`) so both languages stay in one place. */
export type Service = { key: IconKey; tint: Tint };

export const services: Service[] = [
  { key: "checkup",    tint: "rose" },
  { key: "filling",    tint: "peri" },
  { key: "braces",     tint: "violet" },
  { key: "whitening",  tint: "blue" },
  { key: "scaling",    tint: "steel" },
  { key: "extraction", tint: "rose" },
  { key: "wisdom",     tint: "rose" },
  { key: "rootcanal",  tint: "rose" },
  { key: "fluoride",   tint: "gold" },
  { key: "more",       tint: "lav" },
];

/** Parked style 4 shows six tiles instead of ten. */
export const sixServices: Service[] = [
  services[0], services[1], services[2],
  services[3], services[4], services[8],
];
