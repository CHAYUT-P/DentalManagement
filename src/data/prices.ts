import type { IconKey } from "./icons";

/**
 * Starting price in baht per treatment, or `null` for "quoted at the visit".
 * Mock figures — the staff app owns this table. Every `IconKey` has an entry so
 * a treatment can never render a blank price.
 */
export const prices = {
  checkup: 300,
  consult: 300,
  followup: 0,
  xray: 400,
  pano: 1200,
  scan: 2500,
  scaling: 800,
  gum: 1500,
  polish: 500,
  fluoride: 600,
  sealant: 700,
  brushing: 0,
  floss: 0,
  mouthwash: 250,
  filling: 900,
  rootcanal: 6000,
  pulpotomy: 2500,
  crown: 8000,
  bridge: 15000,
  denture: 12000,
  implant: 45000,
  whitening: 4500,
  veneer: 9000,
  extraction: 700,
  wisdom: 3500,
  surgery: null,
  anesthesia: 300,
  sedation: 1500,
  toothache: 500,
  braces: 40000,
  aligner: 65000,
  retainer: 3500,
  spacemaintainer: 3000,
  nightguard: 4000,
  jaw: null,
  kids: 300,
  babytooth: 300,
  more: null,
} satisfies Record<IconKey, number | null>;

/** 0 means the treatment is included with the visit, so it reads "free". */
export function priceOf(k: IconKey): number | null {
  return prices[k];
}
