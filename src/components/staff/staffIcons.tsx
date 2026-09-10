/* Staff portal icons — clean, high-contrast, scalable SVG icons */
import type { ReactNode } from "react";

type P = { className?: string; size?: number; color?: string };

function Svg({
  size = 18,
  children,
  className,
  color = "currentColor",
  vb = 24,
}: P & { children: ReactNode; vb?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${vb} ${vb}`}
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconCalendar({ size = 18, className }: P) {
  return (
    <Svg size={size} className={className}>
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Svg>
  );
}

export function IconList({ size = 18, className }: P) {
  return (
    <Svg size={size} className={className}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth={3} />
      <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth={3} />
      <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth={3} />
    </Svg>
  );
}

export function IconUsers({ size = 18, className }: P) {
  return (
    <Svg size={size} className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

export function IconDentist({ size = 18, className }: P) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 2C8 2 6 5 6 8.5c0 3 1.5 5 2.5 8 1 3 1.5 5.5 3.5 5.5s2.5-2.5 3.5-5.5c1-3 2.5-5 2.5-8C18 5 16 2 12 2Z" />
      <path d="M9 9h6M12 6v6" />
    </Svg>
  );
}

export function IconServices({ size = 18, className }: P) {
  return (
    <Svg size={size} className={className}>
      <path d="m14 7 3-3 4 4-3 3M17 10l-9.5 9.5a2.12 2.12 0 0 1-3-3L14 7" />
      <path d="m7 17 3 3" />
    </Svg>
  );
}

export function IconWalkIn({ size = 18, className }: P) {
  return (
    <Svg size={size} className={className}>
      <path d="M13 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M7 21l3-7 3 2v6M13 14l3.5-4-3-3H9L6.5 10 9 12" />
    </Svg>
  );
}

export function IconSettings({ size = 18, className }: P) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </Svg>
  );
}

export function IconPlus({ size = 16, className }: P) {
  return (
    <Svg size={size} className={className}>
      <line x1="12" y1="5" x2="12" y2="19" strokeWidth={2.2} />
      <line x1="5" y1="12" x2="19" y2="12" strokeWidth={2.2} />
    </Svg>
  );
}

export function IconCheck({ size = 16, className }: P) {
  return (
    <Svg size={size} className={className}>
      <polyline points="20 6 9 17 4 12" strokeWidth={2.2} />
    </Svg>
  );
}

export function IconX({ size = 16, className }: P) {
  return (
    <Svg size={size} className={className}>
      <line x1="18" y1="6" x2="6" y2="18" strokeWidth={2.2} />
      <line x1="6" y1="6" x2="18" y2="18" strokeWidth={2.2} />
    </Svg>
  );
}

export function IconSearch({ size = 16, className }: P) {
  return (
    <Svg size={size} className={className}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth={2} />
    </Svg>
  );
}

export function IconClock({ size = 16, className }: P) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Svg>
  );
}

export function IconPhone({ size = 16, className }: P) {
  return (
    <Svg size={size} className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />
    </Svg>
  );
}

export function IconZap({ size = 16, className }: P) {
  return (
    <Svg size={size} className={className}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Svg>
  );
}

export function IconArrowRight({ size = 16, className }: P) {
  return (
    <Svg size={size} className={className}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </Svg>
  );
}

export function IconChevronLeft({ size = 16, className }: P) {
  return (
    <Svg size={size} className={className}>
      <polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

export function IconChevronRight({ size = 16, className }: P) {
  return (
    <Svg size={size} className={className}>
      <polyline points="9 18 15 12 9 6" />
    </Svg>
  );
}

export function IconExternal({ size = 14, className }: P) {
  return (
    <Svg size={size} className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </Svg>
  );
}

export function IconEdit({ size = 15, className }: P) {
  return (
    <Svg size={size} className={className}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Svg>
  );
}

export function IconBell({ size = 16, className }: P) {
  return (
    <Svg size={size} className={className}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  );
}

export function IconFilter({ size = 15, className }: P) {
  return (
    <Svg size={size} className={className}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </Svg>
  );
}

export function IconPin({ size = 16, className }: P) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 21.2c4.1-4.4 6.2-7.6 6.2-10.4a6.2 6.2 0 1 0-12.4 0c0 2.8 2.1 6 6.2 10.4Z" />
      <circle cx="12" cy="10.6" r="2.4" />
    </Svg>
  );
}

export function IconBuilding({ size = 16, className }: P) {
  return (
    <Svg size={size} className={className}>
      <path d="M4.6 20.6V9.4L12 4.2l7.4 5.2v11.2Z" />
      <path d="M12 20.6v-4.2M9.4 11.6h1.2M13.4 11.6h1.2" />
    </Svg>
  );
}

export function IconShield({ size = 16, className }: P) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 3.4l7 2.5v5.6c0 4.3-2.9 7.4-7 9-4.1-1.6-7-4.7-7-9V5.9Z" />
      <path d="M9.2 12.2l2 2 3.6-4" strokeWidth={1.6} />
    </Svg>
  );
}

export function IconDollar({ size = 16, className }: P) {
  return (
    <Svg size={size} className={className}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Svg>
  );
}

export function IconSmartphone({ size = 16, className, color }: P) {
  return (
    <Svg size={size} className={className} color={color}>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth={2} />
    </Svg>
  );
}

export function IconAlertTriangle({ size = 16, className, color }: P) {
  return (
    <Svg size={size} className={className} color={color}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth={2} />
    </Svg>
  );
}

export function IconGrip({ size = 14, className, color }: P) {
  return (
    <Svg size={size} className={className} color={color}>
      <circle cx="9" cy="6" r="1.25" fill={color || "currentColor"} stroke="none" />
      <circle cx="9" cy="12" r="1.25" fill={color || "currentColor"} stroke="none" />
      <circle cx="9" cy="18" r="1.25" fill={color || "currentColor"} stroke="none" />
      <circle cx="15" cy="6" r="1.25" fill={color || "currentColor"} stroke="none" />
      <circle cx="15" cy="12" r="1.25" fill={color || "currentColor"} stroke="none" />
      <circle cx="15" cy="18" r="1.25" fill={color || "currentColor"} stroke="none" />
    </Svg>
  );
}

export function IconSparkle({ size = 16, className, color }: P) {
  return (
    <Svg size={size} className={className} color={color}>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </Svg>
  );
}

export function IconCar({ size = 18, className, color }: P) {
  return (
    <Svg size={size} className={className} color={color}>
      <path d="M5 17h14M3 11l2.5-5.5a2 2 0 0 1 1.8-1.2h9.4a2 2 0 0 1 1.8 1.2L21 11v6a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H4a1 1 0 0 1-1-1v-6Z" />
      <circle cx="7.5" cy="16.5" r="1.5" />
      <circle cx="16.5" cy="16.5" r="1.5" />
    </Svg>
  );
}

export function IconToy({ size = 18, className, color }: P) {
  return (
    <Svg size={size} className={className} color={color}>
      <circle cx="8" cy="7" r="2" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="12" cy="13" r="6" />
      <circle cx="10" cy="12" r="0.75" fill={color || "currentColor"} />
      <circle cx="14" cy="12" r="0.75" fill={color || "currentColor"} />
      <ellipse cx="12" cy="15" rx="1.5" ry="1" />
    </Svg>
  );
}

export function IconWifi({ size = 18, className, color }: P) {
  return (
    <Svg size={size} className={className} color={color}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill={color || "currentColor"} stroke="none" />
    </Svg>
  );
}

export function IconBaby({ size = 18, className, color }: P) {
  return (
    <Svg size={size} className={className} color={color}>
      <path d="M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" />
      <path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5h-1.5" />
    </Svg>
  );
}

export function IconCreditCard({ size = 18, className, color }: P) {
  return (
    <Svg size={size} className={className} color={color}>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </Svg>
  );
}

