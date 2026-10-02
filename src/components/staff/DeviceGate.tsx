"use client";

import React from "react";
import { useStaff } from "@/lib/staffStore";
import { RoomPage } from "./RoomPage";
import { IconArrowRight, IconBuilding } from "./staffIcons";

/**
 * Per-PC mode switch (full edition). A room PC keeps a dentist's page open
 * all day — no sidebar, no desk tools, just that dentist's queue and record
 * forms. The setting lives in this device's localStorage; the bar across the
 * top always says so and holds the way back (in-clinic machines, no auth
 * wall by design).
 */
export function DeviceGate({ children }: { children: React.ReactNode }) {
  const { edition, deviceMode, roomDentistSlug, setRoomDentistSlug, setDeviceMode, dentists } = useStaff();

  if (edition !== "full" || deviceMode !== "room") return <>{children}</>;

  const dentist = dentists.find((d) => d.slug === roomDentistSlug);
  return (
    <div className="room-mode">
      {/* always on screen: which room this PC is, and the two ways out */}
      <header className="room-mode-bar">
        <span className="rmb-title">
          <IconBuilding size={16} />
          เครื่องนี้: ห้องตรวจ{dentist ? ` · ${dentist.text.th.name}` : ""}
        </span>
        <span className="rmb-actions">
          {roomDentistSlug ? (
            <button type="button" className="btn-secondary-staff" onClick={() => setRoomDentistSlug(null)}>
              เปลี่ยนห้อง
            </button>
          ) : null}
          <button type="button" className="btn-primary-staff" onClick={() => setDeviceMode("frontdesk")}>
            <IconArrowRight size={15} />
            <span>กลับหน้าเคาน์เตอร์</span>
          </button>
        </span>
      </header>
      <RoomPage slug={roomDentistSlug} onPickRoom={setRoomDentistSlug} />
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
