import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodeWmbusHexSync } from "../../src/api.js";
import { listDriverNames } from "../../src/drivers/registry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_PATH = resolve(__dirname, "..", "fixtures", "upstream.json");

interface Fixture {
  source: string;
  driver: string;
  name: string;
  id: string;
  key: string;
  hex: string;
  expected: Record<string, unknown>;
}
const FIXTURES = JSON.parse(readFileSync(FIXTURES_PATH, "utf8")) as Fixture[];

const TIMESTAMP_TEST = "1111-11-11T11:11:11Z";

// Helper: is this a Kamstrup compact-format short telegram that needs the
// Phase 6+ format-signature cache? L < 0x23 and CI=0x8D (ELL II) usually
// means compact.
function isShortFormCompact(hex: string): boolean {
  const cleaned = hex.replace(/[^0-9A-Fa-f]/g, "");
  if (cleaned.length < 22) return false;
  const l = Number.parseInt(cleaned.slice(0, 2), 16);
  const ci = Number.parseInt(cleaned.slice(20, 22), 16);
  return l < 0x28 && ci === 0x8d;
}

function isFormatB(hex: string): boolean {
  const c = hex.replace(/[^0-9A-Fa-f]/g, "");
  return c.slice(0, 2).toLowerCase() === "68" && c.slice(6, 8).toLowerCase() === "68";
}

describe("driver fixture sweep (Wave A)", () => {
  const registered = new Set(listDriverNames());

  // For each registered driver, verify its long-form driver_*.cc / XMQ
  // fixtures match upstream. We keep the list of checked drivers tight so
  // Wave A tracks concretely; adding a new driver to the registry +
  // registered name set expands coverage automatically.
  const WAVE_A_DRIVERS = [
    "multical21",
    "iperl",
    "op041a",
    "elster",
    "maddalena",
    "supercom587",
    "qheat",
  ];

  for (const driverName of WAVE_A_DRIVERS) {
    const driverFixtures = FIXTURES.filter(
      (f) =>
        f.driver === driverName &&
        !isShortFormCompact(f.hex) &&
        !isFormatB(f.hex) &&
        f.key === "NOKEY" &&
        // Qundis "Q walk-by" proprietary container variants need processContent
        // (deferred to a later wave).
        !(driverName === "qheat" && (f.id === "31547698" || f.id === "68204641")) &&
        // Fixtures from simulation files that add extras (address, city,
        // conversions, output subsets, multi-telegram interactions) are
        // outside the per-driver output contract.
        !f.source.startsWith("simulation_additional_json") &&
        !f.source.startsWith("simulation_conversionsadded") &&
        !f.source.startsWith("simulation_alarm") &&
        !f.source.startsWith("simulation_t1_and_c1") &&
        !f.source.startsWith("simulation_metershell") &&
        !f.source.startsWith("simulation_extras") &&
        !f.source.startsWith("simulation_duplicates") &&
        !f.source.startsWith("simulation_shell"),
    );

    describe(`${driverName}`, () => {
      it(`has ≥1 eligible fixture and driver is registered`, () => {
        expect(registered).toContain(driverName);
        expect(driverFixtures.length).toBeGreaterThan(0);
      });

      describe.each(driverFixtures)("fixture $source → $name id=$id", (fx) => {
        it("produces JSON matching upstream's expected output", () => {
          const result = decodeWmbusHexSync(fx.hex, fx.driver, "", {
            name: fx.name,
            timestampOverride: TIMESTAMP_TEST,
          });
          expect(result).toEqual(fx.expected);
        });
      });
    });
  }
});
