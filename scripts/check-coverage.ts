// Sanity-check fixture harvest coverage — for each static driver in the
// upstream source, confirm at least one fixture exists.
//
// Run with: npx tsx scripts/check-coverage.ts

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const DRIVERS_DIR = join(REPO_ROOT, "vendor", "wmbusmeters@af48083", "src");
const FIXTURES = join(REPO_ROOT, "test", "fixtures", "upstream.json");

interface Fixture {
  driver: string;
}

const fixtures = JSON.parse(readFileSync(FIXTURES, "utf8")) as Fixture[];
const fixtured = new Set(fixtures.map((f) => f.driver));

const drivers = readdirSync(DRIVERS_DIR)
  .filter((f) => f.startsWith("driver_") && f.endsWith(".cc"))
  .map((f) => f.slice("driver_".length, -".cc".length));

const missing = drivers.filter((d) => !fixtured.has(d));
const extra = [...fixtured].filter((d) => !drivers.includes(d) && d !== "unknown");

console.log(`Drivers in source:    ${drivers.length}`);
console.log(`Drivers in fixtures:  ${fixtured.size}`);
console.log(`Drivers missing test fixtures (${missing.length}): ${missing.join(", ") || "none"}`);
console.log(
  `Fixture drivers not matching a source file (${extra.length}): ${extra.join(", ") || "none"}`,
);
