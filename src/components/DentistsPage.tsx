"use client";

import Link from "next/link";

import type { Dentist } from "@/data/dentists";
import { useLang } from "@/i18n/lang";
import { Chevron, Star } from "./icons";
import { DentistAvatar } from "./portrait";
import { Eyebrow, Lead, Screen } from "./screen";

/** The roster. One row per dentist, each opening their full profile. The list
 *  is the DB roster (active dentists only), passed in by the page. */
export function DentistsPage({ dentists }: { dentists: Dentist[] }) {
  const { t, lang } = useLang();
  return (
    <Screen title={t.nav.dentists} back="/">
      <Lead>{t.dentistsPage.lead}</Lead>
      <Eyebrow>
        {dentists.length} {t.dentistsPage.count}
      </Eyebrow>

      <div className="docList">
        {dentists.map((d) => {
          const x = d.text[lang];
          return (
            <Link key={d.slug} href={`/dentists/${d.slug}`} className="docCard">
              <DentistAvatar d={d} alt={x.name} size={62} />
              <div className="docText">
                <div className="docName">{x.name}</div>
                <div className="docTitle">{x.title}</div>
                <div className="docBlurb">{x.blurb}</div>
                <div className="docMeta">
                  <span className="yrs">
                    <Star size={11} />
                    {d.years} {t.common.years}
                  </span>
                  <span className="days">{x.days}</span>
                </div>
              </div>
              <span className="docGo">
                <Chevron />
              </span>
            </Link>
          );
        })}
      </div>
    </Screen>
  );
}
