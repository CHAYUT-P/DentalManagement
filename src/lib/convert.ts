import type { Dentist, DentistText, Face } from "@/data/dentists";
import type { IconKey, Tint } from "@/data/icons";
import type { DentistDTO } from "@/server/queries";

/**
 * DB → UI adapters. The patient-site components render the `Dentist` shape from
 * src/data/dentists.ts; the database stores the same thing normalised across
 * tables. These pure functions bridge the two, so pages can fetch from Postgres
 * and hand components exactly what they rendered before — no visual change.
 */

const TINTS: Tint[] = ["rose", "peri", "violet", "blue", "steel", "gold", "lav"];

function asTint(v: string): Tint {
  return TINTS.includes(v as Tint) ? (v as Tint) : "lav";
}

function asFace(v: Record<string, unknown>): Face {
  return {
    skin: typeof v.skin === "string" ? v.skin : "#f7d5c0",
    hair: typeof v.hair === "string" ? v.hair : "#3a2b3f",
    cut: (["bun", "bob", "short", "wave", "crop"].includes(v.cut as string) ? v.cut : "bun") as Face["cut"],
    scrubs: typeof v.scrubs === "string" ? v.scrubs : "#fea6c9",
    extra: (["none", "glasses", "cap"].includes(v.extra as string) ? v.extra : "none") as Face["extra"],
  };
}

function asText(v: DentistDTO["text"]["th"]): DentistText {
  return {
    name: v.name,
    title: v.title,
    blurb: v.blurb,
    bio: v.bio,
    credentials: v.credentials,
    languages: v.languages,
    days: v.days,
  };
}

export function toUIDentist(d: DentistDTO): Dentist & { id: number } {
  return {
    id: d.id,
    slug: d.slug,
    years: d.years,
    tint: asTint(d.tint),
    face: asFace(d.face),
    photo: { small: d.photoSmall, large: d.photoLarge },
    treats: d.treats,
    text: { th: asText(d.text.th), en: asText(d.text.en) },
  };
}

export function toUIDentists(list: DentistDTO[]): (Dentist & { id: number })[] {
  return list.map(toUIDentist);
}

/** the routine visits every dentist takes — mirrors data/dentists.ts */
const GENERAL_TREATS: IconKey[] = ["checkup", "consult", "followup"];

/** who can be booked for a treatment, over a DB-driven roster */
export function dentistsForUI(list: Dentist[], k: IconKey): Dentist[] {
  if (GENERAL_TREATS.includes(k)) return list;
  const able = list.filter((d) => d.treats.includes(k));
  return able.length > 0 ? able : list;
}
