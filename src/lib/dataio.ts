/** CSV import/export helpers shared by the data page and the server (full edition) */

export type ImportField =
  | "hn"
  | "name"
  | "fullName"
  | "birthdate"
  | "gender"
  | "idCard"
  | "allergies"
  | "conditions"
  | "medications"
  | "notes"
  | "guardian"
  | "relation"
  | "phone"
  | "line"
  | "address";

/** what each field is called in a typical clinic export — matched loosely */
export const FIELD_NAMES: Record<ImportField, { label: string; match: string[] }> = {
  hn: { label: "HN / เลขที่แฟ้ม", match: ["hn", "เลขที่แฟ้ม", "รหัสคนไข้", "เลขประจำตัวผู้ป่วย", "patient id", "รหัส"] },
  name: { label: "ชื่อเล่น / ชื่อเรียก", match: ["ชื่อเล่น", "ชื่อเรียก", "nickname", "nick"] },
  fullName: { label: "ชื่อ-นามสกุล", match: ["ชื่อ-นามสกุล", "ชื่อนามสกุล", "ชื่อ นามสกุล", "ชื่อจริง", "full name", "fullname", "name", "ชื่อ"] },
  birthdate: { label: "วันเกิด", match: ["วันเกิด", "วันเดือนปีเกิด", "birth", "dob"] },
  gender: { label: "เพศ", match: ["เพศ", "gender", "sex"] },
  idCard: { label: "เลขบัตรประชาชน", match: ["เลขบัตร", "บัตรประชาชน", "id card", "idcard", "national id", "citizen"] },
  allergies: { label: "แพ้ยา", match: ["แพ้", "allerg"] },
  conditions: { label: "โรคประจำตัว", match: ["โรคประจำตัว", "โรค", "disease", "condition"] },
  medications: { label: "ยาที่ใช้ประจำ", match: ["ยาประจำ", "ยาที่ใช้", "medication"] },
  notes: { label: "หมายเหตุ", match: ["หมายเหตุ", "note", "remark"] },
  guardian: { label: "ผู้ปกครอง", match: ["ผู้ปกครอง", "guardian", "parent", "บิดา", "มารดา"] },
  relation: { label: "ความสัมพันธ์", match: ["ความสัมพันธ์", "relation"] },
  phone: { label: "เบอร์โทร", match: ["เบอร์", "โทร", "phone", "tel", "mobile", "มือถือ"] },
  line: { label: "LINE", match: ["line"] },
  address: { label: "ที่อยู่", match: ["ที่อยู่", "address"] },
};

/** a small RFC-4180 reader: quotes, doubled quotes, commas and newlines inside quotes */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

/** which column holds which field, guessed from the header row */
export function guessColumns(header: string[]): Partial<Record<ImportField, number>> {
  const out: Partial<Record<ImportField, number>> = {};
  const used = new Set<number>();
  // more specific names first, so "ชื่อเล่น" isn't taken as the full name
  const order: ImportField[] = ["hn", "name", "idCard", "birthdate", "guardian", "relation", "phone", "line", "allergies", "conditions", "medications", "notes", "address", "gender", "fullName"];
  for (const f of order) {
    const idx = header.findIndex((h, i) => !used.has(i) && FIELD_NAMES[f].match.some((m) => h.trim().toLowerCase().includes(m.toLowerCase())));
    if (idx >= 0) {
      out[f] = idx;
      used.add(idx);
    }
  }
  return out;
}
