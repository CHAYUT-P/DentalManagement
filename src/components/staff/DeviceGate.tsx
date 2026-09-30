"use client";

import React from "react";
import { useStaff } from "@/lib/staffStore";
import { RoomPage } from "./RoomPage";
import { IconSettings } from "./staffIcons";

/**
 * Per-PC mode switch (full edition). A room PC keeps a dentist's page open
 * all day — no sidebar, no desk tools, just that dentist's queue and record
 * forms. The setting lives in this device's localStorage; the small floating
 * button is the way back out (in-clinic machines, no auth wall by design).
 */
export function DeviceGate({ children }: { children: React.ReactNode }) {
  const { edition, deviceMode, roomDentistSlug, setRoomDentistSlug, setDeviceMode } = useStaff();

  if (edition !== "full" || deviceMode !== "room") return <>{children}</>;

  return (
    <div style={{ minHeight: "100dvh", background: "var(--staff-bg, #f4f6fb)" }}>
      <RoomPage slug={roomDentistSlug} onPickRoom={setRoomDentistSlug} />
      <button
        type="button"
        title="ออกจากโหมดห้องตรวจ — กลับสู่หน้าพนักงาน"
        onClick={() => setDeviceMode("frontdesk")}
        style={{
          position: "fixed",
          right: "14px",
          bottom: "14px",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "1px solid var(--staff-border, #dde3f0)",
          background: "#ffffff",
          color: "var(--staff-ink-muted, #8a93ad)",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          boxShadow: "0 2px 10px rgba(30,40,80,.12)",
          zIndex: 50,
        }}
      >
        <IconSettings size={17} />
      </button>
    </div>
  );
}

/** friendly placeholder for pages a lean ("queue") build doesn't carry */
export function EditionNotice({ feature }: { feature: string }) {
  return (
    <div className="staff-container">
      <div className="staff-empty" style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--staff-ink)" }}>
          {feature} — ใช้งานได้ในเวอร์ชัน Full
        </div>
        <div style={{ fontSize: "12.5px", color: "var(--staff-ink-muted)", marginTop: "6px" }}>
          แอปเครื่องนี้ติดตั้งรุ่น Queue (คิว + จัดการเว็บ) — อัปเกรดเป็นรุ่น Full
          เพื่อใช้งาน{feature}
        </div>
      </div>
    </div>
  );
}
