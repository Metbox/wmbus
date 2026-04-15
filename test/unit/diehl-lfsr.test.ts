import { describe, expect, it } from "vitest";
import {
  DiehlLfsrCheckMethod,
  decodeDiehlLfsr,
  diehlConvertKey,
} from "../../src/crypto/diehl-lfsr.js";
import { hexToBytes } from "../../src/util/hex.js";

describe("diehlConvertKey", () => {
  it("XORs the two 4-byte halves of a 16-byte AES key (big-endian)", () => {
    //  key[0..3] = 0xAABBCCDD
    //  key[4..7] = 0x11223344
    //  → 0xBB99FF99
    const key = hexToBytes("AABBCCDD11223344" + "00000000" + "00000000");
    expect(diehlConvertKey(key)).toBe(0xbb99ff99);
  });

  it("rejects too-short keys", () => {
    expect(() => diehlConvertKey(new Uint8Array(4))).toThrow();
  });
});

describe("decodeDiehlLfsr", () => {
  // Functional test: decode is its own inverse. Encode some deterministic
  // plaintext using the same algorithm and verify we can recover it.
  // (The LFSR output stream only depends on the seed; XOR-ing the frame
  // twice restores the plaintext.)
  function encodeDiehlLfsr(
    origin: Uint8Array,
    frameHeader: Uint8Array,
    plaintext: Uint8Array,
    seed: number,
  ): Uint8Array {
    // Build a pretend ciphertext frame: 15-byte header (copy frameHeader) + plaintext.
    const ciphertext = new Uint8Array(15 + plaintext.length);
    ciphertext.set(frameHeader.slice(0, 15), 0);
    ciphertext.set(plaintext, 15); // placeholder
    const scrambled = decodeDiehlLfsr(origin, ciphertext, seed);
    // Write scrambled back into the frame at offset 15 — that is now the
    // "encoded" ciphertext.
    const encoded = new Uint8Array(ciphertext);
    encoded.set(scrambled, 15);
    return encoded;
  }

  const origin = hexToBytes("1e44a51105050505070578"); // typical Izar header layout
  const frameHeader = hexToBytes("1e44a51105050505070578aabbccdd"); // 15 bytes
  const plaintext = hexToBytes("4b010203040506070809");
  const seed = 0xdeadbeef;

  it("round-trips plaintext under a fixed seed", () => {
    const encoded = encodeDiehlLfsr(origin, frameHeader, plaintext, seed);
    const decoded = decodeDiehlLfsr(origin, encoded, seed);
    expect(decoded).toEqual(plaintext);
  });

  it("honours the HEADER_1_BYTE check (0x4B)", () => {
    const encoded = encodeDiehlLfsr(origin, frameHeader, plaintext, seed);
    // Plaintext starts with 0x4B — the check should succeed.
    const decoded = decodeDiehlLfsr(origin, encoded, seed, DiehlLfsrCheckMethod.HEADER_1_BYTE);
    expect(decoded.length).toBe(plaintext.length);
    expect(decoded[0]).toBe(0x4b);

    // With the wrong seed the first byte almost certainly won't be 0x4B —
    // the function should bail out and return an empty Uint8Array.
    const fail = decodeDiehlLfsr(origin, encoded, 0, DiehlLfsrCheckMethod.HEADER_1_BYTE);
    expect(fail.length).toBe(0);
  });

  it("rejects truncated inputs", () => {
    expect(() => decodeDiehlLfsr(new Uint8Array(5), new Uint8Array(20), 0)).toThrow();
    expect(() => decodeDiehlLfsr(new Uint8Array(10), new Uint8Array(10), 0)).toThrow();
  });
});
