"use client";

import Link from "next/link";

import { iconGroups, iconLibrary } from "@/data/icons";
import { useT } from "@/i18n/lang";
import { priceShort } from "@/lib/format";
import { Chevron } from "./icons";
import { Eyebrow, Lead, Screen } from "./screen";
import { ServiceIcon } from "./serviceIcons";

/**
 * Every treatment the clinic offers, grouped the way the icon library groups
 * them, with a starting price. Each row goes straight into the booking flow with
 * that treatment already chosen.
 */
export function ServicesPage() {
  const t = useT();
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
                    <span className="pp">{priceShort(t, e.key)}</span>
                  </span>
                  <Chevron />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
      <p className="hint">{t.common.mockData}</p>
    </Screen>
  );
}
