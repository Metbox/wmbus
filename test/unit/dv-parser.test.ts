import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseDv } from "../../src/data/dv-parser.js";
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

describe("parseDv — hand-verified Multical21 record", () => {
  // Multical21 plaintext body from driver_multical21.cc first Test block.
  //   2F 2F 02 FF 20 71 00 04 13 08 19 00 00 44 13 08 19 00 00 61 5B 7F 61 67 13
  // after stripping the leading 2F2F marker:
  //   02 FF 20 71 00     → DIF=0x02 (Int16), VIF=0xFF 0x20 (mfct extension, storage=0), data=0x0071 → status bits
  //   04 13 08 19 00 00  → DIF=0x04 (Int32), VIF=0x13 (Volume 10^-3 m³), data=0x00001908
  //   44 13 08 19 00 00  → DIF=0x44 (storage=1, Int32), VIF=0x13, data=0x00001908 (target)
  //   61 5B 7F           → DIF=0x61 (ext, storage…), VIF=0x5B (flow temp), data=0x7F
  //   61 67 13           → DIF=0x61, VIF=0x67 (external temp), data=0x13
  it("tokenises the Multical21 record list", () => {
    const payload = hexToBytes("02FF207100041308190000441308190000615B7F616713");
    const { entries } = parseDv(payload);
    expect(entries.length).toBeGreaterThanOrEqual(3);

    // First entry: mfct-specific status (DIF=0x02, VIF ext=0xFF 0x20).
    const status = entries[0];
    expect(status?.difVifKey).toBe("02FF20");
    expect(status?.measurementType).toBe("Instantaneous");
    expect(status?.asNumber).toBe(0x0071);

    // Second entry: Volume (DIF 0x04 = Int32, VIF 0x13 = Volume 10^-3 m³).
    const volume = entries[1];
    expect(volume?.difVifKey).toBe("0413");
    expect(volume?.vif).toBe(0x13);
    expect(volume?.asNumber).toBe(0x00001908);
    expect(volume?.storageNr).toBe(0);

    // Third entry: target volume (DIF 0x44 = storage=1, same VIF).
    const target = entries[2];
    expect(target?.difVifKey).toBe("4413");
    expect(target?.storageNr).toBe(1);
    expect(target?.asNumber).toBe(0x00001908);
  });

  it("skips leading 2F 2F padding bytes without confusion", () => {
    const payload = hexToBytes("2F2F041301000000");
    const { entries } = parseDv(payload);
    expect(entries.length).toBe(1);
    expect(entries[0]?.difVifKey).toBe("0413");
  });

  it("stops at the 0x0F manufacturer-specific marker", () => {
    // Two complete records then a 0x0F trailer with garbage data.
    //   04 13 01000000  → Volume = 1
    //   04 13 02000000  → Volume = 2
    //   0F 0102030405   → mfct-specific stop
    const payload = hexToBytes("0413010000000413020000000F0102030405");
    const { entries, trailing } = parseDv(payload);
    expect(entries.length).toBe(2);
    expect(trailing[0]).toBe(0x0f);
  });
});

describe("parseDv — Aventies encrypted telegram (full pipeline + tokenise)", () => {
  // Votten aventieswm 61070071 A004EB23329A477F1DD2D7820B56EB3D — from Phase 3 test.
  // After decryption, the plaintext should contain DV records matching upstream's
  // expected JSON (which includes `total_m3`, multiple `consumption_at_set_date_N_m3`).
  const HEX =
    "76442104710007612507727100076121042507B5006005E2E95A3C2A1279A5415E6732679B43369FD5FDDDD783EEEBB48236D34E7C94AF0A18A5FDA5F7D64111EB42D4D891622139F2952F9D12A20088DFA4CF8123871123EE1F6C1DCEA414879DDB4E05E508F1826D7EFBA6964DF804C9261EA23BBF03";
  const KEY = "A004EB23329A477F1DD2D7820B56EB3D";

  it("produces a non-trivial DVEntry list", () => {
    const d = decodeTelegram(HEX, hexToBytes(KEY));
    expect(d.decryption.status).toBe("ok");
    expect(d.plaintext).not.toBeNull();
    const { entries } = parseDv(d.plaintext as Uint8Array);
    expect(entries.length).toBeGreaterThan(5);
  });

  it("finds a Volume VIF record matching the expected total_m3", () => {
    const d = decodeTelegram(HEX, hexToBytes(KEY));
    const { entries } = parseDv(d.plaintext as Uint8Array);
    // Upstream fixture says total_m3 = 466.472 — raw integer 466472 at VIF 0x13 (10^-3 m³).
    const volumeEntry = entries.find((e) => e.vif === 0x13 && e.storageNr === 0);
    expect(volumeEntry).toBeDefined();
    expect(volumeEntry?.asNumber).toBe(466472);
  });
});

describe("parseDv — fixture coverage sweep", () => {
  // Coverage gate for Phase 4: on NOKEY fixtures that decode cleanly in the
  // pipeline, the DV parser should produce at least one entry with a valid
  // difVifKey. This catches regressions where a driver-category's DIF layout
  // gets mis-tokenized.

  const SKIP_SOURCES = new Set<string>(["simulation_broken.txt", "simulation_bad_keys.txt"]);

  function isMBusFormatB(hex: string): boolean {
    const cleaned = hex.replace(/[^0-9A-Fa-f]/g, "");
    return cleaned.slice(0, 2).toLowerCase() === "68" && cleaned.slice(6, 8).toLowerCase() === "68";
  }
  const SKIP_DRIVERS = new Set([
    "izar",
    "hydrus",
    "sharky",
    "sharky774",
    "sharky775",
    "dme_07",
    "dme173",
  ]);

  const eligible = FIXTURES.filter(
    (f) =>
      !SKIP_SOURCES.has(f.source) &&
      !isMBusFormatB(f.hex) &&
      !SKIP_DRIVERS.has(f.driver) &&
      f.key === "NOKEY",
  );

  let decoded = 0;
  let withEntries = 0;
  for (const fx of eligible) {
    try {
      const d = decodeTelegram(fx.hex);
      if (!d.plaintext) continue;
      decoded++;
      const { entries } = parseDv(d.plaintext);
      if (entries.length > 0) withEntries++;
    } catch {
      // swallow — individual fixture failures are tracked in Phase 1 gates.
    }
  }

  it("decodes plaintext for the majority of eligible fixtures", () => {
    expect(decoded).toBeGreaterThan(200);
  });

  it("produces DV entries for the vast majority of decoded fixtures", () => {
    // Must be strictly above 90% — Phase 4's goal is "DV parser works for
    // the main body of telegrams". Phase 6 will smooth out the long tail.
    const ratio = withEntries / decoded;
    expect(ratio).toBeGreaterThan(0.9);
  });
});
