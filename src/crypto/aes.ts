// AES-128 primitives used by the wM-Bus security layer.
//
// Implementation uses Node's built-in `node:crypto` module — no npm runtime
// deps, and on modern Node it runs against AES-NI. The surface stays narrow
// and functional so callers in `aes-cbc.ts`, `aes-ctr.ts`, and `cmac.ts`
// have a stable low-level API.

import { createCipheriv, createDecipheriv } from "node:crypto";

const BLOCK_SIZE = 16;
export const AES128_BLOCK_SIZE = BLOCK_SIZE;

function assertKey(key: Uint8Array): void {
  if (key.length !== 16) {
    throw new Error(`AES-128 key must be 16 bytes (got ${key.length})`);
  }
}

function assertBlock(block: Uint8Array, label: string): void {
  if (block.length !== BLOCK_SIZE) {
    throw new Error(`AES-128 ${label} must be ${BLOCK_SIZE} bytes (got ${block.length})`);
  }
}

// Turn a Node Buffer into a plain-ArrayBuffer-backed Uint8Array so the typed
// return satisfies `Uint8Array<ArrayBuffer>` consumers (e.g. downstream
// callers that use .slice() without caring about ArrayBufferLike types).
function toOwnedUint8Array(buf: Buffer): Uint8Array {
  const out = new Uint8Array(buf.length);
  out.set(buf);
  return out;
}

/** Encrypt a single 16-byte block with AES-128 (ECB with no padding). */
export function aes128EncryptBlock(key: Uint8Array, block: Uint8Array): Uint8Array {
  assertKey(key);
  assertBlock(block, "block");
  // ECB with auto-padding disabled matches raw block-cipher semantics.
  const c = createCipheriv("aes-128-ecb", key, null);
  c.setAutoPadding(false);
  return toOwnedUint8Array(Buffer.concat([c.update(block), c.final()]));
}

/** Decrypt a single 16-byte block with AES-128 (ECB with no padding). */
export function aes128DecryptBlock(key: Uint8Array, block: Uint8Array): Uint8Array {
  assertKey(key);
  assertBlock(block, "block");
  const d = createDecipheriv("aes-128-ecb", key, null);
  d.setAutoPadding(false);
  return toOwnedUint8Array(Buffer.concat([d.update(block), d.final()]));
}
