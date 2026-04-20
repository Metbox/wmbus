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
import { aes128DecryptBlock, aes128EncryptBlock } from "../../src/crypto/aes.js";
import { hexToBytes } from "../../src/util/hex.js";

describe("aes-128 block cipher — NIST SP 800-38A reference", () => {
  // NIST SP 800-38A §F.1.1 — AES-128 ECB known-answer test.
  //   Key:         2b7e151628aed2a6abf7158809cf4f3c
  //   Plaintext:   6bc1bee22e409f96e93d7e117393172a
  //   Ciphertext:  3ad77bb40d7a3660a89ecaf32466ef97
  const KEY = hexToBytes("2b7e151628aed2a6abf7158809cf4f3c");
  const PLAINTEXT = hexToBytes("6bc1bee22e409f96e93d7e117393172a");
  const CIPHERTEXT = hexToBytes("3ad77bb40d7a3660a89ecaf32466ef97");

  it("encrypts the SP 800-38A §F.1.1 block to the expected ciphertext", () => {
    expect(aes128EncryptBlock(KEY, PLAINTEXT)).toEqual(CIPHERTEXT);
  });

  it("decrypts the SP 800-38A §F.1.2 block back to plaintext", () => {
    expect(aes128DecryptBlock(KEY, CIPHERTEXT)).toEqual(PLAINTEXT);
  });

  it("round-trips a random 16-byte block", () => {
    const plain = new Uint8Array(16);
    for (let i = 0; i < 16; i++) plain[i] = (i * 17) & 0xff;
    const enc = aes128EncryptBlock(KEY, plain);
    const dec = aes128DecryptBlock(KEY, enc);
    expect(dec).toEqual(plain);
  });

  it("rejects keys of the wrong length", () => {
    expect(() => aes128EncryptBlock(new Uint8Array(15), PLAINTEXT)).toThrow();
    expect(() => aes128EncryptBlock(new Uint8Array(24), PLAINTEXT)).toThrow();
  });

  it("rejects blocks of the wrong length", () => {
    expect(() => aes128EncryptBlock(KEY, new Uint8Array(15))).toThrow();
    expect(() => aes128DecryptBlock(KEY, new Uint8Array(17))).toThrow();
  });
});
