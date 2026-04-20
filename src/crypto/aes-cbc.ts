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
// AES-128 CBC mode — the workhorse of wM-Bus security modes 5 and 7.
//
// Mode 5 (AES_CBC_IV) derives a 16-byte IV from the DLL/TPL address + ACC and
// decrypts straight with the user-supplied key. Mode 7 (AES_CBC_NO_IV) uses
// an all-zero IV with a per-telegram *derived* key (derivation lives in the
// TPL layer — see plan Phase 3). Both modes reduce to the same primitive
// here: 16-byte aligned CBC decrypt with an explicit IV.

import { createCipheriv, createDecipheriv } from "node:crypto";
import { AES128_BLOCK_SIZE } from "./aes.js";

function assertKey(key: Uint8Array): void {
  if (key.length !== 16) {
    throw new Error(`AES-128 key must be 16 bytes (got ${key.length})`);
  }
}

function assertIv(iv: Uint8Array): void {
  if (iv.length !== 16) {
    throw new Error(`AES CBC IV must be 16 bytes (got ${iv.length})`);
  }
}

function assertBlockAligned(data: Uint8Array): void {
  if (data.length % AES128_BLOCK_SIZE !== 0) {
    throw new Error(
      `AES CBC data must be a multiple of ${AES128_BLOCK_SIZE} bytes (got ${data.length})`,
    );
  }
}

/** Encrypt `data` under AES-128-CBC with the given key and IV. No padding. */
export function aes128CbcEncrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  assertKey(key);
  assertIv(iv);
  assertBlockAligned(data);
  const c = createCipheriv("aes-128-cbc", key, iv);
  c.setAutoPadding(false);
  const out = Buffer.concat([c.update(data), c.final()]);
  const copy = new Uint8Array(out.length);
  copy.set(out);
  return copy;
}

/** Decrypt `data` under AES-128-CBC with the given key and IV. No padding. */
export function aes128CbcDecrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  assertKey(key);
  assertIv(iv);
  assertBlockAligned(data);
  const d = createDecipheriv("aes-128-cbc", key, iv);
  d.setAutoPadding(false);
  const out = Buffer.concat([d.update(data), d.final()]);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
}

/**
 * Mode-5 IV assembly (per wmbus_utils.cc:156).
 *
 *   bytes 0-1   M-field (LE on wire, same 2 bytes used here)
 *   bytes 2-7   A-field (6 bytes)
 *   bytes 8-15  ACC byte repeated 8 times
 */
export function buildMode5Iv(mfct: Uint8Array, address: Uint8Array, acc: number): Uint8Array {
  if (mfct.length !== 2) throw new Error("M-field must be 2 bytes");
  if (address.length !== 6) throw new Error("A-field must be 6 bytes");
  const iv = new Uint8Array(16);
  iv[0] = mfct[0] as number;
  iv[1] = mfct[1] as number;
  for (let i = 0; i < 6; i++) iv[2 + i] = address[i] as number;
  for (let i = 0; i < 8; i++) iv[8 + i] = acc & 0xff;
  return iv;
}

/** Mode-7 IV — 16 zero bytes. */
export function buildMode7Iv(): Uint8Array {
  return new Uint8Array(16);
}
