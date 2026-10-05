import { copy } from "@/data/clinic";
import { services } from "@/data/services";
import { ArrowRight, Building, Calendar, Doc, Sparks } from "@/components/icons";
import { Mascot } from "@/components/Mascot";
import { MockButton } from "@/components/mock";
import { Header, InfoRow, Ribbon, SectionHead, ServiceGrid } from "@/components/parts";

export default function Style3() {
  return (
    <main className="app v3">
      <Header />
      <div className="body">
        <section className="welcome">
          <div className="wpet">
            <Mascot h={94} accessory="brush" id="p3" />
          </div>
          <div className="wtxt">
            <div className="wt">{copy.welcome}</div>
            <div className="ws">{copy.welcomeSub}</div>
          </div>
        </section>

        <MockButton label={copy.book} className="hero bar">
          <span className="bcal">
            <Calendar size={30} />
          </span>
          <span className="blines">
            <span className="title">{copy.book}</span>
            <span className="sub">{copy.bookSub}</span>
          </span>
          <span className="arrowBtn">
            <ArrowRight size={16} />
          </span>
        </MockButton>

        <div className="duo">
          <MockButton label={copy.history} className="act lav">
            <span className="glyph" style={{ color: "var(--lav-2)" }}>
              <Doc />
            </span>
            <span className="lines">
              <span className="t">{copy.history}</span>
              <span className="s">{copy.historySub}</span>
            </span>
          </MockButton>
          <MockButton label={copy.about} className="act blue">
            <span className="glyph" style={{ color: "#7f97ef" }}>
              <Building />
            </span>
            <span className="lines">
              <span className="t">{copy.about}</span>
              <span className="s">{copy.aboutSub}</span>
            </span>
          </MockButton>
        </div>

        <SectionHead title={copy.services} />
        <ServiceGrid items={services} />

        <InfoRow />
        <Ribbon msg="รอยยิ้มของคุณ คือกำลังใจของเรา" face={false} />
      </div>
    </main>
  );
}
