"use client";

import Link from "next/link";

import { iconGroups } from "@/data/icons";
import { useLang } from "@/i18n/lang";
import type { TreatmentInfo } from "@/lib/treatments";
import { Chevron } from "@/components/shared/icons";
import { Eyebrow, Lead, Screen } from "@/components/patient/screen";
import { ServiceIcon } from "@/components/shared/serviceIcons";

/**
 * Every treatment the clinic shows on the website, grouped, with a starting
 * price — all from the treatment table the staff app edits (names, icons,
 * show/hide). Each row goes straight into the booking flow with that
 * treatment already chosen.
 */
export function ServicesPage({ treatments }: { treatments: TreatmentInfo[] }) {
  const { t, lang } = useLang();

  const priceShort = (p: number | null) => {
    if (p === null) return t.common.quote;
    if (p === 0) return t.common.free;
    return `${p.toLocaleString("en-US")} ${t.common.baht}`;
  };

  return (
    <Screen title={t.nav.services} back="/">
      <Lead>{t.servicesPage.lead}</Lead>
      {iconGroups.map((g) => {
        const items = treatments.filter((e) => e.group === g && e.key !== "more");
        if (items.length === 0) return null;
        return (
          <section key={g}>
            <Eyebrow>{t.group[g]}</Eyebrow>
            <div className="pick">
              {items.map((e) => (
                <Link key={e.key} href={`/book?t=${e.key}`} className="pickRow">
                  <span className={`disc t-${e.tint}`}>
                    <ServiceIcon k={e.icon} size={26} />
                  </span>
                  <span className="pt">
                    <span className="pn">{e.name[lang]}</span>
                    <span className="pp">{priceShort(e.price)}</span>
                  </span>
                  <Chevron />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </Screen>
  );
}
