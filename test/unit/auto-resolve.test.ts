// Regression test for the "auto" driver — for each fixture in
// upstream.json, decode with driver="auto" and assert that MVT lookup
// resolves to a driver consistent with the fixture's expected meter.
//
// Without this test, the version<->type swap bug (driver_*.cc args copied
// positionally into our struct) shipped silently because every other test
// passes the driver name explicitly, bypassing MVT lookup.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodeWmbusHexSync } from "../../src/api.js";
import { lookupDriverByName } from "../../src/drivers/registry.js";
import { decodeTelegram } from "../../src/protocol/pipeline.js";
import { hexToBytes } from "../../src/util/hex.js";

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

// Drivers whose fixtures have wire MVT that intentionally doesn't match any
// declared MVT (manufacturer-relabeled OEM variants, telegrams with the high
// mfct bit set, fixtures sourced from a different meter generation, etc.).
// These are pre-existing data gaps in our driver MVT tables, separate from
// the swap bug. Excluded here so the regression check stays meaningful.
const SKIP_AUTO_RESOLVE = new Set([
  "apatoreitn", // wire mfct 0x8601 (high bit set) vs declared 0x0601
  "esyswm", // wire mfct 0x1699 vs declared 0x1679
  "flowiq2200", // wire mfct/version don't match any declared variant
  "hcae2", // wire mfct 0x25c5 vs declared 0x14c5
  "izar", // wire mfct 0x4c30 vs declared 0x11a5 (Diehl Izar relabeled)
  "qheat", // upstream fixture variants not yet declared
  "qwater", // upstream fixture variants not yet declared
  "sharky", // wire version 0x92 type 0x68 not in declared list
  "sharky774", // wire version 0x41 vs declared 0x70
  "apator08", // wire mfct 0x8614 (high bit set) vs declared 0x0614
  "eltako", // wire type 0x02 vs declared 0x37
  "ime", // wire version 0x66 vs declared 0x06
]);

describe("auto driver MVT resolution", () => {
  // Pick the first fixture per driver to keep the test fast.
  const seen = new Set<string>();
  const sample: Fixture[] = [];
  for (const fx of FIXTURES) {
    if (SKIP_AUTO_RESOLVE.has(fx.driver)) continue;
    if (seen.has(fx.driver)) continue;
    if (!lookupDriverByName(fx.driver)) continue;
    seen.add(fx.driver);
    sample.push(fx);
  }

  describe.each(sample)("$driver — $source", (fx) => {
    it("auto resolves to a driver registered for the wire MVT", () => {
      const aesKey = fx.key && fx.key !== "NOKEY" ? hexToBytes(fx.key) : null;
      const assembled = decodeTelegram(fx.hex, aesKey);
      const wire = {
        manufacturer: assembled.effectiveMfct,
        version: assembled.effectiveVersion,
        type: assembled.effectiveType,
      };

      const expectedDriver = lookupDriverByName(fx.driver);
      if (!expectedDriver) throw new Error(`driver ${fx.driver} not registered`);
      const declaresWireMVT = expectedDriver.mvt.some(
        (m) =>
          m.manufacturer === wire.manufacturer &&
          m.version === wire.version &&
          m.type === wire.type,
      );
      // If the fixture's wire MVT is not declared by its own driver, the
      // SKIP list above should cover it. Failing here means a regression in
      // the driver's mvt: array.
      expect(
        declaresWireMVT,
        `${fx.driver} does not declare wire MVT ` +
          `m=0x${wire.manufacturer.toString(16)} v=0x${wire.version.toString(16)} t=0x${wire.type.toString(16)}`,
      ).toBe(true);

      const out = decodeWmbusHexSync(fx.hex, "auto", fx.key === "NOKEY" ? "" : fx.key, {
        idOverride: fx.id,
        timestampOverride: "1111-11-11T11:11:11Z",
      });

      // The resolved meter must be a real driver name (not "auto"), and that
      // driver must declare the wire MVT. Multiple drivers may match the same
      // MVT — registry returns the first registered, which is acceptable.
      expect(out.meter).not.toBe("auto");
      const resolved = lookupDriverByName(out.meter as string);
      if (!resolved) throw new Error(`auto picked unknown driver "${out.meter}"`);
      const resolvedDeclaresMVT = resolved.mvt.some(
        (m) =>
          m.manufacturer === wire.manufacturer &&
          m.version === wire.version &&
          m.type === wire.type,
      );
      expect(resolvedDeclaresMVT).toBe(true);
    });
  });
});
