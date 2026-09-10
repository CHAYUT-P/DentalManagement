/**
 * Test-run shim: neutralises the `server-only` guard package so scripts can
 * exercise the REAL server action code outside Next.js. The app itself is
 * untouched — inside Next.js the guard stays armed and client imports of
 * server code still fail the build.
 *
 * Usage: tsx --import ./scripts/shimServerOnly.ts <script>
 */
import Module from "node:module";

type LoadFn = (request: string, parent: unknown, isMain: boolean) => unknown;
const mod = Module as unknown as { _load: LoadFn };
const originalLoad: LoadFn = mod._load;

mod._load = function patched(request, parent, isMain) {
  if (request === "server-only") {
    return {}; // the guard's throw never runs
  }
  return originalLoad.call(this, request, parent, isMain);
};
