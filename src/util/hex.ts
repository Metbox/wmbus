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
// Hex ↔ bytes helpers. Whitespace and `_` separators (used by wmbusmeters
// source telegrams to visually delimit DLL from TPL) are tolerated.

/**
 * Decode a hex string into a Uint8Array. Ignores all non-hex characters so
 * underscores, spaces, and pipe separators from upstream telegram literals
 * pass through cleanly.
 *
 * Throws if the remaining hex has odd length.
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleaned = hex.replace(/[^0-9A-Fa-f]/g, "");
  if (cleaned.length === 0) return new Uint8Array(0);
  if (cleaned.length % 2 !== 0) {
    throw new Error(`hex length must be even (got ${cleaned.length} chars)`);
  }
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Encode bytes as lowercase hex, no separator. */
export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    out += b.toString(16).padStart(2, "0");
  }
  return out;
}
