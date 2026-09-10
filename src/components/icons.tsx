/* The small chrome icons: header, action cards, info row, wordmark.
 * The treatment icons live in serviceIcons.tsx. */

type P = { className?: string; size?: number };

function Svg({
  size = 22,
  children,
  className,
  fill = "none",
  vb = 24,
}: P & { children: React.ReactNode; fill?: string; vb?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${vb} ${vb}`}
      fill={fill}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* ------------------------------- service icons ------------------------------ */

/* --------------------------------- ui icons -------------------------------- */

export function Bell({ size = 20 }: P) {
  return (
    <Svg size={size}>
      <path d="M12 3.2c-3 0-5 2.1-5 5.1 0 3.4-.7 4.7-1.6 5.9-.5.6-.1 1.6.7 1.6h11.8c.8 0 1.2-1 .7-1.6-.9-1.2-1.6-2.5-1.6-5.9 0-3-2-5.1-5-5.1Z" />
      <path d="M10.1 18.6a2 2 0 0 0 3.8 0" />
    </Svg>
  );
}

export function Calendar({ size = 24 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.6" y="4.6" width="18.8" height="16.8" rx="4.2" fill="currentColor" />
      <path d="M7.6 1.9v4M16.4 1.9v4" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
      <g fill="var(--rose-2)">
        <rect x="6.4" y="10.4" width="3" height="2.7" rx="1.1" />
        <rect x="10.5" y="10.4" width="3" height="2.7" rx="1.1" />
        <rect x="14.6" y="10.4" width="3" height="2.7" rx="1.1" />
        <rect x="6.4" y="14.8" width="3" height="2.7" rx="1.1" />
        <rect x="10.5" y="14.8" width="3" height="2.7" rx="1.1" />
        <rect x="14.6" y="14.8" width="3" height="2.7" rx="1.1" />
      </g>
    </svg>
  );
}

export function ArrowRight({ size = 18 }: P) {
  return (
    <Svg size={size}>
      <path d="M4.5 12h14M12.8 6.2l5.7 5.8-5.7 5.8" strokeWidth={1.9} />
    </Svg>
  );
}

export function Chevron({ size = 12 }: P) {
  return (
    <Svg size={size}>
      <path d="M9.5 5.5l6 6.5-6 6.5" strokeWidth={2} />
    </Svg>
  );
}

export function Clock({ size = 13 }: P) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="8.9" />
      <path d="M12 7.3V12l3.3 2" />
    </Svg>
  );
}

export function Phone({ size = 13 }: P) {
  return (
    <Svg size={size}>
      <path d="M6.1 3.4h3.1l1.6 4-2 1.3a10.4 10.4 0 0 0 4.9 4.9l1.3-2 4 1.6v3.1c0 1-.8 1.8-1.8 1.7C10.6 19.3 4.7 13.4 4.4 5.2c0-1 .7-1.8 1.7-1.8Z" />
    </Svg>
  );
}

export function Pin({ size = 13 }: P) {
  return (
    <Svg size={size}>
      <path d="M12 21.2c4.1-4.4 6.2-7.6 6.2-10.4a6.2 6.2 0 1 0-12.4 0c0 2.8 2.1 6 6.2 10.4Z" />
      <circle cx="12" cy="10.6" r="2.4" />
    </Svg>
  );
}

export function Doc({ size = 20 }: P) {
  return (
    <Svg size={size}>
      <path d="M6.4 3.4h7l4.2 4.2v13H6.4Z" />
      <path d="M13.2 3.4v4.2h4.4M9.3 12.4h5.4M9.3 15.9h5.4" />
    </Svg>
  );
}

export function Building({ size = 20 }: P) {
  return (
    <Svg size={size}>
      <path d="M4.6 20.6V9.4L12 4.2l7.4 5.2v11.2Z" />
      <path d="M12 20.6v-4.2M9.4 11.6h1.2M13.4 11.6h1.2" />
    </Svg>
  );
}

export function Gift({ size = 20 }: P) {
  return (
    <Svg size={size}>
      <path d="M4.4 9.6h15.2v3H4.4zM5.6 12.6h12.8v8H5.6zM12 9.6v11" />
      <path d="M12 9.6C10.6 6 9.2 4.6 7.9 4.6a2 2 0 0 0 0 4M12 9.6c1.4-3.6 2.8-5 4.1-5a2 2 0 0 1 0 4" />
    </Svg>
  );
}

export function Heart({ size = 12 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.6C6.9 17 3.6 14.2 3.6 10.4a4.6 4.6 0 0 1 8.4-2.6 4.6 4.6 0 0 1 8.4 2.6c0 3.8-3.3 6.6-8.4 10.2Z"
        fill="#f7729f"
      />
    </svg>
  );
}

/** Rose tooth wordmark for the header. */
export function LogoMark({ size = 30 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <g stroke="#f386b3" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="#fff6fa">
        <path d="M16 6.9c-2 0-3-1-5-1-2.8 0-4.7 2.3-4.7 5.6 0 2.5.8 3.9 1.35 5.8.45 1.65.6 3.1.75 4.8.25 1.8.65 4 2.35 4 1.65 0 2-1.95 2.35-4 .3-1.7 1.2-2.15 2.85-2.15s2.55.45 2.85 2.15c.35 2.05.7 4 2.35 4 1.7 0 2.1-2.2 2.35-4 .15-1.7.3-3.15.75-4.8.55-1.9 1.35-3.3 1.35-5.8 0-3.3-1.9-5.6-4.7-5.6-2 0-2.85.9-4.85.9Z" />
      </g>
      <circle cx="12.6" cy="13.4" r="1.15" fill="#f386b3" />
      <circle cx="19.4" cy="13.4" r="1.15" fill="#f386b3" />
      <path d="M14 16.4c1.2 1.35 2.8 1.35 4 0" stroke="#f386b3" strokeWidth={1.3} strokeLinecap="round" fill="none" />
      <path d="M25.2 4.2l.75 1.9 1.9.75-1.9.75-.75 1.9-.75-1.9-1.9-.75 1.9-.75Z" fill="#e9a7e0" />
    </svg>
  );
}

/** Scattered 4-point stars used inside coloured panels. */
export function Sparks({
  color = "rgba(255,255,255,.62)",
  spots = [
    [14, 22, 7],
    [86, 16, 5],
    [72, 78, 6],
    [30, 86, 4],
  ],
}: {
  color?: string;
  spots?: [number, number, number][];
}) {
  return (
    <div className="sparks" aria-hidden="true">
      {spots.map(([x, y, r], i) => (
        <svg
          key={i}
          width={r * 2}
          height={r * 2}
          viewBox="-6 -6 12 12"
          style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)" }}
        >
          <path d="M0-6C.8-2 2-.8 6 0 2 .8.8 2 0 6-.8 2-2 .8-6 0-2-.8-.8-2 0-6Z" fill={color} />
        </svg>
      ))}
    </div>
  );
}

/* ---------------- sub-page chrome: back, ticks, facilities, contact ---------- */

export function ChevronLeft({ size = 18 }: P) {
  return (
    <Svg size={size}>
      <path d="M14.5 4.5 7.5 12l7 7.5" strokeWidth={1.9} />
    </Svg>
  );
}

export function Check({ size = 14 }: P) {
  return (
    <Svg size={size}>
      <path d="M4.6 12.6l4.4 4.4L19.4 6.6" strokeWidth={2.3} />
    </Svg>
  );
}

export function Cross({ size = 14 }: P) {
  return (
    <Svg size={size}>
      <path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" strokeWidth={2} />
    </Svg>
  );
}

export function Star({ size = 14 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.4l2.5 5.4 5.9.7-4.3 4 1.2 5.8L12 16.6l-5.3 2.7 1.2-5.8-4.3-4 5.9-.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Car({ size = 18 }: P) {
  return (
    <Svg size={size}>
      <path d="M4.4 14.6l1.3-4.5A2.6 2.6 0 0 1 8.2 8.2h7.6a2.6 2.6 0 0 1 2.5 1.9l1.3 4.5" />
      <rect x="3.4" y="14.4" width="17.2" height="4.4" rx="1.8" />
      <path d="M6.6 18.8v1.4M17.4 18.8v1.4" strokeWidth={1.4} />
    </Svg>
  );
}

export function Wifi({ size = 18 }: P) {
  return (
    <Svg size={size}>
      <path d="M3.4 9.2a13 13 0 0 1 17.2 0" />
      <path d="M6.6 12.8a8.6 8.6 0 0 1 10.8 0" />
      <path d="M9.8 16.4a4.2 4.2 0 0 1 4.4 0" />
      <circle cx="12" cy="19.6" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function Card({ size = 18 }: P) {
  return (
    <Svg size={size}>
      <rect x="3.2" y="5.6" width="17.6" height="12.8" rx="2.6" />
      <path d="M3.2 10h17.6" strokeWidth={2} />
      <path d="M6.6 14.4h3.4" strokeWidth={1.4} />
    </Svg>
  );
}

export function Ball({ size = 18 }: P) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 3.4c-2.6 2.4-4 5.3-4 8.6s1.4 6.2 4 8.6" strokeWidth={1.35} />
      <path d="M12 3.4c2.6 2.4 4 5.3 4 8.6s-1.4 6.2-4 8.6" strokeWidth={1.35} />
      <path d="M3.6 10.4c2.6.9 5.4 1.4 8.4 1.4s5.8-.5 8.4-1.4" strokeWidth={1.35} />
    </Svg>
  );
}

export function Shield({ size = 18 }: P) {
  return (
    <Svg size={size}>
      <path d="M12 3.4l7 2.5v5.6c0 4.3-2.9 7.4-7 9-4.1-1.6-7-4.7-7-9V5.9Z" />
      <path d="M9.2 12.2l2 2 3.6-4" strokeWidth={1.6} />
    </Svg>
  );
}

export function Family({ size = 18 }: P) {
  return (
    <Svg size={size}>
      <circle cx="8.6" cy="7.6" r="3" />
      <path d="M3.6 20.2c0-3.4 2.2-5.6 5-5.6s5 2.2 5 5.6" />
      <circle cx="17.2" cy="11.6" r="2.3" />
      <path d="M13.8 20.2c0-2.5 1.5-4.2 3.4-4.2s3.4 1.7 3.4 4.2" strokeWidth={1.4} />
    </Svg>
  );
}

/** LINE's speech bubble, drawn in the family style rather than the real logo. */
export function LineBubble({ size = 20 }: P) {
  return (
    <Svg size={size}>
      <path d="M12 3.6c-4.9 0-8.8 3.2-8.8 7.4 0 3.8 3.1 6.9 7.3 7.4l-.8 3.2c-.1.5.4.8.8.5l4.6-3.3c3.4-1 5.7-3.8 5.7-7.1 0-4.2-3.9-7.4-8.8-7.4Z" />
      <path d="M8.6 9.4v3.8M15.4 9.4v3.8M12 9.4v3.8" strokeWidth={1.35} opacity={0.75} />
    </Svg>
  );
}

/** A flat street plan for the map card: blocks, two roads, a rose pin. */
export function MapPlan() {
  return (
    <svg viewBox="0 0 320 150" className="mapArt" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="320" height="150" fill="#eef3ec" />
      <g fill="#e2ebe0">
        <rect x="8" y="10" width="86" height="46" rx="4" />
        <rect x="8" y="96" width="86" height="46" rx="4" />
        <rect x="128" y="8" width="70" height="48" rx="4" />
        <rect x="230" y="12" width="82" height="44" rx="4" />
        <rect x="128" y="98" width="70" height="44" rx="4" />
        <rect x="230" y="96" width="82" height="46" rx="4" />
      </g>
      <g fill="#dbe7f0">
        <rect x="236" y="102" width="70" height="34" rx="3" />
      </g>
      <path d="M0 70h320v18H0Z" fill="#fff" />
      <path d="M104 0h16v150h-16Z" fill="#fff" />
      <path d="M206 0h12v150h-12Z" fill="#fff" />
      <path d="M0 79h320" stroke="#f3c8dc" strokeWidth="2" strokeDasharray="9 8" />
      <g fill="#cfe0cd">
        <circle cx="52" cy="120" r="13" />
        <circle cx="34" cy="128" r="9" />
        <circle cx="70" cy="128" r="9" />
      </g>
      <g transform="translate(160 62)">
        <path d="M0 26c-8-9-13-14.5-13-20a13 13 0 0 1 26 0c0 5.5-5 11-13 20Z" fill="#fb70a4" />
        <circle cx="0" cy="6" r="4.6" fill="#fff" />
      </g>
    </svg>
  );
}
