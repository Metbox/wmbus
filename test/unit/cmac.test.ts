import { describe, expect, it } from "vitest";
import { aesCmac, cmacSubkeys } from "../../src/crypto/cmac.js";
import { hexToBytes } from "../../src/util/hex.js";

describe("AES-CMAC — RFC 4493 test vectors", () => {
  // RFC 4493 §4 "Test Vectors" — AES-128 key shared by every vector.
  const KEY = hexToBytes("2b7e151628aed2a6abf7158809cf4f3c");

  // RFC 4493 §4 subkey derivation outputs.
  const EXPECTED_K1 = hexToBytes("fbeed618357133667c85e08f7236a8de");
  const EXPECTED_K2 = hexToBytes("f7ddac306ae266ccf90bc11ee46d513b");

  it("derives K1 and K2 per RFC 4493 §4", () => {
    const { k1, k2 } = cmacSubkeys(KEY);
    expect(k1).toEqual(EXPECTED_K1);
    expect(k2).toEqual(EXPECTED_K2);
  });

  it("hashes an empty message to the RFC 4493 §4 M=0 vector", () => {
    expect(aesCmac(KEY, new Uint8Array(0))).toEqual(hexToBytes("bb1d6929e95937287fa37d129b756746"));
  });

  it("hashes the 16-byte message (one full block)", () => {
    const m = hexToBytes("6bc1bee22e409f96e93d7e117393172a");
    expect(aesCmac(KEY, m)).toEqual(hexToBytes("070a16b46b4d4144f79bdd9dd04a287c"));
  });

  it("hashes the 40-byte message (two full blocks + 1 partial)", () => {
    const m = hexToBytes(
      "6bc1bee22e409f96e93d7e117393172a" + "ae2d8a571e03ac9c9eb76fac45af8e51" + "30c81c46a35ce411",
    );
    expect(aesCmac(KEY, m)).toEqual(hexToBytes("dfa66747de9ae63030ca32611497c827"));
  });

  it("hashes the 64-byte message (four full blocks)", () => {
    const m = hexToBytes(
      "6bc1bee22e409f96e93d7e117393172a" +
        "ae2d8a571e03ac9c9eb76fac45af8e51" +
        "30c81c46a35ce411e5fbc1191a0a52ef" +
        "f69f2445df4f9b17ad2b417be66c3710",
    );
    expect(aesCmac(KEY, m)).toEqual(hexToBytes("51f0bebf7e3b9d92fc49741779363cfe"));
  });

  it("is deterministic", () => {
    const msg = new Uint8Array(13).fill(0x42);
    expect(aesCmac(KEY, msg)).toEqual(aesCmac(KEY, msg));
  });
});
