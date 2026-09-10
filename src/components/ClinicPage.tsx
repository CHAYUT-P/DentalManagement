"use client";

import type { ClinicDayDTO, ClinicInfoDTO } from "@/server/queries";
import { useLang } from "@/i18n/lang";
import { weekday } from "@/lib/dates";
import { Ball, Car, Card, Family, LineBubble, MapPlan, Phone, Pin, Shield, Wifi } from "./icons";
import { Eyebrow, Ledger, Panel, Screen } from "./screen";

/**
 * The clinic itself: what it is, when it opens, how to reach it, and where it is.
 * Hours come from the clinic_day table and contact details from clinic_info —
 * the same rows the staff settings page edits. Only the descriptive copy
 * (about, payment) stays in the dictionary.
 */

const FACILITY_ICON: Record<string, React.ReactNode> = {
  parking: <Car />,
  wifi: <Wifi />,
  cards: <Card />,
  play: <Ball />,
  sterile: <Shield />,
  family: <Family />,
};

const FACILITIES = ["parking", "play", "wifi", "family", "sterile", "cards"] as const;

export function ClinicPage({
  today,
  days,
  info,
}: {
  today: string;
  days: ClinicDayDTO[];
  info: ClinicInfoDTO | null;
}) {
  const { t, lang } = useLang();
  const dow = weekday(today);
  /** display order: Monday first, Sunday last (the week as the front desk sees it) */
  const ordered = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) =>
    days.find((row) => row.day === d),
  );
  const address = (lang === "th" ? info?.addressTh : info?.addressEn) || t.clinic.address;
  const landmark = (lang === "th" ? info?.landmarkTh : info?.landmarkEn) || "";
  const phone = info?.phoneDisplay || t.clinic.phone;
  const phoneLink = info?.phone || info?.phoneDisplay || "tel:";
  const lineId = info?.lineId ?? "";
  const lineUrl = info?.lineUrl || "#";
  const mapUrl = info?.mapUrl || "#";
  const directionsUrl = info?.directionsUrl || mapUrl;

  return (
    <Screen title={t.nav.clinic} back="/">
      <Eyebrow>{t.clinicPage.aboutEyebrow}</Eyebrow>
      <Panel>
        <p className="prose">{t.clinicPage.about}</p>
      </Panel>

      <Eyebrow>{t.clinicPage.hoursEyebrow}</Eyebrow>
      <Ledger>
        {ordered.map((h) =>
          h ? (
            <div key={h.day} className={`row${h.day === dow ? " now" : ""}`}>
              <span className="rk">
                {t.weekdayLong[h.day as keyof typeof t.weekdayLong]}
                {h.day === dow ? <span className="todayTag">{t.common.today}</span> : null}
              </span>
              <span className={h.isOpen ? "rv" : "rv off"}>
                {h.isOpen ? `${h.start} - ${h.end}` : t.common.closed}
              </span>
            </div>
          ) : null,
        )}
      </Ledger>

      <Eyebrow>{t.clinicPage.contactEyebrow}</Eyebrow>
      <div className="contact">
        <a href={`tel:${phoneLink}`} className="contactRow">
          <span className="cIcon rose">
            <Phone size={18} />
          </span>
          <span className="cText">
            <span className="cn">{t.clinicPage.call}</span>
            <span className="cm">{phone}</span>
          </span>
        </a>
        <a href={lineUrl} target="_blank" rel="noreferrer" className="contactRow">
          <span className="cIcon green">
            <LineBubble size={18} />
          </span>
          <span className="cText">
            <span className="cn">{t.clinicPage.lineOA}</span>
            <span className="cm">
              {lineId} · {t.clinicPage.lineSub}
            </span>
          </span>
        </a>
      </div>

      <Eyebrow>{t.clinicPage.addressEyebrow}</Eyebrow>
      <div className="mapCard">
        <a href={mapUrl} target="_blank" rel="noreferrer" className="mapFrame">
          <MapPlan />
          <span className="mapNote">{t.clinicPage.mapHint}</span>
        </a>
        <div className="mapText">
          <span className="mIcon">
            <Pin size={14} />
          </span>
          <div>
            <p className="mAddr">{address}</p>
            {landmark ? <p className="mLand">{landmark}</p> : null}
          </div>
        </div>
        <div className="mapBtns">
          <a href={mapUrl} target="_blank" rel="noreferrer" className="cta">
            {t.clinicPage.openMaps}
          </a>
          <a href={directionsUrl} target="_blank" rel="noreferrer" className="ghost">
            {t.clinicPage.directions}
          </a>
        </div>
      </div>

      <Eyebrow>{t.clinicPage.facilitiesEyebrow}</Eyebrow>
      <div className="facs">
        {FACILITIES.map((f) => (
          <span key={f} className="fac">
            <span className="fIcon">{FACILITY_ICON[f]}</span>
            {t.facility[f]}
          </span>
        ))}
      </div>

      <Eyebrow>{t.clinicPage.payEyebrow}</Eyebrow>
      <Panel>
        <p className="prose">{t.clinicPage.pay}</p>
      </Panel>
    </Screen>
  );
}
