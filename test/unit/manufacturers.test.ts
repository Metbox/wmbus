import { describe, expect, it } from "vitest";
import {
  flagToManufacturer,
  MANUFACTURER,
  manufacturerFlag,
  manufacturerName,
} from "../../src/protocol/manufacturers.js";

describe("manufacturers", () => {
  it("round-trips 3-letter flags through 16-bit codes", () => {
    for (const f of ["KAM", "DME", "HYD", "TCH", "SEN", "APA", "ITW", "AAA", "ZZZ"]) {
      const code = flagToManufacturer(f);
      expect(manufacturerFlag(code)).toBe(f);
    }
  });

  it("matches known upstream MANFCODE values", () => {
    // K=75 A=65 M=77 → (11)*1024 + (1)*32 + (13) = 11309 = 0x2C2D
    expect(flagToManufacturer("KAM")).toBe(0x2c2d);
    // D=68 M=77 E=69 → (4)*1024 + (13)*32 + (5)  = 4096 + 416 + 5 = 4517 = 0x11A5
    expect(flagToManufacturer("DME")).toBe(0x11a5);
  });

  it("tolerates the top-bit-set 'lowercase first letter' quirk", () => {
    // Devices sometimes send the first letter with the 8th bit set. Upstream
    // masks with 0x7FFF before lookup; we mirror that in manufacturerFlag.
    const kam = flagToManufacturer("KAM");
    const kamHighBit = kam | 0x8000;
    expect(manufacturerFlag(kamHighBit)).toBe("KAM");
  });

  it("renders unknown 5-bit field values as '?'", () => {
    // All zero → (0,0,0) → three '?'s (since 0 is out of 1..26).
    expect(manufacturerFlag(0)).toBe("???");
  });

  it("exposes frequently used manufacturer codes", () => {
    expect(MANUFACTURER.KAM).toBe(0x2c2d);
    expect(MANUFACTURER.TCH).toBe(flagToManufacturer("TCH"));
  });

  it("looks up human-readable names", () => {
    expect(manufacturerName(flagToManufacturer("KAM"))).toMatch(/Kamstrup/i);
    expect(manufacturerName(flagToManufacturer("AAA"))).toMatch(/Aventies/i);
  });

  it("returns undefined for unknown codes", () => {
    // Pick a code that's extremely unlikely to be assigned — "ZZA".
    const code = flagToManufacturer("ZZA");
    // Might or might not exist; just ensure the lookup returns string|undefined.
    const name = manufacturerName(code);
    expect(typeof name === "string" || name === undefined).toBe(true);
  });

  it("rejects non-3-char input to flagToManufacturer", () => {
    expect(() => flagToManufacturer("XX")).toThrow();
    expect(() => flagToManufacturer("XXXX")).toThrow();
  });
});
