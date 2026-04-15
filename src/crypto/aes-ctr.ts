// AES-128 CTR mode used by the Extended Link Layer (ELL) security layer.
//
// Wire format: CI 0x8D or 0x8F. The 16-byte IV is assembled from the DLL
// fields (M + A), the ELL CC byte (with H and R bits masked), SN, and
// trailing zero FN + BC — see wmbus_utils.cc:36. Counter is incremented for
// each 16-byte block starting from that IV.
//
// Node's built-in aes-128-ctr handles the block-by-block keystream generation
// and counter increment for us; we just need to build the correct initial IV.

import { createCipheriv } from "node:crypto";

function assertKey(key: Uint8Array): void {
  if (key.length !== 16) {
    throw new Error(`AES-128 key must be 16 bytes (got ${key.length})`);
  }
}

function assertIv(iv: Uint8Array): void {
  if (iv.length !== 16) {
    throw new Error(`AES CTR initial counter must be 16 bytes (got ${iv.length})`);
  }
}

/**
 * Encrypt/decrypt `data` under AES-128 CTR with the given initial counter.
 * CTR is symmetric — the same call works for both directions.
 *
 * No length constraints on `data` — CTR is a stream cipher, any length works.
 */
export function aes128Ctr(
  key: Uint8Array,
  initialCounter: Uint8Array,
  data: Uint8Array,
): Uint8Array {
  assertKey(key);
  assertIv(initialCounter);
  const c = createCipheriv("aes-128-ctr", key, initialCounter);
  const out = Buffer.concat([c.update(data), c.final()]);
  const copy = new Uint8Array(out.length);
  copy.set(out);
  return copy;
}

/**
 * ELL IV assembly (per wmbus_utils.cc:36).
 *
 *   bytes 0-1   M-field (2 bytes as sent)
 *   bytes 2-7   A-field (6 bytes)
 *   byte  8     CC with bits 0x10 (H) and 0x02 (R) cleared
 *   bytes 9-12  SN  (4 bytes)
 *   bytes 13-14 FN  (always 0 for CTR init)
 *   byte  15    BC  (always 0)
 */
export function buildEllIv(
  mfct: Uint8Array,
  address: Uint8Array,
  cc: number,
  sn: Uint8Array,
): Uint8Array {
  if (mfct.length !== 2) throw new Error("M-field must be 2 bytes");
  if (address.length !== 6) throw new Error("A-field must be 6 bytes");
  if (sn.length !== 4) throw new Error("SN-field must be 4 bytes");
  const iv = new Uint8Array(16);
  iv[0] = mfct[0] as number;
  iv[1] = mfct[1] as number;
  for (let i = 0; i < 6; i++) iv[2 + i] = address[i] as number;
  // Clear H-bit (0x10) and R-bit (0x02); upstream has wmbus_utils.cc:45.
  iv[8] = cc & ~0x10 & ~0x02;
  for (let i = 0; i < 4; i++) iv[9 + i] = sn[i] as number;
  // iv[13], iv[14], iv[15] left zero (FN=0, BC=0).
  return iv;
}
