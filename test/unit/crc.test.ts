import { describe, expect, it } from "vitest";
import { crc16En13757 } from "../../src/protocol/crc.js";

describe("crc16En13757", () => {
  // Phase 1 goal for CRC is structural correctness + determinism. Cross-
  // implementation parity is validated end-to-end in Phase 8's shadow-mode
  // burn-in, where we run identical telegrams through both the upstream WASM
  // and this implementation. For now, test only values we can derive from
  // the algorithm specification itself.

  it("returns 0xFFFF on empty input", () => {
    // Init 0 means zero accumulator; output is bitwise NOT → 0xFFFF.
    expect(crc16En13757(new Uint8Array(0))).toBe(0xffff);
  });

  it("returns 0xFFFF for a single zero byte", () => {
    // Shift-by-zero leaves the accumulator at 0 regardless of polynomial.
    expect(crc16En13757(new Uint8Array([0x00]))).toBe(0xffff);
  });

  it("is deterministic", () => {
    const a = new Uint8Array([1, 2, 3, 4, 5]);
    const b = new Uint8Array([1, 2, 3, 4, 5]);
    expect(crc16En13757(a)).toBe(crc16En13757(b));
  });

  it("produces different digests for different inputs", () => {
    const a = crc16En13757(new Uint8Array([0x01]));
    const b = crc16En13757(new Uint8Array([0x02]));
    expect(a).not.toBe(b);
  });

  it("honours offset + length", () => {
    const data = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0xca, 0xfe]);
    const whole = crc16En13757(data);
    const windowed = crc16En13757(data, 1, 4); // 0xad, 0xbe, 0xef, 0xca
    const viaSlice = crc16En13757(data.slice(1, 5));
    expect(windowed).toBe(viaSlice);
    expect(windowed).not.toBe(whole);
  });

  it("rejects out-of-range ranges", () => {
    expect(() => crc16En13757(new Uint8Array(3), 0, 5)).toThrow(RangeError);
    expect(() => crc16En13757(new Uint8Array(3), -1, 1)).toThrow(RangeError);
  });
});
