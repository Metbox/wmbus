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
// VIF (Value Information Field) + VIFE chain parser.
//
// Port of the VIF-handling portion of parseDV in dvparser.cc:378-540.
//
// VIF byte layout:
//   bit  7    extension (another VIFE follows)
//   bits 0-6  primary VIF value, or an "extension marker" (0xFB/0xFD/0xEF/0xFF)
//             that makes the next VIFE the real VIF, shifted to the high byte.
//
// VIFE byte layout:
//   bit  7    extension (another VIFE follows)
//   bits 0-6  VIFCombinable modifier
//
// Special VIF values:
//   0x7C / 0xFC  — variable-length plaintext VIF (ASCII VIF, length in next byte).

export interface VifChain {
  /** Primary VIF value (possibly 16-bit for extension tables: 0x7B00..0x7D..). */
  vif: number;
  /** All VIFE bytes (raw, with high bit preserved). */
  vifes: Uint8Array;
  /** Combinable VIFs resolved from the VIFE bytes — raw integer values. */
  combinables: number[];
  /** Extracted variable-length VIF (ASCII) bytes, or null if not applicable. */
  varLengthVif: Uint8Array | null;
  /** Position after the VIF+VIFE chain (absolute index). */
  endOffset: number;
}

/**
 * Parse the VIF + optional VIFE chain starting at `offset` in `data`.
 *
 * Matches upstream's behaviour (dvparser.cc:378-540) including the 10-VIFE
 * cap and the 0x7C/0xFC variable-length VIF handling.
 */
export function parseVifChain(data: Uint8Array, offset: number): VifChain {
  if (offset >= data.length) {
    throw new Error(`VIF chain: offset ${offset} past end of buffer (len=${data.length})`);
  }

  const vifByte = data[offset] as number;
  const lowBits = vifByte & 0x7f;

  let vif = lowBits;
  let extensionActive = false;

  // Extension markers (0xFB, 0xFD, 0xEF, 0xFF): the low 7 bits of the VIFE
  // that follows become the real VIF, shifted into the high byte slot.
  // Upstream stores the combined value in `full_vif`.
  if (vifByte === 0xfb || vifByte === 0xfd || vifByte === 0xef || vifByte === 0xff) {
    vif <<= 8;
    extensionActive = true;
  }

  let i = offset + 1;
  let varLengthVif: Uint8Array | null = null;

  // Variable-length VIF (0x7C / 0xFC).
  if (vifByte === 0x7c || vifByte === 0xfc) {
    if (i >= data.length) {
      // Truncated — bail out with no varlen data.
      return { vif, vifes: new Uint8Array(0), combinables: [], varLengthVif: null, endOffset: i };
    }
    const len = data[i] as number;
    i++;
    const end = Math.min(i + len, data.length);
    varLengthVif = data.slice(i, end);
    i = end;
  }

  const vifes: number[] = [];
  const combinables: number[] = [];

  let hasMore = (vifByte & 0x80) === 0x80;
  let combinableExtensionActive = false;
  let combinableHigh = 0;
  let vifeCount = 0;

  while (hasMore) {
    if (vifeCount >= 10) break;
    if (i >= data.length) break;

    const vife = data[i] as number;
    vifes.push(vife);
    i++;
    vifeCount++;

    hasMore = (vife & 0x80) === 0x80;

    if (extensionActive) {
      // First VIFE after an extension marker is the real VIF value.
      vif |= vife & 0x7f;
      extensionActive = false;
      continue;
    }

    const lowVife = vife & 0x7f;
    if (combinableExtensionActive) {
      // Second half of a combinable VIFE extension.
      combinableExtensionActive = false;
      combinables.push(combinableHigh | lowVife);
      combinableHigh = 0;
    } else if (lowVife === 0x7c || lowVife === 0x7f) {
      // Extension marker for combinable VIFE — shift and read next byte.
      combinableHigh = lowVife << 8;
      combinableExtensionActive = true;
    } else {
      combinables.push(lowVife);
    }
  }

  return {
    vif,
    vifes: new Uint8Array(vifes),
    combinables,
    varLengthVif,
    endOffset: i,
  };
}
