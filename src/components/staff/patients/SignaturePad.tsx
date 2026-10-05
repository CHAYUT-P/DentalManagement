"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Sign on the screen — finger on a tablet, pen, or mouse. Hands back a PNG
 * data URL (transparent background) once something has been drawn.
 */
export function SignaturePad({ onChange, height = 160 }: { onChange: (png: string) => void; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  // crisp lines on high-density screens
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio;
    c.height = height * ratio;
    const g = c.getContext("2d");
    if (!g) return;
    g.scale(ratio, ratio);
    g.lineWidth = 2.4;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = "#1f1a3d";
  }, [height]);

  const at = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    ref.current?.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = at(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const g = ref.current?.getContext("2d");
    if (!g) return;
    const p = at(e);
    g.beginPath();
    g.moveTo(last.current.x, last.current.y);
    g.lineTo(p.x, p.y);
    g.stroke();
    last.current = p;
    if (empty) setEmpty(false);
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (!empty && ref.current) onChange(ref.current.toDataURL("image/png"));
  };

  const clear = () => {
    const c = ref.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange("");
  };

  return (
    <div className="sig-pad">
      <canvas
        ref={ref}
        style={{ height }}
        aria-label="ช่องเซ็นชื่อ"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      />
      <div className="sig-pad-bar">
        <span>{empty ? "เซ็นชื่อในกรอบด้วยนิ้ว ปากกา หรือเมาส์" : "เซ็นแล้ว"}</span>
        <button type="button" className="btn-secondary-staff" onClick={clear}>
          ล้าง
        </button>
      </div>
    </div>
  );
}
