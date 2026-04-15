import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
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

describe("decodeTelegram — hand-verified cases", () => {
  it("decodes a Multical21 C1 NOKEY telegram", () => {
    // Multical21 C1 fixture. SN bits claim AES_CTR but Kamstrup meters
    // deliver plaintext with a matching PL-CRC — so the pipeline treats
    // the body as valid plaintext and reports "not-required".
    const d = decodeTelegram(
      "2A442D2C998734761B168D2091D37CAC21576C78_02FF207100041308190000441308190000615B7F616713",
    );
    expect(d.telegram.ci).toBe(0x8d); // ELL-II
    expect(d.effectiveId).toBe("76348799");
    expect(d.decryption.status).toBe("not-required");
    expect(d.plaintext).not.toBeNull();
  });

  it("decodes an iPerl T1 NOKEY (TPL short-header, plaintext payload)", () => {
    const d = decodeTelegram("1E44AE4C9956341268077A36001000_2F2F0413181E0000023B00002F2F2F2F");
    expect(d.telegram.ci).toBe(0x7a);
    expect(d.tpl?.headerKind).toBe("short");
    // The telegram's payload starts with `2F 2F` — upstream's "already
    // decrypted" marker. The pipeline should pass the rest through clean.
    expect(d.plaintext).toBeInstanceOf(Uint8Array);
    expect(d.decryption.status).toBe("not-required");
    expect(d.effectiveId).toBe("12345699");
    expect(d.effectiveMedia).toBe("water");
  });

  it("decodes an Aventies encrypted telegram with the correct key", () => {
    // Votten aventieswm 61070071 A004EB23329A477F1DD2D7820B56EB3D
    const d = decodeTelegram(
      "76442104710007612507727100076121042507B5006005E2E95A3C2A1279A5415E6732679B43369FD5FDDDD783EEEBB48236D34E7C94AF0A18A5FDA5F7D64111EB42D4D891622139F2952F9D12A20088DFA4CF8123871123EE1F6C1DCEA414879DDB4E05E508F1826D7EFBA6964DF804C9261EA23BBF03",
      hexToBytes("A004EB23329A477F1DD2D7820B56EB3D"),
    );
    // CI 0x72 = TPL long header. With correct key we expect successful decrypt.
    expect(d.tpl?.headerKind).toBe("long");
    expect(d.effectiveId).toBe("61070071"); // Long-header id overrides DLL.
    expect(d.decryption.status).toBe("ok");
    expect(d.plaintext).not.toBeNull();
    // Plaintext must begin with a DIF byte in the range of a real field
    // (not 2f2f, which has already been stripped by the CBC layer).
    expect(d.plaintext?.[0]).not.toBe(0x2f);
  });

  it("reports missing-key when an encrypted telegram is decoded with no key", () => {
    const d = decodeTelegram(
      "76442104710007612507727100076121042507B5006005E2E95A3C2A1279A5415E6732679B43369FD5FDDDD783EEEBB48236D34E7C94AF0A18A5FDA5F7D64111EB42D4D891622139F2952F9D12A20088DFA4CF8123871123EE1F6C1DCEA414879DDB4E05E508F1826D7EFBA6964DF804C9261EA23BBF03",
    );
    expect(d.decryption.failed).toBe(true);
    expect(d.decryption.status).toBe("missing-key");
    expect(d.plaintext).toBeNull();
  });

  it("reports wrong-key when the wrong key is supplied", () => {
    const d = decodeTelegram(
      "76442104710007612507727100076121042507B5006005E2E95A3C2A1279A5415E6732679B43369FD5FDDDD783EEEBB48236D34E7C94AF0A18A5FDA5F7D64111EB42D4D891622139F2952F9D12A20088DFA4CF8123871123EE1F6C1DCEA414879DDB4E05E508F1826D7EFBA6964DF804C9261EA23BBF03",
      hexToBytes("00000000000000000000000000000000"), // zero key = definitely wrong
    );
    expect(d.decryption.failed).toBe(true);
    expect(d.decryption.status).toBe("wrong-key");
    expect(d.plaintext).toBeNull();
  });
});

describe("decodeTelegram — fixture parity (Phase 3 exit gate)", () => {
  // Exit gate: every NOKEY fixture should successfully reach a plaintext
  // byte stream (either because the telegram has no encryption at all, or
  // because the payload happens to begin with the `2F 2F` already-decrypted
  // marker that upstream fixtures frequently use for replay tests).
  //
  // Fixtures we can't realistically reach yet (Phase 4+ work):
  //   - Wired M-Bus Format B (starts `68..68`) — out of scope.
  //   - Fixtures that rely on Mode 7 KDF + AFL MAC.
  //   - Diehl / izar / sharky LFSR-scrambled telegrams.
  //   - Broken / truncated test data in upstream.

  const SKIP_SOURCES = new Set<string>(["simulation_broken.txt", "simulation_bad_keys.txt"]);

  function isMBusFormatB(hex: string): boolean {
    const cleaned = hex.replace(/[^0-9A-Fa-f]/g, "");
    return cleaned.slice(0, 2).toLowerCase() === "68" && cleaned.slice(6, 8).toLowerCase() === "68";
  }

  const SKIP_DRIVERS = new Set([
    "izar", // Diehl LFSR
    "hydrus", // mix of Diehl variants
    "sharky", // Diehl
    "sharky774",
    "sharky775",
    "dme_07", // Diehl
    "dme173",
  ]);

  const eligible = FIXTURES.filter(
    (f) =>
      !SKIP_SOURCES.has(f.source) &&
      !isMBusFormatB(f.hex) &&
      !SKIP_DRIVERS.has(f.driver) &&
      f.key === "NOKEY",
  );

  it(`has a non-trivial eligible NOKEY set (${eligible.length})`, () => {
    expect(eligible.length).toBeGreaterThan(200);
  });

  const parseFailures: Array<{ fixture: Fixture; error: string }> = [];
  const plaintextMisses: Array<{ fixture: Fixture; reason: string }> = [];
  let plaintextReached = 0;

  for (const fx of eligible) {
    try {
      const d = decodeTelegram(fx.hex);
      if (d.plaintext != null) {
        plaintextReached++;
      } else {
        plaintextMisses.push({ fixture: fx, reason: d.decryption.status });
      }
    } catch (err) {
      parseFailures.push({ fixture: fx, error: (err as Error).message });
    }
  }

  it("does not throw on any eligible NOKEY fixture (1% budget for malformed data)", () => {
    const budget = Math.ceil(eligible.length * 0.01);
    if (parseFailures.length > budget) {
      const sample = parseFailures
        .slice(0, 10)
        .map((f) => `  ${f.fixture.source} ${f.fixture.driver}/${f.fixture.name}: ${f.error}`)
        .join("\n");
      throw new Error(
        `${parseFailures.length} / ${eligible.length} threw (budget ${budget}):\n${sample}`,
      );
    }
  });

  it("reaches plaintext on the vast majority of eligible NOKEY fixtures", () => {
    // A small residual is tolerated: some fixtures without keys declare
    // encryption in the CFG word — upstream then emits an "encrypted" placeholder
    // and the driver layer falls back to partial decode. We treat those as
    // Phase-4 work since they need the DV parser to express "payload present
    // but header says encrypted".
    const reached = plaintextReached / eligible.length;
    expect(reached).toBeGreaterThan(0.85);
  });
});
