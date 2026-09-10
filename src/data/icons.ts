/**
 * The treatment-icon library. The home grid draws ten of these
 * (src/data/services.ts); the rest exist so a treatment added from the staff app
 * can pick a ready-made icon instead of someone drawing a new SVG. Names for
 * every key live in src/i18n/dict.ts, the drawings in
 * src/components/serviceIcons.tsx, and /icons previews the whole set.
 */

export type Tint = "rose" | "peri" | "violet" | "blue" | "steel" | "gold" | "lav";

export type IconGroup =
  | "check"    // examination and imaging
  | "clean"    // hygiene and prevention
  | "restore"  // fillings, crowns, replacements
  | "cosmetic"
  | "surgery"  // surgery, anaesthetic, pain
  | "ortho"    // braces and appliances
  | "kids"
  | "misc";

export type IconKey =
  // check
  | "checkup" | "consult" | "followup" | "xray" | "pano" | "scan"
  // clean
  | "scaling" | "gum" | "polish" | "fluoride" | "sealant" | "brushing" | "floss" | "mouthwash"
  // restore
  | "filling" | "rootcanal" | "pulpotomy" | "crown" | "bridge" | "denture" | "implant"
  // cosmetic
  | "whitening" | "veneer"
  // surgery
  | "extraction" | "wisdom" | "surgery" | "anesthesia" | "sedation" | "toothache"
  // ortho
  | "braces" | "aligner" | "retainer" | "spacemaintainer" | "nightguard" | "jaw"
  // kids
  | "kids" | "babytooth"
  // misc
  | "more";

/** `tint` is the suggested disc colour when nothing else says otherwise; the ten
 *  icons on the home page keep the tints the reference design gave them. */
export type IconEntry = { key: IconKey; group: IconGroup; tint: Tint };

export const iconLibrary: IconEntry[] = [
  { key: "checkup",         group: "check",    tint: "rose" },
  { key: "consult",         group: "check",    tint: "blue" },
  { key: "followup",        group: "check",    tint: "steel" },
  { key: "xray",            group: "check",    tint: "steel" },
  { key: "pano",            group: "check",    tint: "blue" },
  { key: "scan",            group: "check",    tint: "peri" },

  { key: "scaling",         group: "clean",    tint: "steel" },
  { key: "gum",             group: "clean",    tint: "rose" },
  { key: "polish",          group: "clean",    tint: "lav" },
  { key: "fluoride",        group: "clean",    tint: "gold" },
  { key: "sealant",         group: "clean",    tint: "gold" },
  { key: "brushing",        group: "clean",    tint: "peri" },
  { key: "floss",           group: "clean",    tint: "blue" },
  { key: "mouthwash",       group: "clean",    tint: "violet" },

  { key: "filling",         group: "restore",  tint: "peri" },
  { key: "rootcanal",       group: "restore",  tint: "rose" },
  { key: "pulpotomy",       group: "restore",  tint: "rose" },
  { key: "crown",           group: "restore",  tint: "gold" },
  { key: "bridge",          group: "restore",  tint: "steel" },
  { key: "denture",         group: "restore",  tint: "lav" },
  { key: "implant",         group: "restore",  tint: "peri" },

  { key: "whitening",       group: "cosmetic", tint: "blue" },
  { key: "veneer",          group: "cosmetic", tint: "blue" },

  { key: "extraction",      group: "surgery",  tint: "rose" },
  { key: "wisdom",          group: "surgery",  tint: "rose" },
  { key: "surgery",         group: "surgery",  tint: "violet" },
  { key: "anesthesia",      group: "surgery",  tint: "peri" },
  { key: "sedation",        group: "surgery",  tint: "lav" },
  { key: "toothache",       group: "surgery",  tint: "rose" },

  { key: "braces",          group: "ortho",    tint: "violet" },
  { key: "aligner",         group: "ortho",    tint: "lav" },
  { key: "retainer",        group: "ortho",    tint: "violet" },
  { key: "spacemaintainer", group: "ortho",    tint: "steel" },
  { key: "nightguard",      group: "ortho",    tint: "lav" },
  { key: "jaw",             group: "ortho",    tint: "peri" },

  { key: "kids",            group: "kids",     tint: "rose" },
  { key: "babytooth",       group: "kids",     tint: "gold" },

  { key: "more",            group: "misc",     tint: "lav" },
];

export const iconGroups: IconGroup[] = [
  "check", "clean", "restore", "cosmetic", "surgery", "ortho", "kids", "misc",
];

export const tints: Tint[] = ["rose", "peri", "violet", "blue", "steel", "gold", "lav"];

/** Narrows a query-string value to a real treatment key. */
export function isIconKey(v: string): v is IconKey {
  return iconLibrary.some((e) => e.key === v);
}
