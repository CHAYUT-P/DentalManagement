/** an amount in Thai words for the receipt, e.g. 1250 → "หนึ่งพันสองร้อยห้าสิบบาทถ้วน" */

const DIGITS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

function below1M(n: number): string {
  const s = String(n);
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const d = Number(s[i]);
    const place = s.length - i - 1;
    if (d === 0) continue;
    if (place === 1 && d === 1) out += "สิบ";
    else if (place === 1 && d === 2) out += "ยี่สิบ";
    else if (place === 0 && d === 1 && s.length > 1) out += "เอ็ด";
    else out += DIGITS[d] + PLACES[place];
  }
  return out;
}

export function bahtText(amount: number): string {
  const n = Math.round(Math.max(0, amount));
  if (n === 0) return "ศูนย์บาทถ้วน";
  const millions = Math.floor(n / 1_000_000);
  const rest = n % 1_000_000;
  const words = (millions ? `${bahtText(millions).replace("บาทถ้วน", "")}ล้าน` : "") + (rest ? below1M(rest) : "");
  return `${words}บาทถ้วน`;
}
