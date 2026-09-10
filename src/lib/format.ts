import type { IconKey } from "@/data/icons";
import { priceOf } from "@/data/prices";
import type { Dict } from "@/i18n/dict";

/**
 * Prices as the patient reads them: a starting price, "quoted at the visit" when
 * the case decides it, or "included" when it comes with the appointment.
 * The locale passed to `toLocaleString` is pinned so the server and the phone
 * always agree on the thousands separator.
 */
export function priceLabel(t: Dict, k: IconKey): string {
  const p = priceOf(k);
  if (p === null) return t.common.quote;
  if (p === 0) return t.common.free;
  return `${t.common.from} ${p.toLocaleString("en-US")} ${t.common.baht}`;
}

/** just the figure, for the compact price beside a treatment row */
export function priceShort(t: Dict, k: IconKey): string {
  const p = priceOf(k);
  if (p === null) return t.common.quote;
  if (p === 0) return t.common.free;
  return `${p.toLocaleString("en-US")} ${t.common.baht}`;
}
