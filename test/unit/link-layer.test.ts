import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseTelegram, summarise } from "../../src/protocol/link-layer.js";

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

describe("parseTelegram — synthetic hand-decoded cases", () => {
  it("decodes a Multical21 C1 header", () => {
    // Multical21 C1 from simulation_c1.txt (CRC-stripped, DLL-only visible).
    const tg = parseTelegram(
      "2A442D2C998734761B168D2091D37CAC21576C78_02FF207100041308190000441308190000615B7F616713",
    );
    expect(tg.dll.dllLen).toBe(0x2a);
    expect(tg.dll.dllC).toBe(0x44);
    expect(tg.dll.dllMfct).toBe(0x2c2d); // KAM
    expect(tg.dll.dllId).toBe("76348799"); // bytes reversed from wire order
    expect(tg.dll.dllVersion).toBe(0x1b);
    expect(tg.dll.dllType).toBe(0x16); // cold water
    expect(tg.ci).toBe(0x8d); // ELL-II
    expect(tg.media).toBe("cold water");
  });

  it("decodes an iPerl T1 header", () => {
    // From driver_iperl.xmq — MoreWater iperl 12345699 NOKEY.
    const tg = parseTelegram("1E44AE4C9956341268077A36001000_2F2F0413181E0000023B00002F2F2F2F");
    expect(tg.dll.dllId).toBe("12345699");
    expect(tg.dll.dllMfct).toBe(0x4cae); // SEN (Sensus): S=83 E=69 N=78 → (83-64)*1024+(69-64)*32+(78-64)=19*1024+5*32+14 = 19456+160+14=19630=0x4CAE
    expect(tg.dll.dllVersion).toBe(0x68);
    expect(tg.dll.dllType).toBe(0x07); // water
    expect(tg.ci).toBe(0x7a); // TPL short header
    expect(tg.media).toBe("water");
  });

  it("rejects frames shorter than the 11-byte DLL", () => {
    expect(() => parseTelegram("2A442D2C998734761B16")).toThrow();
  });

  it("rejects frames truncated relative to their L-field", () => {
    // L says 0x2A = 42 more bytes, give it only a handful.
    expect(() => parseTelegram("2A442D2C998734761B168D")).toThrow();
  });

  it("summary is a debug-friendly one-liner", () => {
    const tg = parseTelegram(
      "2A442D2C998734761B168D2091D37CAC21576C78_02FF207100041308190000441308190000615B7F616713",
    );
    expect(summarise(tg)).toMatch(/id=76348799.*ci=0x8d/);
  });
});

describe("parseTelegram — upstream fixture parity (DLL level)", () => {
  // Phase 1 asserts only what the DLL alone can produce. The final `id` /
  // `media` in upstream JSON can come from TPL/ELL overrides (CI 0x72/0x8C),
  // wired M-Bus framing (frames starting 0x68), or manufacturer-specific
  // address transforms (Diehl LFSR, Techem variants). All of those land in
  // Phase 3 / Phase 6 and have their own exclusion reasoning below.

  const SKIP_SOURCES = new Set<string>([
    "simulation_broken.txt", // malformed on purpose
    "simulation_bad_keys.txt", // exercises key-retry logic, not DLL parsing
  ]);

  // TPL long-header CIs carry a fresh (mfct, address, version, type) inside
  // the payload and upstream reports the inner address.
  const TPL_LONG_HEADER_CIS = new Set([0x72, 0x73, 0x7c, 0x7d]);
  // ELL variants that embed a second address.
  const ELL_WITH_ADDRESS_CIS = new Set([0x8c, 0x8d, 0x8e, 0x8f]);

  // Drivers running manufacturer-specific frame reinterpretation (Diehl LFSR,
  // Techem mfct-specific CI) — these lands in Phase 3.
  const ADDRESS_REINTERPRETING_DRIVERS = new Set([
    "izar",
    "hydrus",
    "sharky",
    "sharky774",
    "sharky775",
    "dme_07",
    "dme173",
  ]);

  // Wired M-Bus Format B starts with 0x68; wireless parser isn't responsible
  // for those. They need their own parser pathway later in the roadmap.
  function isMBusWiredFormatB(hex: string): boolean {
    const cleaned = hex.replace(/[^0-9A-Fa-f]/g, "");
    if (cleaned.length < 8) return false;
    return cleaned.slice(0, 2).toLowerCase() === "68" && cleaned.slice(6, 8).toLowerCase() === "68";
  }

  const parseable = FIXTURES.filter(
    (f) => !SKIP_SOURCES.has(f.source) && !isMBusWiredFormatB(f.hex),
  );

  it(`has a non-trivial fixture set (${parseable.length} fixtures)`, () => {
    expect(parseable.length).toBeGreaterThan(300);
  });

  const parseFailures: Array<{ fixture: Fixture; error: string }> = [];
  const idCheckable: Array<{ fixture: Fixture; tg: ReturnType<typeof parseTelegram> }> = [];
  const idMismatches: Array<{ fixture: Fixture; got: string }> = [];

  for (const fx of parseable) {
    let tg: ReturnType<typeof parseTelegram>;
    try {
      tg = parseTelegram(fx.hex);
    } catch (err) {
      parseFailures.push({ fixture: fx, error: (err as Error).message });
      continue;
    }

    // Wired M-Bus Format B starts with 0x68 and has a different header.
    // Wireless telegrams start with an L-field < 0x60 in practice.
    if (tg.dll.dllLen === 0x68) continue;
    if (TPL_LONG_HEADER_CIS.has(tg.ci)) continue;
    if (ELL_WITH_ADDRESS_CIS.has(tg.ci)) continue;
    if (ADDRESS_REINTERPRETING_DRIVERS.has(fx.driver)) continue;

    idCheckable.push({ fixture: fx, tg });
    if (tg.dll.dllId !== fx.id) {
      idMismatches.push({ fixture: fx, got: tg.dll.dllId });
    }
  }

  it("parses the vast majority of fixtures", () => {
    // Upstream test data includes a handful of legitimately-malformed
    // fixtures (truncated telegrams used as regression tests for radio-mode-
    // specific partial-frame handling; one XMQ block with an odd hex digit
    // count). Allow up to 1% residual — anything above that is a real bug.
    const PARSE_FAILURE_BUDGET = Math.ceil(parseable.length * 0.01);
    if (parseFailures.length > PARSE_FAILURE_BUDGET) {
      const sample = parseFailures
        .slice(0, 10)
        .map((f) => `  ${f.fixture.source} ${f.fixture.driver}/${f.fixture.name}: ${f.error}`)
        .join("\n");
      throw new Error(
        `${parseFailures.length} / ${parseable.length} fixtures failed to parse (budget ${PARSE_FAILURE_BUDGET}):\n${sample}`,
      );
    }
  });

  it("DLL id matches the expected id on simple short-header fixtures", () => {
    expect(idCheckable.length).toBeGreaterThan(200);
    // A small residual is tolerated: upstream's own test data occasionally
    // mixes meters under a single Test header, or has one-off frame formats
    // the wire-layer can't classify. We cap at 5 residual mismatches and
    // dump them for diagnosis — anything above that points at a real bug.
    const RESIDUAL_BUDGET = 5;
    if (idMismatches.length > RESIDUAL_BUDGET) {
      const sample = idMismatches
        .slice(0, 10)
        .map(
          (m) =>
            `  ${m.fixture.source} ${m.fixture.driver}/${m.fixture.name} (ci=0x${m.fixture.hex.replace(/[^0-9A-Fa-f]/g, "").slice(20, 22)}) — got ${m.got}, want ${m.fixture.id}`,
        )
        .join("\n");
      throw new Error(
        `${idMismatches.length} / ${idCheckable.length} id mismatches (budget ${RESIDUAL_BUDGET}):\n${sample}`,
      );
    }
  });

  it("resolves DLL-generic media strings correctly on a clearly-generic sample", () => {
    // Pull fixtures whose expected media is one of the 0x00..0x3F generic
    // types AND whose DLL-type byte — byte 9 after hex cleanup — matches the
    // canonical mapping. This is the subset where media is guaranteed to be
    // DLL-derived, not TPL-overridden.
    //
    // Relies on the fact that for a clean DLL-derived media, the mapping is
    // the same as in src/protocol/media.ts; any mismatch here = bug.

    const GENERIC_MAP: Record<number, string> = {
      2: "electricity",
      3: "gas",
      4: "heat",
      6: "warm water",
      7: "water",
      8: "heat cost allocation",
      22: "cold water",
      26: "smoke detector",
      27: "room sensor",
    };

    let checked = 0;
    let mismatches = 0;
    const samples: string[] = [];
    for (const fx of parseable) {
      let tg: ReturnType<typeof parseTelegram>;
      try {
        tg = parseTelegram(fx.hex);
      } catch {
        continue;
      }
      const canonical = GENERIC_MAP[tg.dll.dllType];
      if (!canonical) continue;
      const expected = fx.expected.media;
      if (typeof expected !== "string") continue;
      // Skip fixtures where the DLL-type disagrees with the published media —
      // that's exactly the TPL/ELL-override case Phase 3 handles.
      if (expected !== canonical) continue;
      checked++;
      if (tg.media !== canonical) {
        mismatches++;
        if (samples.length < 5) {
          samples.push(
            `  ${fx.source} ${fx.driver}/${fx.name} — got "${tg.media}", want "${canonical}"`,
          );
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
    if (mismatches > 0) {
      throw new Error(
        `${mismatches} / ${checked} DLL-generic media mismatches:\n${samples.join("\n")}`,
      );
    }
  });
});
