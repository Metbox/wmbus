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
// CRC-16 / EN 13757 used by the wM-Bus Data Link Layer.
//
// Port of util.cc:909-939 from wmbusmeters. Algorithm:
//   polynomial  = 0x3D65
//   init        = 0x0000
//   processing  = MSB-first, bit-test on (crc>>8) xor (byte&0x80)
//   output      = bitwise NOT of accumulator (no reflection, no xorout beyond inversion)

const POLY = 0x3d65;

function step(crc: number, byte: number): number {
  let c = crc & 0xffff;
  let b = byte & 0xff;
  for (let bit = 0; bit < 8; bit++) {
    const test = ((c & 0x8000) >>> 8) ^ (b & 0x80);
    if (test !== 0) {
      c = ((c << 1) & 0xffff) ^ POLY;
    } else {
      c = (c << 1) & 0xffff;
    }
    b = (b << 1) & 0xff;
  }
  return c;
}

/**
 * Compute CRC-16/EN-13757 over the given byte range.
 *
 * Offset+length must lie within `data`; passing `length === 0` yields
 * `0xFFFF` (the complement of the zero init).
 */
export function crc16En13757(data: Uint8Array, offset = 0, length = data.length - offset): number {
  if (offset < 0 || length < 0 || offset + length > data.length) {
    throw new RangeError(
      `crc16En13757 range out of bounds: offset=${offset} length=${length} data.length=${data.length}`,
    );
  }
  let crc = 0x0000;
  for (let i = 0; i < length; i++) {
    crc = step(crc, data[offset + i] as number);
  }
  return ~crc & 0xffff;
}
