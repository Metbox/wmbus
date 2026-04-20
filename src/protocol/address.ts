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
// wM-Bus address (A-field) decoding.
//
// The A-field in the DLL is 6 bytes: 4-byte BCD id (little-endian on the wire)
// followed by 1 byte version and 1 byte device type. On-wire byte order is
// reversed for display — `99 87 34 76` becomes id `"76348799"`.

/**
 * Reverse the 4-byte wire id into its display-string form. Each byte is
 * rendered as two hex digits — this keeps id strings BCD-compatible while
 * still representing the handful of meters that use binary (non-BCD) ids.
 */
export function decodeId(idBytes: Uint8Array, offset = 0): string {
  if (idBytes.length < offset + 4) {
    throw new RangeError(`id requires 4 bytes from offset ${offset}`);
  }
  let out = "";
  // Iterate in reverse: wire stores LSB first, display shows MSB first.
  for (let i = 3; i >= 0; i--) {
    out += (idBytes[offset + i] as number).toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * Placeholder for Diehl / manufacturer-specific address swapping. The full
 * transform lands alongside the Diehl preprocessor in Phase 3; for now this
 * is the identity function so Phase 1 can wire up the pipeline end-to-end.
 */
export function maybeSwapAddress(address: Uint8Array, _mfct: number): Uint8Array {
  return address;
}
