/** Stock, suppliers, expenses and lab orders (full edition) — shared shapes */

export type StockCategory = "material" | "drug" | "product" | "other";
export const STOCK_CATEGORIES: { key: StockCategory; label: string }[] = [
  { key: "material", label: "วัสดุทันตกรรม" },
  { key: "drug", label: "ยา" },
  { key: "product", label: "สินค้าขาย" },
  { key: "other", label: "อื่น ๆ" },
];

export type MoveKind = "receive" | "use" | "sell" | "adjust" | "expire" | "return";
export const MOVE_LABEL: Record<MoveKind, string> = {
  receive: "รับเข้า",
  use: "ใช้ในการรักษา",
  sell: "ขาย",
  adjust: "ปรับยอด",
  expire: "หมดอายุ/เสีย",
  return: "คืนผู้จำหน่าย",
};

export interface Supplier {
  id: number;
  name: string;
  kind: "supplier" | "lab";
  phone: string;
  contact: string;
  note: string;
  isActive: boolean;
}

export interface StockItem {
  id: number;
  name: string;
  category: StockCategory;
  unit: string;
  cost: number;
  price: number;
  minQty: number;
  qty: number;
  sellable: boolean;
  supplierId: number | null;
  note: string;
  isActive: boolean;
  /** at or below the minimum */
  low: boolean;
  /** the soonest expiry among stock received, if any is dated */
  nextExpiry: string | null;
}

export interface StockMove {
  id: number;
  itemId: number;
  itemName: string;
  unit: string;
  change: number;
  kind: MoveKind;
  unitCost: number;
  invoiceId: number | null;
  lot: string;
  expiry: string | null;
  note: string;
  date: string;
}

export interface Consumable {
  id: number;
  treatmentKey: string;
  itemId: number;
  qty: number;
}

export const EXPENSE_CATEGORIES = [
  "วัสดุทันตกรรม",
  "ยา",
  "ค่าแลป",
  "เงินเดือน",
  "ค่าแพทย์ (DF)",
  "ค่าเช่า",
  "ค่าน้ำ-ไฟ-อินเทอร์เน็ต",
  "ซ่อมบำรุง",
  "การตลาด",
  "อื่น ๆ",
];

export interface Expense {
  id: number;
  date: string;
  category: string;
  amount: number;
  supplierId: number | null;
  method: string;
  note: string;
}

export type LabStatus = "sent" | "received" | "fitted" | "remake" | "cancelled";
export const LAB_STATUS_LABEL: Record<LabStatus, string> = {
  sent: "ส่งแลปแล้ว",
  received: "ได้รับงานแล้ว",
  fitted: "ใส่ให้คนไข้แล้ว",
  remake: "ส่งแก้",
  cancelled: "ยกเลิก",
};

export interface LabOrder {
  id: number;
  childId: number | null;
  patientName: string;
  labId: number | null;
  dentistSlug: string | null;
  work: string;
  teeth: string;
  shade: string;
  sentDate: string;
  dueDate: string | null;
  receivedDate: string | null;
  cost: number;
  status: LabStatus;
  note: string;
}
