// Per-meter decoder state — the cache that survives across multiple telegrams
// from the same meter. Today it only holds Kamstrup format-signature entries;
// later sweeps may add last-seen-field memory for multi-telegram reconstruction.
//
// Callers pass an optional `MeterState` to `decodeWmbusHex`. When absent, each
// call is stateless (the compact-frame path will fail to decode since no
// prior long-form telegram populated the cache).

import { hexToBytes } from "../util/hex.js";

export interface MeterState {
  /**
   * Kamstrup compact-frame format cache: `sigHash → formatBytes`.
   *
   * A long-form telegram populates this with the CRC16-EN13757 hash of its
   * DIF+VIF chain. When a compact telegram (CI=0x79) arrives, the parser
   * looks up the hash, retrieves the format bytes, and uses them as the
   * DIF/VIF source while reading raw values from the compact payload.
   */
  formatSignatureCache: Map<number, Uint8Array>;
}

/**
 * Hard-coded Kamstrup format-signature formats from upstream's
 * `findFormatBytesFromKnownMeterSignatures` (wmbus.cc:4051). Populates any
 * new `MeterState` so isolated compact frames (no long-frame predecessor)
 * still decode when the signature is one of these well-known values.
 */
const KNOWN_FORMAT_BYTES: ReadonlyArray<readonly [number, string]> = [
  [0xa8ed, "02FF2004134413615B6167"],
  [0xc412, "02FF20041392013BA1015B8101E7FF0F"],
  [0x61eb, "02FF2004134413A1015B8101E7FF0F"],
  [0xd2f7, "02FF2004134413615B5167"],
  [0xdd34, "02FF2004134413"],
  [0x7c0e, "02FF200413523B"],
  [0x0905, "04FF234413523B06FF1B426C61675167023B04138101E7FF0F"],
];

export function createMeterState(): MeterState {
  const cache = new Map<number, Uint8Array>();
  for (const [sig, hex] of KNOWN_FORMAT_BYTES) cache.set(sig, hexToBytes(hex));
  return { formatSignatureCache: cache };
}
