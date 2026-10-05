"use client";

import React, { useState } from "react";
import DentistsPage from "@/app/staff/dentists/page";
import ServicesPage from "@/app/staff/services/page";
import { useStaff } from "@/lib/staffStore";
import { useStaffUser } from "@/lib/staffUser";
import { BillingSettingsPanel } from "@/components/staff/billing/BillingSettingsPanel";
import { UsersPanel } from "@/components/staff/settings/UsersPanel";
import { DataPanel } from "@/components/staff/settings/DataPanel";
import { SetupChecklist } from "@/components/staff/settings/SetupChecklist";
import { ClinicSettings, type SettingsTab } from "@/components/staff/settings/ClinicSettings";
import { IconExternal } from "@/components/staff/shell/staffIcons";

type Section = "start" | "dentists" | "services" | "billing" | "users" | "data" | SettingsTab;

/**
 * ตั้งค่า — everything the desk opens rarely, behind one menu entry: the
 * roster and price list (each was its own page) and every group of the old
 * settings page, now listed down the left instead of as a tab strip.
 */
export function SetupView({ patientWebUrl }: { patientWebUrl: string }) {
  const { edition, dentists, settings } = useStaff();
  const { can } = useStaffUser();
  // the owner of a full install opens on the setup checklist
  const [section, setSection] = useState<Section>(edition === "full" && can("users") ? "start" : "dentists");

  const active = dentists.filter((d) => d.isActive).length;
  type Item = { key: Section; label: string; sub?: string; group?: string };
  let items: Item[] = [
    { key: "dentists", label: "ทันตแพทย์ & เวรตรวจ", sub: `${dentists.length} คน · รับนัดอยู่ ${active}` },
    { key: "services", label: "บริการ & ราคา", sub: "ราคาที่แสดงบนเว็บคนไข้" },
    { key: "hours", label: "เวลาทำการ & วันหยุด", sub: "เปิด–ปิดรายวัน · วันหยุดพิเศษ" },
    { key: "booking", label: "กฎการจอง & เก้าอี้", sub: `${settings.chairs} เก้าอี้ · ช่วงเวลาจอง` },
    { key: "profile", label: "ข้อมูลคลินิก", sub: "ที่อยู่ เบอร์โทร LINE แผนที่" },
    { key: "staff_notif", label: "การแจ้งเตือน & บัญชี", sub: "เตือนนัดทาง LINE · ผู้ใช้" },
  ];
  if (edition === "full") {
    // grouped, so a long list still reads at a glance
    items = [
      ...(can("users") ? [{ key: "start" as Section, label: "เริ่มต้นใช้งาน", sub: "สิ่งที่ต้องตั้งก่อนใช้จริง", group: "" }] : []),
      ...items.slice(0, 5).map((i) => ({ ...i, group: "คลินิก" })),
      ...(can("finance_settings") ? [{ key: "billing" as Section, label: "การเงิน & DF", sub: "ใบเสร็จ พร้อมเพย์ ค่าแพทย์ สิทธิ์ LINE", group: "การเงิน" }] : []),
      { ...items[5], group: "ทีมงาน & ระบบ" },
      ...(can("users")
        ? [
            { key: "users" as Section, label: "ผู้ใช้ & สิทธิ์", sub: "PIN แต่ละคน · ตำแหน่ง · ลงเวลา", group: "ทีมงาน & ระบบ" },
            { key: "data" as Section, label: "นำเข้า / ส่งออกข้อมูล", sub: "ย้ายคนไข้จากโปรแกรมเดิม · CSV", group: "ทีมงาน & ระบบ" },
          ]
        : []),
      { key: "device", label: "หน้าจอเครื่องนี้", sub: "เคาน์เตอร์ หรือ ห้องตรวจ", group: "ทีมงาน & ระบบ" },
    ];
  }

  return (
    <div className="setup-view">
      <aside className="setup-nav" aria-label="หมวดการตั้งค่า">
        <h1>ตั้งค่าคลินิก</h1>
        {items.map((it, n) => (
          <React.Fragment key={it.key}>
          {it.group && it.group !== items[n - 1]?.group ? <span className="setup-nav-group">{it.group}</span> : null}
          <button
            type="button"
            className={`setup-nav-item ${section === it.key ? "active" : ""}`}
            aria-current={section === it.key ? "page" : undefined}
            onClick={() => setSection(it.key)}
          >
            <span className="sni-label">{it.label}</span>
            {it.sub ? <span className="sni-sub">{it.sub}</span> : null}
          </button>
          </React.Fragment>
        ))}
        <div className="setup-nav-foot">
          <a href={patientWebUrl} target="_blank" rel="noreferrer">
            เปิดหน้าเว็บคนไข้ <IconExternal size={12} />
          </a>
        </div>
      </aside>
      <div className="setup-body">
        {section === "start" ? (
          <SetupChecklist onGo={(k) => setSection(k as Section)} />
        ) : section === "dentists" ? (
          <DentistsPage />
        ) : section === "services" ? (
          <ServicesPage />
        ) : section === "billing" ? (
          <BillingSettingsPanel patientWebUrl={patientWebUrl} />
        ) : section === "users" ? (
          <UsersPanel />
        ) : section === "data" ? (
          <DataPanel />
        ) : (
          // one instance across groups, like the old tab strip — edits made in
          // one group survive a look at another before saving
          <ClinicSettings tab={section} />
        )}
      </div>
    </div>
  );
}
