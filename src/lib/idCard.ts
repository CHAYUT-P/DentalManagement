/**
 * Thai national ID cards, read by the desktop app (src-tauri/src/idcard.rs)
 * through a USB smart-card reader. In a browser there is no reader access —
 * `idCardReaderAvailable()` is false and the buttons don't show.
 */

export interface ThaiIdCard {
  cid: string;
  prefixTh: string;
  firstTh: string;
  lastTh: string;
  prefixEn: string;
  firstEn: string;
  lastEn: string;
  /** YYYY-MM-DD */
  birthdate: string;
  gender: "male" | "female" | "";
  address: string;
  issueDate: string;
  expireDate: string;
}

type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
const tauri = () =>
  typeof window === "undefined" ? undefined : (window as unknown as { __TAURI_INTERNALS__?: { invoke: Invoke } }).__TAURI_INTERNALS__;

export const idCardReaderAvailable = () => !!tauri();

/** throws a Thai message the desk can act on (no reader, no card, not an ID card…) */
export async function readIdCard(): Promise<ThaiIdCard> {
  const t = tauri();
  if (!t) throw new Error("อ่านบัตรได้เฉพาะในแอปบนเครื่องที่ต่อเครื่องอ่านบัตร");
  try {
    return (await t.invoke("read_thai_id")) as ThaiIdCard;
  } catch (e) {
    throw new Error(typeof e === "string" ? e : "อ่านบัตรไม่สำเร็จ");
  }
}

export const thaiFullName = (c: ThaiIdCard) => [c.prefixTh, c.firstTh, c.lastTh].filter(Boolean).join(" ");
