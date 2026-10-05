import { copy } from "@/data/clinic";
import { services } from "@/data/services";
import { ArrowRight, Building, Calendar, Doc, Gift, Sparks } from "@/components/icons";
import { Mascot } from "@/components/Mascot";
import { MockButton } from "@/components/mock";
import { Header, InfoRow, Ribbon, SectionHead, ServiceGrid } from "@/components/parts";

export default function Style5() {
  return (
    <main className="app v5">
      <Header />
      <div className="body">
        <section className="care">
          <Sparks color="rgba(255,255,255,.72)" spots={[[8, 22, 6], [34, 12, 4], [50, 84, 5]]} />
          <div className="cbody">
            <div className="ct">{copy.careTitle}</div>
            <div className="cs">{copy.careSub}</div>
            <MockButton label={copy.learnMore} className="pillBtn">
              <span>{copy.learnMore}</span>
            </MockButton>
          </div>
          <div className="cpet">
            <Mascot h={86} id="p5" />
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

        <div className="pills">
          <MockButton label={copy.history} className="pill">
            <span className="pi t-lav">
              <Doc size={14} />
            </span>
            <span>{copy.history}</span>
          </MockButton>
          <MockButton label={copy.about} className="pill">
            <span className="pi t-blue">
              <Building size={14} />
            </span>
            <span>{copy.about}</span>
          </MockButton>
          <MockButton label={copy.promo} className="pill">
            <span className="pi t-rose">
              <Gift size={14} />
            </span>
            <span>{copy.promo}</span>
          </MockButton>
        </div>

        <SectionHead title={copy.services} />
        <ServiceGrid items={services} />

        <InfoRow />
        <Ribbon msg="ยิ้มสวย มั่นใจ เริ่มต้นที่นี่" face={false} />
      </div>
    </main>
  );
}
