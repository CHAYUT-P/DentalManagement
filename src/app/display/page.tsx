import type { Metadata } from "next";

import { CustomerDisplay } from "./CustomerDisplay";

export const metadata: Metadata = {
  title: "Denta Kids · จอลูกค้า",
  robots: { index: false, follow: false },
};

/** the customer-facing screen at the counter — opened as /display?c=<code> */
export default function DisplayPage() {
  return <CustomerDisplay />;
}
