/**
 * Route shells shown while a dynamic page streams in. Every patient page hits
 * Postgres, so without a loading boundary a tap waits on a full server
 * roundtrip — with one, Next prefetches the matching shell and the navigation
 * shows it instantly.
 *
 * Each variant mirrors the real page's layout: blocks, not fake content, so
 * nothing reads as data that then snaps away — but the shapes sit where the
 * real ones will, which is what makes the swap feel smooth instead of jarring.
 */

type Variant =
  | "home"
  | "pick" // booking flow + services: eyebrow + card of icon rows
  | "slip" // bookings: appointment slip + history rows
  | "clinic" // about page: prose card, hours ledger, contacts, map
  | "docs" // dentist list: avatar cards
  | "doc" // dentist profile: big avatar + bio + CTA
  | "notes" // notifications: note cards
  | "generic";

function Item() {
  return (
    <div className="skelItem">
      <i className="skel skelDisc" />
      <span className="skelTxt">
        <i className="skel skelLine w60" />
        <i className="skel skelLine w40" />
      </span>
    </div>
  );
}

function Row() {
  return (
    <div className="skelItem">
      <i className="skel skelLine w30" />
      <i className="skel skelLine w40" style={{ marginLeft: "auto" }} />
    </div>
  );
}

function Card({ n, disc = true }: { n: number; disc?: boolean }) {
  return (
    <div className="skelCard">
      {Array.from({ length: n }, (_, i) => (disc ? <Item key={i} /> : <Row key={i} />))}
    </div>
  );
}

/** the fake topbar every Screen page shares — back circle, title, lang pill */
function Top() {
  return (
    <div className="skelTop">
      <i className="skel skelDisc" />
      <i className="skel skelLine w30" />
      <i className="skel skelPill" />
    </div>
  );
}

export function PageLoading({ variant = "generic" }: { variant?: Variant }) {
  let body: React.ReactNode;
  switch (variant) {
    case "home":
      body = (
        <>
          <div className="skel skelHero" />
          <div className="skelDuo">
            <div className="skel" />
            <div className="skel" />
          </div>
          <i className="skel skelLabel" />
          <Card n={3} />
          <i className="skel skelLabel" />
          <Card n={4} disc={false} />
        </>
      );
      break;
    case "pick":
      body = (
        <>
          <Top />
          <i className="skel skelLabel" />
          <Card n={4} />
          <i className="skel skelLabel" />
          <Card n={4} />
        </>
      );
      break;
    case "slip":
      body = (
        <>
          <Top />
          <div className="skel skelSlip" />
          <i className="skel skelLabel" />
          <Card n={4} />
        </>
      );
      break;
    case "clinic":
      body = (
        <>
          <Top />
          <Card n={3} disc={false} />
          <i className="skel skelLabel" />
          <Card n={6} disc={false} />
          <i className="skel skelLabel" />
          <Card n={2} />
          <div className="skel skelMap" />
        </>
      );
      break;
    case "docs":
      body = (
        <>
          <Top />
          {[0, 1, 2].map((i) => (
            <div key={i} className="skelCard" style={{ marginBottom: 10 }}>
              <div className="skelItem">
                <i className="skel skelAvatar" />
                <span className="skelTxt">
                  <i className="skel skelLine w50" />
                  <i className="skel skelLine w70" />
                  <i className="skel skelLine w40" />
                </span>
              </div>
            </div>
          ))}
        </>
      );
      break;
    case "doc":
      body = (
        <>
          <Top />
          <div className="skelCard" style={{ textAlign: "center", padding: 18 }}>
            <i className="skel skelAvatarBig" />
            <i className="skel skelLine w40" style={{ margin: "10px auto 6px" }} />
            <i className="skel skelLine w60" style={{ margin: "0 auto" }} />
          </div>
          <Card n={3} disc={false} />
          <div className="skel skelBtn" />
        </>
      );
      break;
    case "notes":
      body = (
        <>
          <Top />
          {[0, 1, 2].map((i) => (
            <div key={i} className="skelCard" style={{ marginBottom: 10 }}>
              <div className="skelItem">
                <i className="skel skelDisc" />
                <span className="skelTxt">
                  <i className="skel skelLine w40" />
                  <i className="skel skelLine w70" />
                  <i className="skel skelLine w60" />
                </span>
              </div>
            </div>
          ))}
        </>
      );
      break;
    default:
      body = (
        <>
          <Top />
          <div className="skel skelSlip" />
          <Card n={3} />
        </>
      );
  }

  return (
    <div className="shell">
      <main className="app">
        <div className="body" aria-busy="true">
          {body}
        </div>
      </main>
    </div>
  );
}
