"use client";

import Link from "next/link";

import { iconGroups, iconLibrary, type IconKey } from "@/data/icons";
import { useT } from "@/i18n/lang";
import { Chevron } from "./icons";
import { Eyebrow, Lead, Screen } from "./screen";
import { ServiceIcon } from "./serviceIcons";

/**
 * Every treatment the clinic offers, grouped the way the icon library groups
 * them, with a starting price. Prices arrive from the treatment table (the
 * staff app owns them); each row goes straight into the booking flow with
 * that treatment already chosen.
 */
export function ServicesPage({ prices }: { prices: Partial<Record<IconKey, number | null>> }) {
  const t = useT();

  const priceShort = (k: IconKey) => {
    const p = prices[k];
    if (p === undefined) return "";
    if (p === null) return t.common.quote;
    if (p === 0) return t.common.free;
    return `${p.toLocaleString("en-US")} ${t.common.baht}`;
  };

  return (
    <Screen title={t.nav.services} back="/">
      <Lead>{t.servicesPage.lead}</Lead>
      {iconGroups.map((g) => {
        const items = iconLibrary.filter((e) => e.group === g && e.key !== "more");
        if (items.length === 0) return null;
        return (
          <section key={g}>
            <Eyebrow>{t.group[g]}</Eyebrow>
            <div className="pick">
              {items.map((e) => (
                <Link key={e.key} href={`/book?t=${e.key}`} className="pickRow">
                  <span className={`disc t-${e.tint}`}>
                    <ServiceIcon k={e.key} size={21} />
                  </span>
                  <span className="pt">
                    <span className="pn">{t.service[e.key]}</span>
                    <span className="pp">{priceShort(e.key)}</span>
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
