import { HomePage } from "@/components/HomePage";
import { toUIDentists } from "@/lib/convert";
import { listDentists } from "@/server/queries";

/** the roster is DB data — never prerender it */
export const dynamic = "force-dynamic";

/**
 * The home screen. The dentist strip is DB-fed; everything else is static
 * design. Dynamic rendering keeps "who is on the strip" current with the
 * staff app's edits.
 */
export default async function Home() {
  const dentists = toUIDentists(await listDentists());
  return <HomePage dentists={dentists} />;
}
