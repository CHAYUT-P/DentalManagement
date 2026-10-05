import Image from "next/image";

import type { Dentist, Face } from "@/data/dentists";

/**
 * A dentist's two pictures. Each dentist carries `photo.small` (the round
 * thumbnail for lists) and `photo.large` (the portrait on the profile page);
 * until the staff app has uploaded them, both are empty strings and we draw the
 * dentist instead from their `face` spec, so a list never shows a grey box.
 *
 * The drawing follows the app's flat rules — solid blocks, no gradients, no
 * shading. It is built from one head (`HeadArt`, centred on x 50 with the chin
 * near y 70) placed over a neck and a scrub top drawn per size, which is why the
 * same face reads at 46px in a list and at full width on the profile.
 */

const INK = "var(--ink)";

function HeadArt({ f }: { f: Face }) {
  const long = f.cut === "bob" || f.cut === "wave";
  const sideH = f.cut === "wave" ? 38 : 30;
  const capped = f.extra === "cap";
  return (
    <g>
      {f.cut === "bun" ? <circle cx="50" cy="15" r="10" fill={f.hair} /> : null}
      {f.cut === "crop" ? (
        <ellipse cx="50" cy="45" rx="22.4" ry="23" fill={f.hair} />
      ) : (
        <ellipse cx="50" cy="43" rx="23.5" ry="25.5" fill={f.hair} />
      )}
      <ellipse cx="50" cy="46.5" rx="20.5" ry="23" fill={f.skin} />
      <circle cx="29.6" cy="49" r="4.2" fill={f.skin} />
      <circle cx="70.4" cy="49" r="4.2" fill={f.skin} />
      {long ? (
        <>
          <rect x="25.8" y="38" width="8.6" height={sideH} rx="4.3" fill={f.hair} />
          <rect x="65.6" y="38" width="8.6" height={sideH} rx="4.3" fill={f.hair} />
        </>
      ) : null}
      {capped ? null : (
        <path
          d="M31.5 37c4.5-8 11-11.5 18.5-11.5S64 29 68.5 37c-6-4.5-12-6.5-18.5-6.5S37.5 32.5 31.5 37Z"
          fill={f.hair}
        />
      )}
      {capped ? (
        <>
          <path
            d="M28 38c0-12 10-19.5 22-19.5S72 26 72 38c-7 2.6-14.5 3.8-22 3.8S35 40.6 28 38Z"
            fill={f.scrubs}
          />
          <path d="M28.6 36.4c7 2.4 14.2 3.6 21.4 3.6s14.4-1.2 21.4-3.6" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.6" fill="none" />
          <circle cx="73.4" cy="30.6" r="3.4" fill={f.scrubs} />
        </>
      ) : (
        <path d="M40.6 40.6h6.2M53.2 40.6h6.2" stroke={INK} strokeOpacity="0.5" strokeWidth="1.9" strokeLinecap="round" />
      )}
      <circle cx="34.6" cy="52.4" r="3.4" fill="var(--rose-1)" opacity="0.5" />
      <circle cx="65.4" cy="52.4" r="3.4" fill="var(--rose-1)" opacity="0.5" />
      <circle cx="42.6" cy="46.4" r="2.7" fill={INK} />
      <circle cx="57.4" cy="46.4" r="2.7" fill={INK} />
      <path
        d="M43 54.6c2.2 3 4.4 4.3 7 4.3s4.8-1.3 7-4.3"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {f.extra === "glasses" ? (
        <g stroke={INK} strokeWidth="1.9" fill="none" strokeLinecap="round">
          <rect x="33.6" y="40.8" width="13.4" height="11.2" rx="4" />
          <rect x="53" y="40.8" width="13.4" height="11.2" rx="4" />
          <path d="M47 45.6h6M33.6 45.6h-4M66.4 45.6h4" />
        </g>
      ) : null}
    </g>
  );
}

/** the round thumbnail — `photo.small` when the clinic has uploaded one */
export function DentistAvatar({
  d,
  alt,
  size = 52,
}: {
  d: Dentist;
  alt: string;
  size?: number;
}) {
  return (
    <span className={`dFace t-${d.tint}`} style={{ width: size, height: size }}>
      {d.photo.small ? (
        <Image src={d.photo.small} alt={alt} width={size} height={size} unoptimized />
      ) : (
        <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
          <rect x="43" y="58" width="14" height="18" rx="5" fill={d.face.skin} />
          <path d="M14 100c0-19 16-29 36-29s36 10 36 29Z" fill={d.face.scrubs} />
          <HeadArt f={d.face} />
        </svg>
      )}
    </span>
  );
}

/** the big picture on the profile — `photo.large` when there is one */
export function DentistPortrait({ d, alt }: { d: Dentist; alt: string }) {
  return (
    <div className={`dBig t-${d.tint}`}>
      {d.photo.large ? (
        <Image src={d.photo.large} alt={alt} fill sizes="(max-width: 460px) 100vw, 420px" unoptimized />
      ) : (
        <svg viewBox="0 0 100 124" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
          <rect x="42.5" y="56" width="15" height="30" rx="6" fill={d.face.skin} />
          <path d="M6 124c0-26 20-41 44-41s44 15 44 41Z" fill={d.face.scrubs} />
          <path
            d="M39 84.5c3 9 6 13 11 16 5-3 8-7 11-16-3.5-1.2-7-1.8-11-1.8s-7.5.6-11 1.8Z"
            fill="#fff"
            opacity="0.55"
          />
          <rect x="61" y="103" width="17" height="15" rx="3" fill="#fff" opacity="0.38" />
          <g transform="translate(4 2) scale(0.92)">
            <HeadArt f={d.face} />
          </g>
        </svg>
      )}
    </div>
  );
}
