/**
 * Moving between staff screens from shared components: the desktop app
 * routes on the hash (#/cashier), the web console on the path
 * (/staff/cashier). `query` reads a parameter from either.
 */

export function goStaff(path: string): void {
  if (typeof window === "undefined") return;
  // shared with the desktop app, which has no Next router — a plain navigation
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  if (window.location.pathname.startsWith("/staff")) window.location.assign(`/staff${path}`);
  else window.location.hash = `#${path}`;
}

export function staffQuery(name: string): string | null {
  if (typeof window === "undefined") return null;
  const fromSearch = new URLSearchParams(window.location.search).get(name);
  if (fromSearch) return fromSearch;
  const q = window.location.hash.split("?")[1];
  return q ? new URLSearchParams(q).get(name) : null;
}
