"use client";

import {
  directionsUrl,
  facilities,
  hours,
  landmark,
  lineId,
  lineUrl,
  mapUrl,
  tel,
  telDisplay,
  type FacilityKey,
} from "@/data/clinic";
import { useLang } from "@/i18n/lang";
import { weekday } from "@/lib/dates";
import { Ball, Car, Card, Family, LineBubble, MapPlan, Phone, Pin, Shield, Wifi } from "./icons";
import { Eyebrow, Ledger, Panel, Screen } from "./screen";

/**
 * The clinic itself: what it is, when it opens, how to reach it, and where it is.
 * Every tappable contact detail is the real thing — `tel:`, the LINE deep link,
 * and the Google Maps pin — so the page already works on a phone even though the
 * copy is still mock text the owner will replace.
 */

const FACILITY_ICON: Record<FacilityKey, React.ReactNode> = {
  parking: <Car />,
  wifi: <Wifi />,
  cards: <Card />,
  play: <Ball />,
  sterile: <Shield />,
  family: <Family />,
};

export function ClinicPage({ today }: { today: string }) {
  const { t, lang } = useLang();
  const dow = weekday(today);
  return (
    <Screen title={t.nav.clinic} back="/">
      <Eyebrow>{t.clinicPage.aboutEyebrow}</Eyebrow>
      <Panel>
        <p className="prose">{t.clinicPage.about}</p>
      </Panel>

      <Eyebrow>{t.clinicPage.hoursEyebrow}</Eyebrow>
      <Ledger>
        {hours.map((h) => (
          <div key={h.day} className={`row${h.day === dow ? " now" : ""}`}>
            <span className="rk">
              {t.weekdayLong[h.day]}
              {h.day === dow ? <span className="todayTag">{t.common.today}</span> : null}
            </span>
            <span className={h.hours ? "rv" : "rv off"}>{h.hours ?? t.common.closed}</span>
          </div>
        ))}
      </Ledger>

      <Eyebrow>{t.clinicPage.contactEyebrow}</Eyebrow>
      <div className="contact">
        <a href={`tel:${tel}`} className="contactRow">
          <span className="cIcon rose">
            <Phone size={18} />
          </span>
          <span className="cText">
            <span className="cn">{t.clinicPage.call}</span>
            <span className="cm">{telDisplay}</span>
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
            <p className="mAddr">{t.clinic.address}</p>
            <p className="mLand">{landmark[lang]}</p>
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
        {facilities.map((f) => (
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
      <p className="hint">{t.common.mockData}</p>
    </Screen>
  );
}
