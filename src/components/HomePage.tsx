"use client";

import Link from "next/link";

import { services } from "@/data/services";
import type { Dentist } from "@/data/dentists";
import { useT } from "@/i18n/lang";
import { ArrowRight, Building, Calendar, Doc, Sparks } from "@/components/icons";
import { Mascot } from "@/components/Mascot";
import { Toaster } from "@/components/mock";
import {
  DentistStrip,
  Header,
  InfoRow,
  Ribbon,
  SectionHead,
  ServiceGrid,
} from "@/components/parts";

/**
 * The patient home page — the locked base design: solid colour blocks, no
 * gradients anywhere except the tooth mascot's own shading.
 *
 * Every panel here is a doorway: the hero books a visit, the two cards below it
 * open the booking history and the clinic page, a service tile starts a booking
 * with that treatment already chosen, and the info card opens the clinic details.
 *
 * The dentist strip is the DB roster (only active dentists), passed in by the
 * page so the server decides who is on it.
 */
export function HomePage({ dentists }: { dentists: Dentist[] }) {
  const t = useT();
  return (
    <div className="shell">
      <main className="app home">
        <Header />
        <div className="body">
          <Link href="/book" className="hero">
            <Sparks />
            <div className="txt">
              <div className="title">{t.book}</div>
              <div className="sub">{t.bookSub}</div>
            </div>
            <div className="cal">
              <Calendar size={54} />
            </div>
            <div className="pet">
              <Mascot h={88} id="pet" />
            </div>
            <span className="arrowBtn heroArrow">
              <ArrowRight />
            </span>
          </Link>

          <div className="duo">
            <Link href="/bookings" className="act lav">
              <span className="glyph" style={{ color: "var(--lav-2)" }}>
                <Doc />
              </span>
              <span className="lines">
                <span className="t">{t.history}</span>
                <span className="s">{t.historySub}</span>
              </span>
            </Link>
            <Link href="/clinic" className="act gold">
              <span className="glyph" style={{ color: "#e0a63c" }}>
                <Building />
              </span>
              <span className="lines">
                <span className="t">{t.about}</span>
                <span className="s">{t.aboutSub}</span>
              </span>
            </Link>
          </div>

          <SectionHead title={t.services} href="/services" />
          <ServiceGrid items={services} />

          <SectionHead title={t.nav.dentists} href="/dentists" />
          <DentistStrip list={dentists} />

          <InfoRow />
          <Ribbon msg={t.ribbon} />
        </div>
      </main>
      <Toaster />
    </div>
  );
}
