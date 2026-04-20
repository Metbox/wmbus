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
// AES-CMAC (RFC 4493) — used by wM-Bus security mode 7 to derive a per-
// telegram key from the user's master key and the message headers.
//
// RFC 4493 reference: https://datatracker.ietf.org/doc/html/rfc4493
//
// The algorithm is ~50 lines of XOR/shift on top of AES-128 block encrypt.
// Node does not ship CMAC natively, so we implement it here using the
// AES-128 primitive from `aes.ts`.

import { aes128EncryptBlock } from "./aes.js";

const BLOCK_SIZE = 16;
const RB = 0x87; // Constant Rb for AES (128-bit block), RFC 4493 §2.3.

function xorBlocks(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = (a[i] as number) ^ (b[i] as number);
  }
  return out;
}

/**
 * Left-shift a 128-bit block by one bit (MSB-first ordering) — the only
 * non-trivial operation in the subkey generation. Returns a new buffer.
 */
function leftShiftOneBit(input: Uint8Array): Uint8Array {
  const out = new Uint8Array(BLOCK_SIZE);
  let carry = 0;
  for (let i = BLOCK_SIZE - 1; i >= 0; i--) {
    const byte = input[i] as number;
    out[i] = ((byte << 1) | carry) & 0xff;
    carry = (byte & 0x80) !== 0 ? 1 : 0;
  }
  return out;
}

/**
 * Generate the two CMAC subkeys K1 and K2 from the AES key. Port of the
 * "generateSubkey" routine in RFC 4493 §2.3.
 */
export function cmacSubkeys(key: Uint8Array): { k1: Uint8Array; k2: Uint8Array } {
  const zero = new Uint8Array(BLOCK_SIZE);
  const L = aes128EncryptBlock(key, zero);

  // K1 = (L << 1) xor Rb   if MSB(L) = 1
  //    = (L << 1)          otherwise
  const k1 = leftShiftOneBit(L);
  if (((L[0] as number) & 0x80) !== 0) {
    k1[BLOCK_SIZE - 1] = (k1[BLOCK_SIZE - 1] as number) ^ RB;
  }

  // K2 derived from K1 the same way.
  const k2 = leftShiftOneBit(k1);
  if (((k1[0] as number) & 0x80) !== 0) {
    k2[BLOCK_SIZE - 1] = (k2[BLOCK_SIZE - 1] as number) ^ RB;
  }

  return { k1, k2 };
}

/**
 * Compute the 16-byte AES-CMAC tag of `message` under `key`.
 *
 * Port of RFC 4493 §2.4 "MAC Generation Algorithm".
 */
export function aesCmac(key: Uint8Array, message: Uint8Array): Uint8Array {
  const { k1, k2 } = cmacSubkeys(key);

  // Split the message into 16-byte blocks; the final block may be short
  // (in which case pad with 0x80 followed by zeroes and XOR with K2) or
  // exact (in which case XOR with K1).
  const n = Math.max(1, Math.ceil(message.length / BLOCK_SIZE));
  const lastBlockFull = message.length > 0 && message.length % BLOCK_SIZE === 0;

  let mLast: Uint8Array;
  if (lastBlockFull) {
    const lastStart = (n - 1) * BLOCK_SIZE;
    mLast = xorBlocks(message.slice(lastStart, lastStart + BLOCK_SIZE), k1);
  } else {
    const padded = new Uint8Array(BLOCK_SIZE);
    const lastStart = (n - 1) * BLOCK_SIZE;
    const remaining = message.length - lastStart;
    for (let i = 0; i < remaining; i++) {
      padded[i] = message[lastStart + i] as number;
    }
    padded[remaining] = 0x80;
    // bytes [remaining+1 .. 15] are already zero
    mLast = xorBlocks(padded, k2);
  }

  let x: Uint8Array = new Uint8Array(BLOCK_SIZE); // X_0 = 0^b
  for (let i = 0; i < n - 1; i++) {
    const block = message.slice(i * BLOCK_SIZE, (i + 1) * BLOCK_SIZE);
    x = aes128EncryptBlock(key, xorBlocks(x, block));
  }
  return aes128EncryptBlock(key, xorBlocks(x, mLast));
}
