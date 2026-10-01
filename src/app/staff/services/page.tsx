"use client";

import React, { useState } from "react";
import { useStaff } from "@/lib/staffStore";
import { iconLibrary, type IconKey, type IconGroup } from "@/data/icons";
import { useT } from "@/i18n/lang";
import { ServiceIcon } from "@/components/serviceIcons";
import { IconSearch, IconEdit, IconCheck, IconSparkle } from "@/components/staff/staffIcons";

const GROUP_ORDER: IconGroup[] = [
  "check",
  "clean",
  "restore",
  "ortho",
  "surgery",
  "cosmetic",
  "kids",
  "misc",
];

export default function StaffServicesPage() {
  const { servicePrices, updateServicePrice } = useStaff();
  const dict = useT();

  const [search, setSearch] = useState("");
  const [editingKey, setEditingKey] = useState<IconKey | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<string>("");

  const startEdit = (k: IconKey) => {
    setEditingKey(k);
    const p = servicePrices[k];
    setEditPriceValue(p === null ? "" : String(p));
  };

  const saveEdit = (k: IconKey) => {
    const trimmed = editPriceValue.trim();
    if (trimmed === "") {
      updateServicePrice(k, null);
    } else {
      const num = parseInt(trimmed, 10);
      updateServicePrice(k, isNaN(num) ? null : num);
    }
    setEditingKey(null);
  };

  return (
    <div className="staff-container">
      <div className="staff-page-header">
        <div>
          <h2>บริการ &amp; ราคา</h2>
          <p>ราคาเริ่มต้นของแต่ละบริการ แก้แล้วหน้าเว็บคนไข้อัปเดตทันที</p>
        </div>
      </div>

      {/* Search */}
      <div className="staff-toolbar">
        <div className="staff-search-box" style={{ width: "320px" }}>
          <IconSearch size={15} color="var(--staff-ink-muted)" />
          <input
            type="search"
            placeholder="ค้นหาชื่อการรักษาหรือหัตถการ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {GROUP_ORDER.map((groupKey) => {
          const groupItems = iconLibrary.filter((item) => {
            if (item.group !== groupKey) return false;
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            const nameTh = (dict.service[item.key] || item.key).toLowerCase();
            return nameTh.includes(q) || item.key.toLowerCase().includes(q);
          });

          if (groupItems.length === 0) return null;

          const groupTitle = dict.group[groupKey] || groupKey;

          return (
            <div key={groupKey} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "14.5px", fontWeight: "700", color: "var(--staff-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <IconSparkle size={14} />
                <span>{groupTitle}</span>
                <span style={{ fontSize: "12px", color: "var(--staff-ink-muted)", fontWeight: "400" }}>
                  ({groupItems.length} รายการ)
                </span>
              </div>

              <div className="staff-table-wrap">
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th style={{ width: "60px" }}>ไอคอน</th>
                      <th style={{ width: "240px" }}>ชื่อหัตถการ (ไทย)</th>
                      <th style={{ width: "160px" }}>Key รหัสระบบ</th>
                      <th style={{ width: "180px" }}>ราคาเริ่มต้น (บาท)</th>
                      <th>สถานะบนเว็บคนไข้</th>
                      <th style={{ textAlign: "right", width: "120px" }}>แก้ไขราคา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupItems.map((item) => {
                      const name = dict.service[item.key] || item.key;
                      const price = servicePrices[item.key];
                      const isEditing = editingKey === item.key;

                      return (
                        <tr key={item.key}>
                          <td>
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                display: "grid",
                                placeItems: "center",
                                background: `var(--t-${item.tint}-bg, #fcdeef)`,
                                color: `var(--t-${item.tint}, #f472a8)`,
                              }}
                            >
                              <ServiceIcon k={item.key} size={20} />
                            </div>
                          </td>

                          <td>
                            <strong style={{ fontSize: "14px" }}>{name}</strong>
                          </td>

                          <td>
                            <code style={{ fontSize: "11px", background: "var(--staff-surface-subtle)", padding: "2px 6px", borderRadius: "4px", color: "var(--staff-ink-muted)" }}>
                              {item.key}
                            </code>
                          </td>

                          <td>
                            {isEditing ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <input
                                  type="number"
                                  className="form-control"
                                  style={{ width: "100px", padding: "4px 8px" }}
                                  value={editPriceValue}
                                  placeholder="ประเมิน"
                                  onChange={(e) => setEditPriceValue(e.target.value)}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  className="btn-action-icon success"
                                  onClick={() => saveEdit(item.key)}
                                >
                                  <IconCheck size={14} />
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontWeight: "600", color: "var(--staff-ink)" }}>
                                {price === null && <span style={{ color: "var(--staff-ink-muted)", fontWeight: "normal" }}>ตรวจประเมิน</span>}
                                {price === 0 && <span style={{ color: "#2b8a3e" }}>ฟรี (รวมในค่าตรวจ)</span>}
                                {price !== null && price > 0 && `฿${price.toLocaleString()}`}
                              </span>
                            )}
                          </td>

                          <td>
                            <span className="status-pill completed" style={{ fontSize: "11px" }}>
                              เปิดให้จองออนไลน์
                            </span>
                          </td>

                          <td style={{ textAlign: "right" }}>
                            {!isEditing && (
                              <button
                                type="button"
                                className="btn-secondary-staff"
                                style={{ padding: "4px 10px", fontSize: "12px" }}
                                onClick={() => startEdit(item.key)}
                              >
                                <IconEdit size={12} />
                                <span>ตั้งราคา</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
