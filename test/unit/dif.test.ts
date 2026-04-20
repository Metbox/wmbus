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
import {
  difDataKind,
  difLengthBytes,
  difMeasurementType,
  isBcdDataField,
  isReal32DataField,
  parseDifChain,
} from "../../src/data/dif.js";

describe("difLengthBytes", () => {
  it.each([
    [0x01, 1],
    [0x02, 2],
    [0x03, 3],
    [0x04, 4],
    [0x05, 4], // Real32
    [0x06, 6],
    [0x07, 8],
    [0x09, 1], // BCD 2-digit
    [0x0a, 2],
    [0x0b, 3],
    [0x0c, 4],
    [0x0e, 6],
    [0x0d, -1], // variable length
    [0x00, 0],
    [0x08, 0],
  ])("maps DIF 0x%s correctly", (dif, expected) => {
    expect(difLengthBytes(dif as number)).toBe(expected);
  });

  it("recognises the 0x2F padding marker", () => {
    expect(difLengthBytes(0x2f)).toBe(1);
  });

  it("returns -2 for unknown special-function DIFs", () => {
    expect(difLengthBytes(0x0f)).toBe(-2);
    expect(difLengthBytes(0x1f)).toBe(-2);
  });
});

describe("difMeasurementType", () => {
  it.each([
    [0x00, "Instantaneous"],
    [0x10, "Maximum"],
    [0x20, "Minimum"],
    [0x30, "AtError"],
    // Function bits mask off; storage bit and data bits don't matter.
    [0x04, "Instantaneous"],
    [0x14, "Maximum"],
    [0x24, "Minimum"],
    [0x34, "AtError"],
  ])("maps DIF 0x%s to %s", (dif, expected) => {
    expect(difMeasurementType(dif as number)).toBe(expected);
  });
});

describe("difDataKind", () => {
  it("identifies BCD, Real, and integer widths", () => {
    expect(difDataKind(0x02)).toBe("Int16");
    expect(difDataKind(0x05)).toBe("Real32");
    expect(difDataKind(0x09)).toBe("Bcd2");
    expect(difDataKind(0x0d)).toBe("Variable");
    expect(difDataKind(0x2f)).toBe("Special");
  });
});

describe("is{Bcd,Real32}DataField", () => {
  it("isBcdDataField matches all BCD encodings", () => {
    expect(isBcdDataField(0x09)).toBe(true);
    expect(isBcdDataField(0x0a)).toBe(true);
    expect(isBcdDataField(0x0b)).toBe(true);
    expect(isBcdDataField(0x0c)).toBe(true);
    expect(isBcdDataField(0x0e)).toBe(true);
    expect(isBcdDataField(0x04)).toBe(false);
  });

  it("isReal32DataField matches only 0x05", () => {
    expect(isReal32DataField(0x05)).toBe(true);
    expect(isReal32DataField(0x04)).toBe(false);
  });
});

describe("parseDifChain — no DIFE", () => {
  it("decodes a bare DIF with storage bit 0", () => {
    const data = new Uint8Array([0x04, 0x00, 0x00, 0x00, 0x00]);
    const chain = parseDifChain(data, 0);
    expect(chain.dif).toBe(0x04);
    expect(chain.difes.length).toBe(0);
    expect(chain.storageNr).toBe(0);
    expect(chain.tariff).toBe(0);
    expect(chain.subunit).toBe(0);
    expect(chain.datalen).toBe(4);
    expect(chain.endOffset).toBe(1);
  });

  it("picks up storage-bit 1 from DIF bit 6", () => {
    const data = new Uint8Array([0x44]); // storage LSB set
    const chain = parseDifChain(data, 0);
    expect(chain.storageNr).toBe(1);
  });
});

describe("parseDifChain — DIFE chain", () => {
  it("combines storage bits across multiple DIFEs", () => {
    // DIF 0xC4: bit 7 (ext), bit 6 (storage LSB), data=4.
    // DIFE0 0x80: bit 7 (ext), storage bits 0-3 = 0.
    // DIFE1 0x04: no ext, storage bits 0-3 = 4 → shifted to bit positions 5-8.
    const data = new Uint8Array([0xc4, 0x80, 0x04, 0x00, 0x00, 0x00, 0x00]);
    const chain = parseDifChain(data, 0);
    expect(chain.difes.length).toBe(2);
    // Storage: bit 0 from DIF (1), bits 1-4 from DIFE0 (0), bits 5-8 from DIFE1 (4<<5=128)
    //        = 1 | 0 | 128 = 129.
    expect(chain.storageNr).toBe(129);
  });

  it("combines tariff bits across DIFEs", () => {
    // DIFE with tariff bits 0x30 → contributes 3 at the appropriate offset.
    const data = new Uint8Array([0x84, 0x30, 0x00]);
    const chain = parseDifChain(data, 0);
    expect(chain.tariff).toBe(3); // first DIFE's tariff bits go in bits 0-1.
  });

  it("respects the 10-DIFE cap and stops silently", () => {
    // 11 consecutive DIFEs all with ext bit set — only 10 should be parsed.
    const buf = new Uint8Array(12);
    buf[0] = 0x84; // DIF with ext
    for (let i = 1; i <= 10; i++) buf[i] = 0x80;
    buf[11] = 0x00;
    const chain = parseDifChain(buf, 0);
    expect(chain.difes.length).toBe(10);
  });
});
