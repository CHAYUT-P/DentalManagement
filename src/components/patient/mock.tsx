"use client";

import { useEffect, useState } from "react";

import { useT } from "@/i18n/lang";

/** Every control on these mock-up screens routes here instead of doing work. */
export function MockButton({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onClick={() => window.dispatchEvent(new CustomEvent("dk:mock", { detail: label }))}
    >
      {children}
    </button>
  );
}

export function Toaster() {
  const t = useT();
  const [items, setItems] = useState<{ id: number; text: string }[]>([]);

  useEffect(() => {
    let n = 0;
    const onMock = (e: Event) => {
      const text = String((e as CustomEvent).detail ?? "");
      const id = ++n;
      setItems((prev) => [...prev.slice(-1), { id, text }]);
      window.setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 1700);
    };
    window.addEventListener("dk:mock", onMock);
    return () => window.removeEventListener("dk:mock", onMock);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toastWrap">
      {items.map((i) => (
        <div key={i.id} className="toast">
          {i.text} · {t.mockNote}
        </div>
      ))}
    </div>
  );
}
