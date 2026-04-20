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
import { bytesToHex, hexToBytes } from "../../src/util/hex.js";

describe("hex helpers", () => {
  it("round-trips bytes → hex → bytes", () => {
    const bytes = new Uint8Array([0x2a, 0x44, 0x2d, 0x2c, 0x99, 0x87, 0x34, 0x76]);
    const hex = bytesToHex(bytes);
    expect(hex).toBe("2a442d2c99873476");
    expect(hexToBytes(hex)).toEqual(bytes);
  });

  it("tolerates separators used by upstream fixture syntax", () => {
    // `|AA_BB|` is what wmbusmeters writes inside `telegram=|...|` literals.
    const clean = hexToBytes("|2A 44_2D_2C|");
    expect(clean).toEqual(new Uint8Array([0x2a, 0x44, 0x2d, 0x2c]));
  });

  it("handles uppercase + lowercase", () => {
    expect(hexToBytes("DeAdBeEf")).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  });

  it("returns empty array for empty input", () => {
    expect(hexToBytes("")).toEqual(new Uint8Array(0));
    expect(hexToBytes("   ___   ")).toEqual(new Uint8Array(0));
  });

  it("rejects odd-length hex (after cleaning)", () => {
    expect(() => hexToBytes("abc")).toThrow();
  });
});
