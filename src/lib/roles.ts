/** Staff roles and what each may open (full edition) */

export type Role = "owner" | "frontdesk" | "dentist" | "assistant";

export type Perm =
  | "queue"
  | "schedule"
  | "patients"
  | "chart"
  | "rooms"
  | "cashier"
  | "void"
  | "stock"
  | "reports"
  | "settings"
  | "finance_settings"
  | "users";

export const ROLE_LABEL: Record<Role, string> = {
  owner: "เจ้าของ / ผู้จัดการ",
  frontdesk: "หน้าเคาน์เตอร์ / การเงิน",
  dentist: "ทันตแพทย์",
  assistant: "ผู้ช่วยทันตแพทย์",
};

const ALL: Perm[] = ["queue", "schedule", "patients", "chart", "rooms", "cashier", "void", "stock", "reports", "settings", "finance_settings", "users"];

export const ROLE_PERMS: Record<Role, Perm[]> = {
  owner: ALL,
  frontdesk: ["queue", "schedule", "patients", "cashier", "void", "stock", "settings"],
  dentist: ["queue", "schedule", "patients", "chart", "rooms"],
  assistant: ["queue", "schedule", "patients", "chart", "rooms", "stock"],
};

export const PERM_LABEL: Record<Perm, string> = {
  queue: "วันนี้ / คิว",
  schedule: "ตารางนัด",
  patients: "ทะเบียนคนไข้",
  chart: "ชาร์ตฟัน แผนการรักษา เอกสารทางคลินิก",
  rooms: "ห้องตรวจ",
  cashier: "การเงิน รับชำระ ค่าใช้จ่าย",
  void: "ยกเลิกบิล",
  stock: "คลัง & แลป",
  reports: "รายงาน",
  settings: "ตั้งค่าคลินิก",
  finance_settings: "ตั้งค่าใบเสร็จ & DF",
  users: "ผู้ใช้ & สิทธิ์",
};

export const can = (role: Role | null | undefined, perm: Perm) => !role || ROLE_PERMS[role]?.includes(perm) === true;

export interface StaffUserInfo {
  id: number;
  name: string;
  role: Role;
  dentistSlug: string | null;
  isActive: boolean;
}

export interface WhoAmI {
  /** null = nobody signed in on this device */
  user: StaffUserInfo | null;
  /** false = no accounts made yet: the app runs open, as before */
  accounts: boolean;
  users: StaffUserInfo[];
}

export interface AuditRow {
  id: number;
  at: string;
  userName: string;
  action: string;
  detail: string;
}

/** the letter in an avatar — skip a leading title such as คุณ / น้อง / ทพ. */
export const initial = (name: string) =>
  (name.replace(/^(คุณ|น้อง|ทพญ?\.|ทพ\.|ดร\.)\s*/, "").trim() || name).slice(0, 1);
