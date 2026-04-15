import { describe, expect, it } from "vitest";
import { aes128Ctr, buildEllIv } from "../../src/crypto/aes-ctr.js";
import { hexToBytes } from "../../src/util/hex.js";

describe("aes-128 CTR — NIST SP 800-38A reference", () => {
  // NIST SP 800-38A §F.5.1 — AES-128 CTR known-answer test.
  const KEY = hexToBytes("2b7e151628aed2a6abf7158809cf4f3c");
  const INITIAL_COUNTER = hexToBytes("f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff");
  const PLAINTEXT = hexToBytes(
    "6bc1bee22e409f96e93d7e117393172a" +
      "ae2d8a571e03ac9c9eb76fac45af8e51" +
      "30c81c46a35ce411e5fbc1191a0a52ef" +
      "f69f2445df4f9b17ad2b417be66c3710",
  );
  const CIPHERTEXT = hexToBytes(
    "874d6191b620e3261bef6864990db6ce" +
      "9806f66b7970fdff8617187bb9fffdff" +
      "5ae4df3edbd5d35e5b4f09020db03eab" +
      "1e031dda2fbe03d1792170a0f3009cee",
  );

  it("encrypts the SP 800-38A §F.5.1 vector", () => {
    expect(aes128Ctr(KEY, INITIAL_COUNTER, PLAINTEXT)).toEqual(CIPHERTEXT);
  });

  it("decrypts (CTR is symmetric) back to plaintext", () => {
    expect(aes128Ctr(KEY, INITIAL_COUNTER, CIPHERTEXT)).toEqual(PLAINTEXT);
  });

  it("handles non-block-aligned lengths", () => {
    // CTR is a stream cipher — partial last block should just work.
    const short = PLAINTEXT.slice(0, 5);
    const enc = aes128Ctr(KEY, INITIAL_COUNTER, short);
    expect(enc.length).toBe(5);
    expect(aes128Ctr(KEY, INITIAL_COUNTER, enc)).toEqual(short);
  });
});

describe("buildEllIv", () => {
  it("assembles the 16-byte ELL IV with H/R bits cleared on CC", () => {
    const mfct = new Uint8Array([0x2d, 0x2c]);
    const address = new Uint8Array([0x99, 0x87, 0x34, 0x76, 0x1b, 0x16]);
    // CC byte with both H (0x10) and R (0x02) set — both should clear.
    const cc = 0x53; // 0101 0011 → after mask 0100 0001 = 0x41
    const sn = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]);
    const iv = buildEllIv(mfct, address, cc, sn);
    expect(iv).toEqual(
      new Uint8Array([
        0x2d, 0x2c, 0x99, 0x87, 0x34, 0x76, 0x1b, 0x16, 0x41, 0xaa, 0xbb, 0xcc, 0xdd, 0x00, 0x00,
        0x00,
      ]),
    );
  });

  it("rejects wrong-sized inputs", () => {
    expect(() => buildEllIv(new Uint8Array(1), new Uint8Array(6), 0, new Uint8Array(4))).toThrow();
    expect(() => buildEllIv(new Uint8Array(2), new Uint8Array(5), 0, new Uint8Array(4))).toThrow();
    expect(() => buildEllIv(new Uint8Array(2), new Uint8Array(6), 0, new Uint8Array(3))).toThrow();
  });
});
