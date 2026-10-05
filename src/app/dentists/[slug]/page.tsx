import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DentistDetail } from "@/components/patient/DentistDetail";
import { toUIDentist } from "@/lib/convert";
import { listActiveDentists } from "@/server/queries";

/** profiles render on request from the DB, so an edit in staff shows at once */
export async function generateMetadata({ params }: PageProps<"/dentists/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const rows = await listActiveDentists();
  const d = rows.find((r) => r.slug === slug);
  if (!d) return { title: "Denta Kids" };
  return {
    title: `Denta Kids · ${d.text.th.name}`,
    description: d.text.th.blurb,
  };
}

export default async function Page({ params }: PageProps<"/dentists/[slug]">) {
  const { slug } = await params;
  const rows = await listActiveDentists();
  const row = rows.find((r) => r.slug === slug);
  if (!row) notFound();
  return <DentistDetail d={toUIDentist(row)} />;
}
