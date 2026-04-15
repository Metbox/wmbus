import { describe, expect, it } from "vitest";
import {
  aes128CbcDecrypt,
  aes128CbcEncrypt,
  buildMode5Iv,
  buildMode7Iv,
} from "../../src/crypto/aes-cbc.js";
import { hexToBytes } from "../../src/util/hex.js";

describe("aes-128 CBC — NIST SP 800-38A reference", () => {
  // NIST SP 800-38A §F.2.1 — AES-128 CBC known-answer test vectors.
  const KEY = hexToBytes("2b7e151628aed2a6abf7158809cf4f3c");
  const IV = hexToBytes("000102030405060708090a0b0c0d0e0f");
  const PLAINTEXT = hexToBytes(
    "6bc1bee22e409f96e93d7e117393172a" +
      "ae2d8a571e03ac9c9eb76fac45af8e51" +
      "30c81c46a35ce411e5fbc1191a0a52ef" +
      "f69f2445df4f9b17ad2b417be66c3710",
  );
  const CIPHERTEXT = hexToBytes(
    "7649abac8119b246cee98e9b12e9197d" +
      "5086cb9b507219ee95db113a917678b2" +
      "73bed6b8e3c1743b7116e69e22229516" +
      "3ff1caa1681fac09120eca307586e1a7",
  );

  it("encrypts the SP 800-38A §F.2.1 vector", () => {
    expect(aes128CbcEncrypt(KEY, IV, PLAINTEXT)).toEqual(CIPHERTEXT);
  });

  it("decrypts the SP 800-38A §F.2.2 vector", () => {
    expect(aes128CbcDecrypt(KEY, IV, CIPHERTEXT)).toEqual(PLAINTEXT);
  });

  it("round-trips a single block with all-zero IV (Mode 7 shape)", () => {
    const iv = buildMode7Iv();
    const plain = hexToBytes("00112233445566778899aabbccddeeff");
    const enc = aes128CbcEncrypt(KEY, iv, plain);
    expect(aes128CbcDecrypt(KEY, iv, enc)).toEqual(plain);
  });

  it("rejects non-16-byte-aligned inputs", () => {
    expect(() => aes128CbcEncrypt(KEY, IV, new Uint8Array(15))).toThrow();
    expect(() => aes128CbcDecrypt(KEY, IV, new Uint8Array(17))).toThrow();
  });
});

describe("buildMode5Iv", () => {
  it("packs M, A, and repeated ACC as per wmbus_utils.cc:156", () => {
    const mfct = new Uint8Array([0x2d, 0x2c]); // KAM on the wire
    const address = new Uint8Array([0x99, 0x87, 0x34, 0x76, 0x1b, 0x16]);
    const acc = 0x7f;
    const iv = buildMode5Iv(mfct, address, acc);
    expect(iv).toEqual(
      new Uint8Array([
        0x2d, 0x2c, 0x99, 0x87, 0x34, 0x76, 0x1b, 0x16, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f,
        0x7f,
      ]),
    );
  });

  it("rejects wrong-sized inputs", () => {
    expect(() => buildMode5Iv(new Uint8Array(3), new Uint8Array(6), 0)).toThrow();
    expect(() => buildMode5Iv(new Uint8Array(2), new Uint8Array(5), 0)).toThrow();
  });
});

describe("buildMode7Iv", () => {
  it("is 16 zero bytes", () => {
    expect(buildMode7Iv()).toEqual(new Uint8Array(16));
  });
});
