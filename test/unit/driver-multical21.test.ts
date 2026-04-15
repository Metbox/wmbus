import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodeWmbusHexSync } from "../../src/api.js";

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
const MULTICAL21_FIXTURES = FIXTURES.filter((f) => f.driver === "multical21");

// Normalise `timestamp` in test mode so upstream + this port agree.
const TIMESTAMP_TEST = "1111-11-11T11:11:11Z";

describe("multical21 driver — first real driver parity", () => {
  it("has the 4 fixtures we expect from upstream (+ XMQ variants)", () => {
    expect(MULTICAL21_FIXTURES.length).toBeGreaterThanOrEqual(4);
  });

  // Phase 5 scope: LONG-FORM fixtures from driver_multical21.cc only.
  //
  // Deferred to Phase 6:
  //   - Compact-format short telegrams (34-36 byte hex) — these use Kamstrup's
  //     "format signature" lookup where DIF/VIF bytes are omitted and borrowed
  //     from a previously-cached long telegram. Needs per-meter format
  //     signature cache.
  //   - simulation_additional_json.txt / _conversionsadded.txt — include extras
  //     (address/city/floor, unit conversions) added by upstream's JSON
  //     post-processor, not the driver itself.
  //   - simulation_alarm.txt / _t1_and_c1.txt — variants where the telegram
  //     omits 02FF20 status but includes max_flow; the fixture reflects that
  //     subset and doesn't overlap cleanly with the driver's full field list.
  const FULL_FORM_FIXTURES = MULTICAL21_FIXTURES.filter(
    (f) =>
      f.source === "driver_multical21.cc" && f.hex.replace(/[^0-9A-Fa-f]/g, "").length / 2 >= 43,
  );

  it("has long-form driver-file fixtures", () => {
    expect(FULL_FORM_FIXTURES.length).toBeGreaterThanOrEqual(2);
  });

  describe.each(FULL_FORM_FIXTURES)("fixture $source → $name id=$id", (fx) => {
    it("produces JSON matching upstream's expected output", () => {
      const result = decodeWmbusHexSync(fx.hex, fx.driver, "", {
        name: fx.name,
        timestampOverride: TIMESTAMP_TEST,
      });
      expect(result).toEqual(fx.expected);
    });
  });

  it("decodes the MyTapWater long telegram directly", () => {
    // Spot-check one fixture explicitly so diffs are easier to read when
    // something regresses.
    const hex =
      "2A442D2C998734761B168D2091D37CAC21576C78_02FF207100041308190000441308190000615B7F616713";
    const result = decodeWmbusHexSync(hex, "multical21", "", {
      name: "MyTapWater",
      timestampOverride: TIMESTAMP_TEST,
    });
    expect(result._).toBe("telegram");
    expect(result.media).toBe("cold water");
    expect(result.meter).toBe("multical21");
    expect(result.name).toBe("MyTapWater");
    expect(result.id).toBe("76348799");
    expect(result.status).toBe("DRY");
    expect(result.total_m3).toBe(6.408);
    expect(result.target_m3).toBe(6.408);
    expect(result.flow_temperature_c).toBe(127);
    expect(result.external_temperature_c).toBe(19);
    expect(result.time_dry).toBe("22-31 days");
    expect(result.timestamp).toBe(TIMESTAMP_TEST);
  });

  it("decodes the Vadden fixture (includes max_flow_m3h)", () => {
    const hex =
      "2D442D2C776655441B168D2083B48D3A20_46887802FF20000004132F4E000092013B3D01A1015B028101E7FF0F03";
    const result = decodeWmbusHexSync(hex, "multical21", "", {
      name: "Vadden",
      timestampOverride: TIMESTAMP_TEST,
    });
    expect(result.id).toBe("44556677");
    expect(result.status).toBe("OK");
    expect(result.total_m3).toBe(20.015);
    expect(result.flow_temperature_c).toBe(2);
    expect(result.external_temperature_c).toBe(3);
    expect(result.max_flow_m3h).toBe(0.317);
    expect(result.current_status).toBe("");
    expect(result.time_dry).toBe("");
  });
});
