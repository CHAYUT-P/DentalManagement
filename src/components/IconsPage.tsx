"use client";

import { useState } from "react";

import { iconGroups, iconLibrary, tints, type IconEntry } from "@/data/icons";
import { services } from "@/data/services";
import { useT } from "@/i18n/lang";
import { ServiceIcon } from "@/components/serviceIcons";
import { LangSwitch } from "@/components/parts";

/**
 * Internal reference: every treatment icon the app can draw, split into the ten
 * the home page uses today and the spares a new treatment can pick from in the
 * staff app. Clicking a card copies its key — that key is what the staff app
 * will store alongside the treatment.
 */

const homeKeys = new Set(services.map((s) => s.key));
const homeEntries: IconEntry[] = services.map((s) => {
  const entry = iconLibrary.find((i) => i.key === s.key);
  return { key: s.key, tint: s.tint, group: entry ? entry.group : "misc" };
});

function Cards({ items, onPick }: { items: IconEntry[]; onPick: (k: string) => void }) {
  const t = useT();
  return (
    <div className="icGrid">
      {items.map((e) => (
        <button key={e.key} type="button" className="icCard" onClick={() => onPick(e.key)}>
          <span className={`icDisc t-${e.tint}`}>
            <ServiceIcon k={e.key} size={30} />
          </span>
          <span className="icName">{t.service[e.key]}</span>
          <code className="icKey">{e.key}</code>
        </button>
      ))}
    </div>
  );
}

function Head({ title, n }: { title: string; n: number }) {
  const t = useT();
  return (
    <div className="icHead">
      <h2>{title}</h2>
      <span className="icCount">
        {n} {t.icons.count}
      </span>
    </div>
  );
}

export function IconsPage() {
  const t = useT();
  const [copied, setCopied] = useState<string | null>(null);

  function copy(key: string) {
    navigator.clipboard?.writeText(key).catch(() => {});
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
  }

  return (
    <div className="icPage">
      <header className="icTop">
        <div className="icTopText">
          <h1>{t.icons.title}</h1>
          <p className="icLead">{t.icons.lead}</p>
          <p className="icNote">{t.icons.note}</p>
        </div>
        <LangSwitch />
      </header>

      <section className="icSection">
        <Head title={t.icons.inUse} n={homeEntries.length} />
        <Cards items={homeEntries} onPick={copy} />
      </section>

      <section className="icSection">
        <Head title={t.icons.spare} n={iconLibrary.filter((e) => !homeKeys.has(e.key)).length} />
        {iconGroups.map((g) => {
          const items = iconLibrary.filter((e) => e.group === g && !homeKeys.has(e.key));
          if (items.length === 0) return null;
          return (
            <div key={g} className="icGroup">
              <h3>{t.group[g]}</h3>
              <Cards items={items} onPick={copy} />
            </div>
          );
        })}
      </section>

      <section className="icSection">
        <Head title={t.icons.tintsLabel} n={tints.length} />
        <div className="icTints">
          {tints.map((tint) => (
            <span key={tint} className="icTint">
              <span className={`icDisc t-${tint}`}>
                <ServiceIcon k="checkup" size={30} />
              </span>
              <code className="icKey">{tint}</code>
            </span>
          ))}
        </div>
      </section>

      <div className="icToastWrap" aria-live="polite">
        {copied ? (
          <div className="icToast">
            <code>{copied}</code> · {t.icons.copy}
          </div>
        ) : null}
      </div>
    </div>
  );
}
