import { copy } from "@/data/clinic";
import { sixServices } from "@/data/services";
import { Building, Calendar, Doc, Sparks } from "@/components/icons";
import { MockButton } from "@/components/mock";
import { Header, InfoRow, Ribbon, SectionHead, ServiceGrid } from "@/components/parts";

export default function Style4() {
  return (
    <main className="app v4">
      <Header />
      <div className="body">
        <MockButton label={copy.book} className="hero">
          <Sparks spots={[[10, 24, 6], [88, 22, 5], [78, 80, 4], [18, 84, 4]]} />
          <span className="title">{copy.book}</span>
          <span className="sub">{copy.bookSub}</span>
          <span className="calMid">
            <Calendar size={44} />
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

        <SectionHead title={copy.servicesSix} link={null} />
        <ServiceGrid items={sixServices} cols={3} />

        <InfoRow />
        <Ribbon msg="สุขภาพฟันดี ชีวิตมีความสุข" />
      </div>
    </main>
  );
}
