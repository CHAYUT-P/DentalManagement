"use client";

import React, { useState } from "react";
import DentistsPage from "@/app/staff/dentists/page";
import ServicesPage from "@/app/staff/services/page";
import { useStaff } from "@/lib/staffStore";
import { BillingSettingsPanel } from "./BillingSettingsPanel";
import { ClinicSettings, type SettingsTab } from "./ClinicSettings";
import { IconExternal } from "./staffIcons";

type Section = "dentists" | "services" | "billing" | SettingsTab;

/**
 * ตั้งค่า — everything the desk opens rarely, behind one menu entry: the
 * roster and price list (each was its own page) and every group of the old
 * settings page, now listed down the left instead of as a tab strip.
 */
export function SetupView({ patientWebUrl }: { patientWebUrl: string }) {
  const { edition, dentists, settings } = useStaff();
  const [section, setSection] = useState<Section>("dentists");

  const active = dentists.filter((d) => d.isActive).length;
  const items: { key: Section; label: string; sub?: string }[] = [
    { key: "dentists", label: "ทันตแพทย์ & เวรตรวจ", sub: `${dentists.length} คน · รับนัดอยู่ ${active}` },
    { key: "services", label: "บริการ & ราคา", sub: "ราคาที่แสดงบนเว็บคนไข้" },
    { key: "hours", label: "เวลาทำการ & วันหยุด", sub: "เปิด–ปิดรายวัน · วันหยุดพิเศษ" },
    { key: "booking", label: "กฎการจอง & เก้าอี้", sub: `${settings.chairs} เก้าอี้ · ช่วงเวลาจอง` },
    { key: "profile", label: "ข้อมูลคลินิก", sub: "ที่อยู่ เบอร์โทร LINE แผนที่" },
    { key: "staff_notif", label: "การแจ้งเตือน & บัญชี", sub: "เตือนนัดทาง LINE · ผู้ใช้" },
  ];
  if (edition === "full") {
    items.splice(2, 0, { key: "billing", label: "การเงิน & DF", sub: "ใบเสร็จ พร้อมเพย์ ค่าแพทย์" });
    items.push({ key: "device", label: "หน้าจอเครื่องนี้", sub: "เคาน์เตอร์ หรือ ห้องตรวจ" });
  }

  return (
    <div className="setup-view">
      <aside className="setup-nav" aria-label="หมวดการตั้งค่า">
        <h1>ตั้งค่าคลินิก</h1>
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            className={`setup-nav-item ${section === it.key ? "active" : ""}`}
            aria-current={section === it.key ? "page" : undefined}
            onClick={() => setSection(it.key)}
          >
            <span className="sni-label">{it.label}</span>
            {it.sub ? <span className="sni-sub">{it.sub}</span> : null}
          </button>
        ))}
        <div className="setup-nav-foot">
          <a href={patientWebUrl} target="_blank" rel="noreferrer">
            เปิดหน้าเว็บคนไข้ <IconExternal size={12} />
          </a>
        </div>
      </aside>
      <div className="setup-body">
        {section === "dentists" ? (
          <DentistsPage />
        ) : section === "services" ? (
          <ServicesPage />
        ) : section === "billing" ? (
          <BillingSettingsPanel />
        ) : (
          // one instance across groups, like the old tab strip — edits made in
          // one group survive a look at another before saving
          <ClinicSettings tab={section} />
        )}
      </div>
    </div>
  );
}
