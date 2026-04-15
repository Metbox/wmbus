import { describe, expect, it } from "vitest";
import {
  readBcd,
  readDateTimeTypeF,
  readDateTypeG,
  readHexString,
  readLeInt,
  readLeUint,
  readReadableString,
  readReal32,
} from "../../src/data/decode-values.js";
import { hexToBytes } from "../../src/util/hex.js";

describe("readLeUint", () => {
  it("decodes 1..4 byte LE integers", () => {
    expect(readLeUint(new Uint8Array([0x12]), 1)).toBe(0x12);
    expect(readLeUint(new Uint8Array([0x34, 0x12]), 2)).toBe(0x1234);
    expect(readLeUint(new Uint8Array([0x56, 0x34, 0x12]), 3)).toBe(0x123456);
    expect(readLeUint(new Uint8Array([0x78, 0x56, 0x34, 0x12]), 4)).toBe(0x12345678);
  });

  it("decodes 6-byte LE integers via Number", () => {
    // bytes [0xff, 0xff, 0xff, 0xff, 0xff, 0x00] little-endian = 0x00_ff_ff_ff_ff_ff.
    expect(readLeUint(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0x00]), 6)).toBe(
      0x00_ff_ff_ff_ff_ff,
    );
  });

  it("rejects out-of-range lengths", () => {
    expect(() => readLeUint(new Uint8Array(4), 0)).toThrow();
    expect(() => readLeUint(new Uint8Array(4), 9)).toThrow();
  });
});

describe("readLeInt", () => {
  it("interprets high-bit values as two's complement", () => {
    // 0xFF = -1 for a 1-byte signed.
    expect(readLeInt(new Uint8Array([0xff]), 1)).toBe(-1);
    // 0xFFFF = -1 for 2-byte.
    expect(readLeInt(new Uint8Array([0xff, 0xff]), 2)).toBe(-1);
    // 0x80 = -128 for 1-byte.
    expect(readLeInt(new Uint8Array([0x80]), 1)).toBe(-128);
  });

  it("leaves positive values unchanged", () => {
    expect(readLeInt(new Uint8Array([0x7f]), 1)).toBe(127);
    expect(readLeInt(new Uint8Array([0x34, 0x12]), 2)).toBe(0x1234);
  });
});

describe("readBcd", () => {
  it("decodes multi-byte BCD (nibble-swapped)", () => {
    // 0x34 0x12 = 1234
    expect(readBcd(new Uint8Array([0x34, 0x12]), 2)).toBe(1234);
    // 0x67 0x45 0x23 0x01 = 01234567
    expect(readBcd(new Uint8Array([0x67, 0x45, 0x23, 0x01]), 4)).toBe(1234567);
  });

  it("treats all-0xFF as invalid", () => {
    expect(Number.isNaN(readBcd(new Uint8Array([0xff, 0xff]), 2))).toBe(true);
  });

  it("recognises the sign flag 0xFx on the MSB", () => {
    // 0x34 0xF1 = -134 (high nibble 0xF flags negative, remaining digits 1 then 34).
    expect(readBcd(new Uint8Array([0x34, 0xf1]), 2)).toBe(-134);
  });
});

describe("readReal32", () => {
  it("decodes IEEE 754 single-precision", () => {
    // 1.0f in little-endian IEEE = 0x3F800000 → bytes [0x00, 0x00, 0x80, 0x3F].
    expect(readReal32(new Uint8Array([0x00, 0x00, 0x80, 0x3f]))).toBeCloseTo(1.0, 6);
    // -2.5f = 0xC0200000 → [0x00, 0x00, 0x20, 0xC0].
    expect(readReal32(new Uint8Array([0x00, 0x00, 0x20, 0xc0]))).toBeCloseTo(-2.5, 6);
  });
});

describe("readDateTypeG", () => {
  it("decodes a real date", () => {
    // day=31, month=12, year=2023.
    //   year-offset = 23 = 0b0001_0111.
    //   year1 (3 low bits) = 7 → sits in byte 0 bits 5-7 → (7 << 5) = 0xE0
    //   year2 (4 high bits shifted) = (23 >> 3) = 2 → sits in byte 1 bits 4-7 → (2 << 4) = 0x20
    //   byte 0 = 0xE0 | 31 = 0xFF; byte 1 = 0x20 | 12 = 0x2C
    expect(readDateTypeG(new Uint8Array([0xff, 0x2c]))).toBe("2023-12-31");
  });

  it("returns the invalid sentinel for 0xFFFF", () => {
    expect(readDateTypeG(new Uint8Array([0xff, 0xff]))).toBe("2127-15-31");
  });
});

describe("readDateTimeTypeF", () => {
  it("decodes a real datetime", () => {
    // 2022-12-31 10:15.
    //   year-offset 22 = 0b0001_0110.
    //   year1 (3 low bits) = 6 → byte 2 bits 5-7 = (6<<5) = 0xC0
    //   year2 (4 high bits shifted) = (22 >> 3) = 2 → byte 3 bits 4-7 = 0x20
    //   byte 2 = 0xC0 | 31 (day) = 0xDF; byte 3 = 0x20 | 12 (month) = 0x2C
    expect(readDateTimeTypeF(new Uint8Array([0x0f, 0x0a, 0xdf, 0x2c]))).toBe("2022-12-31 10:15");
  });
});

describe("readHexString", () => {
  it("renders bytes as lowercase hex", () => {
    expect(readHexString(hexToBytes("DEADBEEF"))).toBe("deadbeef");
  });
});

describe("readReadableString", () => {
  it("decodes reversed ASCII", () => {
    // "abc" reversed wire order is "cba" → bytes [0x63, 0x62, 0x61].
    expect(readReadableString(new Uint8Array([0x63, 0x62, 0x61]), true)).toBe("abc");
  });

  it("replaces non-printable bytes with '?'", () => {
    expect(readReadableString(new Uint8Array([0x01, 0x02, 0x03]), false)).toBe("???");
  });
});
