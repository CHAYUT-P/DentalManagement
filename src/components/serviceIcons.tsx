import type { IconKey } from "@/data/icons";

/**
 * The treatment icons. One family, one grid: 24×24, 1.65 stroke in
 * `currentColor`, accents solid, secondary detail at 1.35. Every icon is drawn to
 * be legible at 22px inside a 38px tinted disc, so each one is given its own
 * silhouette — a tool, a wire, an arrow breaking the outline — rather than a tiny
 * mark inside an identical tooth, which is what made the first set mush together.
 *
 * Bodies are white paper under the coloured outline (`BODY`) — a little white
 * tooth on a pastel disc, the same read as the mascot — so each icon sits in its
 * disc as a solid object rather than a thin wire drawing.
 *
 * `--halo` is the disc colour behind the icon (set by the `.t-*` tint classes in
 * globals.css). Badges and overlaps stroke themselves in it to punch a clean gap
 * out of whatever they sit on, which is what keeps the small stuff readable.
 */

const HALO = "var(--halo, #fff)";

/** the white body every tooth and object is filled with */
const BODY = "#fff";

/** incisor: x 3.8–20.2, y 3.25–20.55 — centre (12, 11.9) */
const TOOTH =
  "M12 4C10.3 4 9.5 3.25 7.8 3.25 5.4 3.25 3.8 5.2 3.8 8.05c0 2.1.7 3.35 1.15 5 .4 1.4.5 2.65.65 4.1.2 1.55.55 3.4 2 3.4 1.4 0 1.7-1.65 2-3.4.25-1.45 1-1.85 2.4-1.85s2.15.4 2.4 1.85c.3 1.75.6 3.4 2 3.4 1.45 0 1.8-1.85 2-3.4.15-1.45.25-2.7.65-4.1.45-1.65 1.15-2.9 1.15-5 0-2.85-1.6-4.8-4-4.8-1.7 0-2.5.75-4.2.75Z";

/** molar: wider crown, two roots — same centre, so the helper below fits both */
const MOLAR =
  "M12 3.4c-4.9 0-8.3 2.2-8.3 5.7 0 2.3 1 3.6 1.6 5.3.55 1.6.7 2.6.95 4 .3 1.7.7 2 1.55 2 .9 0 1.2-1 1.45-2.5.25-1.5.75-2.5 2.75-2.5s2.5 1 2.75 2.5c.25 1.5.55 2.5 1.45 2.5.85 0 1.25-.3 1.55-2 .25-1.4.4-2.4.95-4 .6-1.7 1.6-3 1.6-5.3 0-3.5-3.4-5.7-8.3-5.7Z";

/** veneer shell: a slim crescent that hugs the front of a tooth */
const SHELL =
  "M15.8 5.8c2.9 1.5 4.4 4 4.4 7.1s-1.5 5.6-4.4 7.1c-.9-2.2-1.4-4.6-1.4-7.1s.5-4.9 1.4-7.1Z";

/** A tooth scaled around its own centre, keeping the family stroke weight on
 *  screen (the scale would otherwise thin or fatten it). */
function Tooth({
  d = TOOTH,
  s = 1,
  cx = 12,
  cy = 11.9,
  w = 1.65,
  fillOpacity,
}: {
  d?: string;
  s?: number;
  cx?: number;
  cy?: number;
  w?: number;
  fillOpacity?: number;
}) {
  return (
    <g transform={`translate(${(cx - s * 12).toFixed(2)} ${(cy - s * 11.9).toFixed(2)}) scale(${s})`}>
      <path
        d={d}
        strokeWidth={w / s}
        /* undefined → white body; 0 → outline only; a number → a tint wash */
        fill={fillOpacity === undefined ? BODY : fillOpacity ? "currentColor" : "none"}
        fillOpacity={fillOpacity || undefined}
      />
    </g>
  );
}

/** four-point star, solid. `halo` first draws it in the disc colour so it can
 *  overlap a tooth without the two outlines fighting. */
function Star({ x, y, r, o = 1, halo }: { x: number; y: number; r: number; o?: number; halo?: boolean }) {
  const a = r * 0.28;
  const d = `M${x} ${y - r}C${x + a} ${y - a} ${x + a} ${y - a} ${x + r} ${y}C${x + a} ${y + a} ${x + a} ${y + a} ${x} ${y + r}C${x - a} ${y + a} ${x - a} ${y + a} ${x - r} ${y}C${x - a} ${y - a} ${x - a} ${y - a} ${x} ${y - r}Z`;
  return (
    <>
      {halo ? <path d={d} fill={HALO} stroke={HALO} strokeWidth={2.4} /> : null}
      <path d={d} fill="currentColor" stroke="none" opacity={o} />
    </>
  );
}

function Svg({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* ---------------------------------------------------------------- check-up */

const check = {
  checkup: (
    <>
      <Tooth s={0.7} cx={8.6} cy={9.2} />
      <circle cx="17.6" cy="17.3" r="3.3" fill={HALO} stroke={HALO} strokeWidth={1.9} />
      <circle cx="17.6" cy="17.3" r="3.3" />
      <path d="M19.9 19.6l1.6 1.6" strokeWidth={2} />
    </>
  ),
  consult: (
    <>
      <path d="M6.6 4.2h10.8a3.2 3.2 0 0 1 3.2 3.2v5.6a3.2 3.2 0 0 1-3.2 3.2h-5.2l-4 3.3a.6.6 0 0 1-1-.5v-2.8H6.6A3.2 3.2 0 0 1 3.4 13V7.4a3.2 3.2 0 0 1 3.2-3.2Z" fill={BODY} />
      <g transform="translate(6.72 3.86) scale(0.44)" fill="currentColor" stroke="none">
        <path d={TOOTH} />
      </g>
    </>
  ),
  followup: (
    <>
      <rect x="3.4" y="5.2" width="17.2" height="15.4" rx="3.4" fill={BODY} />
      <path d="M8.2 3.2v3.6M15.8 3.2v3.6" strokeWidth={1.8} />
      <path d="M3.4 10.1h17.2" strokeWidth={1.35} />
      <circle cx="16.8" cy="16.8" r="4.9" fill="currentColor" stroke={HALO} strokeWidth={2.2} paintOrder="stroke" />
      <path d="M14.7 16.9l1.6 1.6 2.6-2.9" stroke={HALO} strokeWidth={1.8} />
    </>
  ),
  xray: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3.2" strokeWidth={1.5} />
      <Tooth s={0.62} cx={12} cy={12.4} fillOpacity={0.18} />
      <path d="M3.4 8.4h1.6M3.4 15.6h1.6M19 8.4h1.6M19 15.6h1.6" strokeWidth={1.35} />
    </>
  ),
  pano: (
    <>
      <rect x="2.2" y="5.2" width="19.6" height="13.6" rx="3.2" strokeWidth={1.45} />
      <path d="M6.2 15.6c0-3.9 2.6-6.4 5.8-6.4s5.8 2.5 5.8 6.4" strokeWidth={3.6} opacity={0.24} />
      <path d="M6.2 15.6c0-3.9 2.6-6.4 5.8-6.4s5.8 2.5 5.8 6.4" strokeWidth={1.3} />
      <path
        d="M8.2 12.8L5.9 11.1M10.1 11.2L8.9 8.7M13.9 11.2l1.2-2.5M15.8 12.8l2.3-1.7"
        strokeWidth={1.2}
      />
    </>
  ),
  scan: (
    <>
      <Tooth s={0.68} cy={12.2} />
      <path
        d="M3.2 7.8V5.4a2.2 2.2 0 0 1 2.2-2.2h2.4M16.2 3.2h2.4a2.2 2.2 0 0 1 2.2 2.2v2.4M20.8 16.2v2.4a2.2 2.2 0 0 1-2.2 2.2h-2.4M7.8 20.8H5.4a2.2 2.2 0 0 1-2.2-2.2v-2.4"
        strokeWidth={1.5}
      />
    </>
  ),
};

/* ------------------------------------------------- cleaning & prevention */

const clean = {
  scaling: (
    <>
      <Tooth s={0.72} cx={9.6} cy={14.2} />
      <path d="M20.6 3.6l-3.4 3.4" strokeWidth={2.4} />
      <path d="M17.2 7c-.9 1-1.2 1.9-1.3 3-.15 1.4-1.1 2.2-2.5 2.3" strokeWidth={1.55} />
      <g fill="currentColor" stroke="none">
        <circle cx="16.4" cy="15.4" r="1.15" opacity={0.5} />
        <circle cx="19.3" cy="13" r="0.9" opacity={0.35} />
      </g>
    </>
  ),
  gum: (
    <>
      <Tooth s={0.62} cy={8.8} />
      {/* the gum line three times over: a gap punched out of the tooth, the
          soft tissue, then its edge */}
      <g>
        <path
          d="M3.4 17.6c2.6 0 3.2-3.2 6-3.2 1.3 0 1.9 1.4 2.6 1.4s1.3-1.4 2.6-1.4c2.8 0 3.4 3.2 6 3.2"
          stroke={HALO}
          strokeWidth={4.8}
        />
        <path
          d="M3.4 17.6c2.6 0 3.2-3.2 6-3.2 1.3 0 1.9 1.4 2.6 1.4s1.3-1.4 2.6-1.4c2.8 0 3.4 3.2 6 3.2"
          strokeWidth={3.4}
          opacity={0.3}
        />
        <path
          d="M3.4 17.6c2.6 0 3.2-3.2 6-3.2 1.3 0 1.9 1.4 2.6 1.4s1.3-1.4 2.6-1.4c2.8 0 3.4 3.2 6 3.2"
          strokeWidth={1.5}
        />
      </g>
    </>
  ),
  polish: (
    <>
      <Tooth s={0.76} cx={9.8} cy={13.4} />
      <path d="M20.8 4l-2.8 2.8" strokeWidth={2.4} />
      <path d="M18 6.8l-2.4 2.4" strokeWidth={1.5} />
      <path
        d="M13.6 8.8l3.2 3.2-1.5 1.5a2.26 2.26 0 0 1-3.2-3.2Z"
        fill="currentColor"
        stroke={HALO}
        strokeWidth={1.8}
        paintOrder="stroke"
      />
      <path d="M17.2 15.2c1.1 1 1.6 2.2 1.6 3.6M20 13.8c1.2 1.5 1.8 3.1 1.8 4.9" strokeWidth={1.35} opacity={0.75} />
    </>
  ),
  fluoride: (
    <>
      <path d="M12 3.2l7.2 2.6v5.8c0 4.4-3 7.6-7.2 9.2-4.2-1.6-7.2-4.8-7.2-9.2V5.8Z" fill={BODY} />
      <path
        d="M12 8.2c1.9 2.1 3 3.5 3 5a3 3 0 0 1-6 0c0-1.5 1.1-2.9 3-5Z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  sealant: (
    <>
      <Tooth d={MOLAR} s={0.86} cy={12.4} />
      <path d="M5.6 8.4c1.9-1.5 3.9-2.2 6.4-2.2s4.5.7 6.4 2.2" strokeWidth={3.2} opacity={0.3} />
      <path d="M6.6 11.2c1.2.9 2.3 1.3 3.4 1.3M17.4 11.2c-1.2.9-2.3 1.3-3.4 1.3" strokeWidth={1.35} />
      <path d="M12 10.2v2.8" strokeWidth={1.35} />
    </>
  ),
  brushing: (
    <>
      <g transform="rotate(-38 12 12)">
        <rect x="6.4" y="10.2" width="12.4" height="3.6" rx="1.8" fill={BODY} />
        <rect x="3.2" y="9.2" width="4.6" height="5.6" rx="1.5" fill="currentColor" stroke="none" />
        <path d="M3.8 9.2V6.6M5.5 9.2V6.6M7.2 9.2V6.6" strokeWidth={1.45} />
      </g>
      <Star x={18.6} y={17.4} r={2.4} />
      <Star x={14.8} y={20.6} r={1.4} o={0.75} />
    </>
  ),
  floss: (
    <>
      <Tooth s={0.44} cx={7.6} cy={9.4} />
      <Tooth s={0.44} cx={16.4} cy={9.4} />
      <path d="M4.2 15c2.6 0 3.2 3.2 7.8 3.2s5.2-3.2 7.8-3.2" strokeWidth={1.5} />
      <g fill="currentColor" stroke="none">
        <circle cx="3.8" cy="15" r="1.5" />
        <circle cx="20.2" cy="15" r="1.5" />
      </g>
    </>
  ),
  mouthwash: (
    <>
      <path d="M9 3.4h6v2.6c0 .8.4 1.2 1 1.8 1.1 1 1.6 2.1 1.6 3.6v6.4a3 3 0 0 1-3 3H9.4a3 3 0 0 1-3-3v-6.4c0-1.5.5-2.6 1.6-3.6.6-.6 1-1 1-1.8Z" fill={BODY} />
      <path d="M9 3.4h6" strokeWidth={2.2} />
      <path d="M8.2 15.4c1.2-1 2.4-1 3.6 0 1.2 1 2.4 1 3.6 0" strokeWidth={1.45} />
      <Star x={19.6} y={5.2} r={2.1} o={0.9} />
    </>
  ),
};

/* -------------------------------------------------- fillings & restoration */

const restore = {
  filling: (
    <>
      <Tooth s={0.94} cy={12.4} />
      <rect
        x="9.1"
        y="5"
        width="5.8"
        height="4.4"
        rx="1.7"
        fill="currentColor"
        stroke={HALO}
        strokeWidth={2}
        paintOrder="stroke"
      />
      <Star x={19.4} y={4.6} r={2.1} halo />
    </>
  ),
  rootcanal: (
    <>
      <Tooth s={0.92} cy={12.8} />
      <path d="M9.9 12.6c-.3 2.6-.5 4-.8 5.6M14.1 12.6c.3 2.6.5 4 .8 5.6" strokeWidth={1.5} />
      <path d="M12 2.4v7.8" stroke={HALO} strokeWidth={3.4} />
      <path d="M12 2.4v7.8" strokeWidth={1.6} />
      <path d="M10.6 4.8L12 3.6l1.4 1.2" strokeWidth={1.3} />
    </>
  ),
  pulpotomy: (
    <>
      <Tooth s={0.86} cy={12.4} />
      <path
        d="M9.1 8.4h5.8c0 3.4-1.3 5.2-2.9 5.2s-2.9-1.8-2.9-5.2Z"
        fill="currentColor"
        stroke={HALO}
        strokeWidth={1.8}
        paintOrder="stroke"
      />
      <path d="M12 14.4v3.4" strokeWidth={1.35} />
    </>
  ),
  crown: (
    <>
      <Tooth d={MOLAR} s={0.8} cy={13.4} />
      <path
        d="M4.4 11.4c0-4.3 3.4-6.9 7.6-6.9s7.6 2.6 7.6 6.9c-2.2 1.4-4.8 2-7.6 2s-5.4-.6-7.6-2Z"
        fill="currentColor"
        fillOpacity={0.92}
        stroke={HALO}
        strokeWidth={1.7}
        paintOrder="stroke"
      />
      <Star x={20.6} y={4.4} r={1.9} halo />
    </>
  ),
  bridge: (
    <>
      <rect x="3.4" y="6.6" width="17.2" height="3.2" rx="1.6" fill="currentColor" stroke="none" opacity={0.9} />
      <Tooth d={MOLAR} s={0.44} cx={6.4} cy={14.2} />
      <Tooth s={0.44} cx={12} cy={14.6} />
      <Tooth d={MOLAR} s={0.44} cx={17.6} cy={14.2} />
    </>
  ),
  denture: (
    <>
      <path
        d="M3.2 11.6c0 5.2 3.9 8.6 8.8 8.6s8.8-3.4 8.8-8.6Z"
        fill="currentColor"
        fillOpacity={0.22}
        stroke="none"
      />
      <path d="M3.2 11.6c0 5.2 3.9 8.6 8.8 8.6s8.8-3.4 8.8-8.6" strokeWidth={1.5} />
      <path d="M3.2 11.6h17.6" strokeWidth={1.4} />
      <g fill="currentColor" stroke="none">
        <rect x="3.6" y="7.8" width="2.7" height="3.5" rx="1" />
        <rect x="7" y="6.6" width="2.9" height="4.7" rx="1.2" />
        <rect x="10.6" y="6.2" width="2.9" height="5.1" rx="1.2" />
        <rect x="14.2" y="6.6" width="2.9" height="4.7" rx="1.2" />
        <rect x="17.7" y="7.8" width="2.7" height="3.5" rx="1" />
      </g>
    </>
  ),
  implant: (
    <>
      <path d="M7.6 3.6h8.8c.9 0 1.6.8 1.5 1.7l-.6 4.1H6.7l-.6-4.1c-.1-.9.6-1.7 1.5-1.7Z" fill={BODY} />
      <path d="M3.4 11.4h17.2" strokeWidth={1.35} opacity={0.5} />
      <path
        d="M10.2 11.6h3.6l-.55 7.6c-.06 1-.5 1.6-1.25 1.6s-1.19-.6-1.25-1.6Z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M10.1 13.8h3.8M10.3 16h3.4M10.5 18.2h3" stroke={HALO} strokeWidth={1.2} />
    </>
  ),
};

/* -------------------------------------------------------------- cosmetic */

const cosmetic = {
  whitening: (
    <>
      <Tooth s={0.86} cx={10.8} cy={12.8} />
      <Star x={18.4} y={5.6} r={3.4} halo />
      <Star x={21.2} y={11.4} r={1.7} o={0.8} halo />
      <Star x={14.6} y={2.6} r={1.3} o={0.7} halo />
    </>
  ),
  veneer: (
    <>
      <Tooth s={0.84} cx={9.4} cy={12.4} />
      {/* the facing itself: a thin translucent shell going on over the front */}
      <path d={SHELL} stroke={HALO} strokeWidth={4} />
      <path d={SHELL} fill="currentColor" fillOpacity={0.16} />
    </>
  ),
};

/* --------------------------------------------------------- surgery & pain */

const surgery = {
  extraction: (
    <>
      <g transform="rotate(-13 9.8 12.2)">
        <Tooth s={0.84} cx={9.8} cy={12.2} />
      </g>
      <path d="M19 18.6V6.6" strokeWidth={1.9} />
      <path d="M16.6 9l2.4-2.4 2.4 2.4" strokeWidth={1.9} />
    </>
  ),
  wisdom: (
    <>
      {/* the gum line, the row of crowns standing on it, and the extra tooth
          lying tipped under the gum where it is stuck */}
      <path d="M2.6 12.6h18.8" strokeWidth={1.7} />
      <path d="M4.4 7.7a1.9 1.9 0 0 1 1.9-1.9h.4a1.9 1.9 0 0 1 1.9 1.9v4.9H4.4Z" fill={BODY} />
      <path d="M9.8 7.7a1.9 1.9 0 0 1 1.9-1.9h.4a1.9 1.9 0 0 1 1.9 1.9v4.9H9.8Z" fill={BODY} />
      <path d="M15.2 7.7a1.9 1.9 0 0 1 1.9-1.9h.4a1.9 1.9 0 0 1 1.9 1.9v4.9h-4.2Z" fill={BODY} />
      <g transform="rotate(-46 17.3 20.2)">
        <path d="M15 15.6a2 2 0 0 1 2-2h.6a2 2 0 0 1 2 2v4.6H15Z" fill="currentColor" fillOpacity={0.3} />
      </g>
    </>
  ),
  surgery: (
    <>
      <path
        d="M21 2.8l-1.5 6.7c-.23 1.04-1.06 1.7-2.1 1.7h-3.7Z"
        fill="currentColor"
        stroke={HALO}
        strokeWidth={1.5}
        paintOrder="stroke"
      />
      <path d="M13.7 11.2L5.2 19.7" strokeWidth={2.6} />
      <path d="M13.4 20.6h7.2" strokeWidth={1.4} strokeDasharray="2.2 2.6" opacity={0.55} />
    </>
  ),
  anesthesia: (
    <>
      <g transform="rotate(-40 12 12)">
        <rect x="7.2" y="8.6" width="8.6" height="5.6" rx="1.5" fill={BODY} />
        <path d="M3.6 11.4h3.6" strokeWidth={1.6} />
        <path d="M3.4 9.4v4" strokeWidth={1.8} />
        <rect x="15.4" y="9.8" width="1.8" height="3.2" rx="0.6" fill="currentColor" stroke="none" />
        <path d="M17.2 11.4h2.6" strokeWidth={1.4} />
        <path d="M9.6 8.6v5.6M11.8 8.6v5.6" strokeWidth={1.1} opacity={0.45} />
      </g>
      <path
        d="M19.4 4.2c1.1 1.3 1.7 2.1 1.7 2.9a1.7 1.7 0 0 1-3.4 0c0-.8.6-1.6 1.7-2.9Z"
        fill="currentColor"
        stroke="none"
        opacity={0.9}
      />
    </>
  ),
  sedation: (
    <>
      <path
        d="M17.4 15.8A7.2 7.2 0 0 1 8.2 6.6 7.6 7.6 0 1 0 17.4 15.8Z"
        fill="currentColor"
        fillOpacity={0.16}
        strokeWidth={1.6}
      />
      <Star x={19.6} y={5.6} r={2.3} />
      <Star x={15.4} y={2.8} r={1.3} o={0.7} />
    </>
  ),
  toothache: (
    <>
      <Tooth s={0.78} cx={9.6} cy={12.4} />
      <path d="M16.8 8a6 6 0 0 1 0 8" strokeWidth={1.5} opacity={0.85} />
      <path d="M19.6 6a9 9 0 0 1 0 12" strokeWidth={1.35} opacity={0.5} />
    </>
  ),
};

/* ------------------------------------------------- braces & appliances */

const ortho = {
  braces: (
    <>
      <Tooth s={0.94} cy={12} />
      <path d="M2.2 12.4h19.6" stroke={HALO} strokeWidth={3.2} />
      <path d="M2.2 12.4h19.6" strokeWidth={1.5} />
      <rect
        x="9.5"
        y="9.9"
        width="5"
        height="5"
        rx="1.5"
        fill="currentColor"
        stroke={HALO}
        strokeWidth={1.9}
        paintOrder="stroke"
      />
      <path d="M10.2 12.4h3.6" stroke={HALO} strokeWidth={1.4} />
    </>
  ),
  aligner: (
    <>
      <Tooth s={0.74} cy={12.4} />
      <Tooth s={1.02} cy={12} w={2.4} fillOpacity={0} />
    </>
  ),
  retainer: (
    <>
      <path
        d="M4.2 18.6c0-4.9 3.5-8.4 7.8-8.4s7.8 3.5 7.8 8.4Z"
        fill="currentColor"
        fillOpacity={0.22}
        stroke="none"
      />
      <path d="M4.2 18.6c0-4.9 3.5-8.4 7.8-8.4s7.8 3.5 7.8 8.4" strokeWidth={1.5} />
      <path d="M3.4 12.8c1.7-3.4 4.8-5.4 8.6-5.4s6.9 2 8.6 5.4" strokeWidth={1.5} />
      <circle cx="3.2" cy="14.2" r="1.7" strokeWidth={1.4} />
      <circle cx="20.8" cy="14.2" r="1.7" strokeWidth={1.4} />
    </>
  ),
  spacemaintainer: (
    <>
      <Tooth d={MOLAR} s={0.62} cx={7} cy={12.4} />
      <path d="M2.6 10.8h8.8M2.8 13.6h8.4" strokeWidth={1.4} />
      <path d="M11.8 12.2h5" strokeWidth={1.6} />
      <path d="M18.4 7.8v8.8" strokeWidth={2.2} />
    </>
  ),
  nightguard: (
    <>
      <Tooth s={0.46} cy={7.2} />
      <path
        d="M4.2 12.6c0 5.2 3.5 8.2 7.8 8.2s7.8-3 7.8-8.2Z"
        fill="currentColor"
        fillOpacity={0.22}
        stroke="none"
      />
      <path d="M4.2 12.6c0 5.2 3.5 8.2 7.8 8.2s7.8-3 7.8-8.2" strokeWidth={1.5} />
      <path d="M4.2 12.6h15.6" strokeWidth={1.4} />
      <path d="M8.2 12.6v2.4M12 12.6v2.8M15.8 12.6v2.4" strokeWidth={1.3} opacity={0.7} />
    </>
  ),
  jaw: (
    <>
      {/* the jawbone in profile: the condyle riding at the top of the ramus, the
          body sweeping forward to the chin, teeth standing on the ridge */}
      <path d="M17.9 7v5.2c0 2.8-1.9 4.8-5.7 5.9-2.5.7-4.9.9-6.9.6-1.2-.3-1.6-1.2-1.2-2.6.3-1.1.3-2.2 0-3.2h11.5c.9-.2 1.4-1.8 1.7-4.2.1-1 .3-1.7.5-1.7Z" fill={BODY} />
      <rect x="5.8" y="10.4" width="2.4" height="2.7" rx="1.1" />
      <rect x="8.9" y="10.4" width="2.4" height="2.7" rx="1.1" />
      <rect x="12" y="10.4" width="2.4" height="2.7" rx="1.1" />
      <circle cx="18.4" cy="4.6" r="2.3" fill="currentColor" fillOpacity={0.2} stroke={HALO} strokeWidth={3.2} />
      <circle cx="18.4" cy="4.6" r="2.3" fill="currentColor" fillOpacity={0.2} />
    </>
  ),
};

/* ---------------------------------------------------------- for kids, misc */

const kids = {
  kids: (
    <>
      <Tooth />
      <g fill="currentColor" stroke="none">
        <circle cx="9.5" cy="10.4" r="1.2" />
        <circle cx="14.5" cy="10.4" r="1.2" />
      </g>
      <path d="M9.7 13.4c.6.9 1.3 1.4 2.3 1.4s1.7-.5 2.3-1.4" strokeWidth={1.5} />
    </>
  ),
  babytooth: (
    <>
      <Tooth s={0.74} cx={10.4} cy={13.2} />
      <path
        d="M18.6 5c1.2 0 2 .9 2 2 0 1.7-1.7 2.8-3.4 4.1-1.7-1.3-3.4-2.4-3.4-4.1 0-1.1.8-2 2-2 .7 0 1.2.3 1.4.8.2-.5.7-.8 1.4-.8Z"
        fill="currentColor"
        stroke={HALO}
        strokeWidth={1.6}
        paintOrder="stroke"
      />
    </>
  ),
};

const misc = {
  more: (
    <g fill="currentColor" stroke="none">
      <circle cx="6" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="18" cy="12" r="1.75" />
    </g>
  ),
};

const SHAPES: Record<IconKey, React.ReactNode> = {
  ...check,
  ...clean,
  ...restore,
  ...cosmetic,
  ...surgery,
  ...ortho,
  ...kids,
  ...misc,
};

export function ServiceIcon({ k, size = 22 }: { k: IconKey; size?: number }) {
  return <Svg size={size}>{SHAPES[k]}</Svg>;
}
