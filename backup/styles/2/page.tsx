import { copy } from "@/data/clinic";
import { services } from "@/data/services";
import { ArrowRight, Building, Calendar, Doc, Sparks } from "@/components/icons";
import { Mascot } from "@/components/Mascot";
import { MockButton } from "@/components/mock";
import { Header, InfoRow, SectionHead, ServiceGrid } from "@/components/parts";

export default function Style2() {
  return (
    <main className="app v2">
      <Header />
      <div className="body">
        <div className="split">
          <section className="hero">
            <Sparks spots={[[86, 10, 5], [12, 56, 4], [22, 88, 5]]} />
            <div className="title">{copy.book}</div>
            <div className="sub">{copy.bookSub}</div>
            <div className="calBig">
              <Calendar size={62} />
            </div>
            <MockButton label={copy.book} className="arrowBtn heroArrow">
              <ArrowRight />
            </MockButton>
          </section>

          <div className="rightCol">
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
        </div>

        <SectionHead title={copy.popular} />
        <ServiceGrid items={services.slice(0, 5)} />

        <section className="care">
          <Sparks color="rgba(255,255,255,.7)" spots={[[10, 26, 6], [40, 14, 4], [58, 82, 5]]} />
          <div className="cbody">
            <div className="ct">{copy.careTitle}</div>
            <div className="cs">{copy.careSub}</div>
          </div>
          <div className="cpet">
            <Mascot h={80} accessory="mirror" id="p2" />
          </div>
        </section>

        <InfoRow />
      </div>
    </main>
  );
}
