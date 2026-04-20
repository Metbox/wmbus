/*
 * Copyright (C) 2017-2026 Fredrik Öhrström (gpl-3.0-or-later)
 * Copyright (C) 2026 Metbox / @metbox/wmbus contributors (gpl-3.0-or-later)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import { describe, expect, it } from "vitest";
import { ciHeaderLength, ciName, ciType, isAfl, isEll, isTpl } from "../../src/protocol/ci.js";

describe("ciType", () => {
  it.each([
    [0x51, "TPL"],
    [0x72, "TPL"],
    [0x78, "TPL"],
    [0x79, "TPL"],
    [0x7a, "TPL"],
    [0x81, "NWL"],
    [0x86, "ELL"],
    [0x8c, "ELL"],
    [0x8d, "ELL"],
    [0x8e, "ELL"],
    [0x8f, "ELL"],
    [0x90, "AFL"],
  ])("classifies 0x%s as %s", (ci, expected) => {
    expect(ciType(ci as number)).toBe(expected);
  });

  it("classifies 0xA0..0xB7 as manufacturer-specific", () => {
    expect(ciType(0xa0)).toBe("MFCT");
    expect(ciType(0xb7)).toBe("MFCT");
    expect(ciType(0xb8)).not.toBe("MFCT");
  });

  it("maps everything else to UNKNOWN", () => {
    expect(ciType(0x00)).toBe("UNKNOWN");
    expect(ciType(0xff)).toBe("UNKNOWN");
  });
});

describe("ciHeaderLength", () => {
  it("returns the per-CI header length", () => {
    expect(ciHeaderLength(0x7a)).toBe(4);
    expect(ciHeaderLength(0x72)).toBe(12);
    expect(ciHeaderLength(0x8d)).toBe(8);
    expect(ciHeaderLength(0x8f)).toBe(16);
  });

  it("returns -1 for variable / unknown CIs", () => {
    expect(ciHeaderLength(0x86)).toBe(-1);
    expect(ciHeaderLength(0x00)).toBe(-1);
  });
});

describe("convenience predicates", () => {
  it("isTpl/isEll/isAfl match ciType", () => {
    expect(isTpl(0x7a)).toBe(true);
    expect(isTpl(0x8d)).toBe(false);
    expect(isEll(0x8d)).toBe(true);
    expect(isEll(0x7a)).toBe(false);
    expect(isAfl(0x90)).toBe(true);
    expect(isAfl(0x91)).toBe(false);
  });
});

describe("ciName", () => {
  it("returns human-readable names", () => {
    expect(ciName(0x7a)).toMatch(/short header/);
    expect(ciName(0x8d)).toMatch(/ELL/);
    expect(ciName(0xa5)).toBe("Mfct specific");
  });
});
