/**
 * The clinic's tooth character, drawn to the proportions measured off the
 * reference art: a chubby crown that is a touch wider than it is tall, tapering
 * into two short feet with a shallow notch (13% of the height, not a third).
 *
 * The page itself uses flat colour, but the mascot keeps its soft shading —
 * that was the version chosen in the side-by-side. All of it is drawn inside a
 * clip of the silhouette, so no highlight can spill past the outline the way a
 * centred stroke does.
 */
export type Accessory = "none" | "mirror" | "brush";

/** body: x 4.5-95.5, y 3.8-92.4; notch 13% of the height, 7% wide at its apex */
const BODY =
  "M50 8.8C43.6 8.8 39.2 3.8 29.6 3.8 14.8 3.8 4.5 15.4 4.5 31.2c0 8.8 1.1 17.4 4.7 27.2 3.4 9.2 6 16.2 8 21.4 1.8 4.8 3.8 12 9.4 12C32 92.4 38.4 91.6 41.4 86.6c1.6-2.8 3-6 5.4-6h6.4c2.4 0 3.8 3.2 5.4 6C61.6 91.6 68 92.4 73.4 92.4c5.6 0 7.6-7.2 9.4-12 2-5.2 4.6-12.2 8-21.4 3.6-9.8 4.7-18.4 4.7-27.2C95.5 15.4 85.2 3.8 70.4 3.8c-9.6 0-13.8 5-20.4 5Z";

/** upper-left gloss and lower-right shade, both clipped to the silhouette */
const SHEEN = "M6 32C6 16 20 5 39 4 28 11 20 22 18 35c-1.4 10 .6 18 3.6 26C12 55 6 44 6 32Z";
const SHADE = "M104 30C101 58 93 82 62 98L104 98Z";

const VIEW: Record<Accessory, [number, number, number, number]> = {
  none: [-3, 0, 106, 96],
  mirror: [-3, 0, 134, 100],
  brush: [-38, 0, 147, 100],
};

export function Mascot({
  h = 86,
  accessory = "none",
  id = "m",
}: {
  h?: number;
  accessory?: Accessory;
  id?: string;
}) {
  const [vx, vy, vw, vh] = VIEW[accessory];
  return (
    <svg
      height={h}
      width={(h * vw) / vh}
      viewBox={`${vx} ${vy} ${vw} ${vh}`}
      fill="none"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={BODY} />
        </clipPath>
        <linearGradient id={`${id}-b`} x1="0.12" y1="0.04" x2="0.88" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.52" stopColor="#fffbfd" />
          <stop offset="1" stopColor="#f6dbe9" />
        </linearGradient>
        <filter id={`${id}-blur`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.9" />
        </filter>
        <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {accessory === "brush" && (
        <g>
          {/* cup */}
          <path d="M-34 54h28l-3.4 40a5 5 0 0 1-5 4.2h-11.2a5 5 0 0 1-5-4.2Z" fill="#d4bdf0" />
          <path d="M-34 54h28l-.7 8h-26.6Z" fill="#c2a6e8" />
          <rect x="-35.4" y="49.6" width="30.8" height="6.4" rx="3.2" fill="#e4d5f8" />
          {/* brush */}
          <rect x="-24.4" y="12" width="7.2" height="46" rx="3.6" fill="#f7a3c4" transform="rotate(-7 -20.8 35)" />
          <path
            d="M-27.4 4.4h13.2a3.4 3.4 0 0 1 3.4 3.4v7.6h-20V7.8a3.4 3.4 0 0 1 3.4-3.4Z"
            fill="#fdfbff"
            transform="rotate(-7 -20.8 35)"
          />
          <g stroke="#e9dcfa" strokeWidth="1.5" transform="rotate(-7 -20.8 35)">
            <path d="M-24.4 5.6v8.4M-20.8 5.6v8.4M-17.2 5.6v8.4M-13.8 5.6v8.4" />
          </g>
        </g>
      )}

      {accessory === "mirror" && (
        <g>
          {/* the little arm that holds it, tucked behind the body edge */}
          <path d="M86 50c7.5 1.4 13.5 4 19 8.6" stroke="#fdeef6" strokeWidth="8" strokeLinecap="round" />
          {/* handle */}
          <rect x="103.4" y="42" width="7.6" height="52" rx="3.8" fill="#a3b3e2" transform="rotate(9 107.2 68)" />
          <rect x="103.4" y="42" width="3" height="52" rx="1.5" fill="#b9c6ec" transform="rotate(9 107.2 68)" />
          {/* head */}
          <circle cx="112" cy="31" r="13.6" fill="#c7d4f4" stroke="#a3b3e2" strokeWidth="3" />
          <path d="M104.6 25.4a9.4 9.4 0 0 1 7.8-4" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        </g>
      )}

      {/* body */}
      <path d={BODY} fill={`url(#${id}-b)`} />
      <g clipPath={`url(#${id}-clip)`}>
        <path d={SHEEN} fill="#ffffff" opacity="0.95" filter={`url(#${id}-soft)`} />
        <path d={SHADE} fill="#eec6dc" opacity="0.42" filter={`url(#${id}-soft)`} />
        {/* soft shadow in the crease between the two feet */}
        <ellipse cx="50" cy="94" rx="15" ry="7" fill="#e6b6cf" opacity="0.5" filter={`url(#${id}-soft)`} />
        {/* cheeks */}
        <g fill="#f9b3cf" opacity="0.8" filter={`url(#${id}-blur)`}>
          <ellipse cx="18.8" cy="56" rx="7.2" ry="4.4" />
          <ellipse cx="81.2" cy="56" rx="7.2" ry="4.4" />
        </g>
      </g>
      <ellipse cx="35" cy="39.2" rx="3.85" ry="4" fill="#453a68" />
      <ellipse cx="65" cy="39.2" rx="3.85" ry="4" fill="#453a68" />
      <circle cx="33.7" cy="37.4" r="1.15" fill="#fff" opacity="0.9" />
      <circle cx="63.7" cy="37.4" r="1.15" fill="#fff" opacity="0.9" />
      {/* open smile: ink outline with a rose inside */}
      <path d="M39.4 49.8h21.2c0 6-4.8 9.4-10.6 9.4s-10.6-3.4-10.6-9.4Z" fill="#453a68" />
      <path d="M43.8 52.8h12.4c-.4 3.5-3.2 5.2-6.2 5.2s-5.8-1.7-6.2-5.2Z" fill="#ef7fa4" />
    </svg>
  );
}
