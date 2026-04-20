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
// DIF (Data Information Field) decoding.
//
// Port of difLenBytes / difMeasurementType from wmbus.cc:2436 + 2507.
//
// The DIF byte layout:
//
//   bit  7    extension (another DIFE follows)
//   bit  6    LSB of storage number
//   bits 4-5  function type (Instantaneous / Max / Min / AtError)
//   bits 0-3  data field type (int length, BCD length, real, variable, special)
//
// DIFE byte layout:
//
//   bit  7    extension (another DIFE follows)
//   bit  6    subunit bit (combined across DIFEs)
//   bits 4-5  tariff bits (2 per DIFE)
//   bits 0-3  4 more bits of storage number per DIFE

import type { MeasurementType } from "../drivers/types.js";

export type DifDataFieldKind =
  | "NoData" // 0x0
  | "Int8" // 0x1
  | "Int16" // 0x2
  | "Int24" // 0x3
  | "Int32" // 0x4
  | "Real32" // 0x5
  | "Int48" // 0x6
  | "Int64" // 0x7
  | "SelectionForReadout" // 0x8
  | "Bcd2" // 0x9 — 2-digit BCD, 1 byte
  | "Bcd4" // 0xA — 4-digit BCD, 2 bytes
  | "Bcd6" // 0xB — 6-digit BCD, 3 bytes
  | "Bcd8" // 0xC — 8-digit BCD, 4 bytes
  | "Variable" // 0xD — length determined by first data byte
  | "Bcd12" // 0xE — 12-digit BCD, 6 bytes
  | "Special"; // 0xF — skip (0x2F), manufacturer-specific (0x0F), more-records (0x1F)

/**
 * Number of data bytes that follow the DIF/VIF chain.
 *
 * Returns -1 for variable-length records (length is encoded in the first
 * data byte). Returns -2 for unknown / stop markers — the parser handles
 * those by stopping the record loop.
 */
export function difLengthBytes(dif: number): number {
  const t = dif & 0x0f;
  switch (t) {
    case 0x0:
      return 0;
    case 0x1:
      return 1;
    case 0x2:
      return 2;
    case 0x3:
      return 3;
    case 0x4:
      return 4;
    case 0x5:
      return 4; // 32-bit real
    case 0x6:
      return 6;
    case 0x7:
      return 8;
    case 0x8:
      return 0;
    case 0x9:
      return 1;
    case 0xa:
      return 2;
    case 0xb:
      return 3;
    case 0xc:
      return 4;
    case 0xd:
      return -1;
    case 0xe:
      return 6;
    case 0xf:
      return dif === 0x2f ? 1 : -2;
    default:
      return -2;
  }
}

/** Classify the DIF data field kind (for downstream decoders). */
export function difDataKind(dif: number): DifDataFieldKind {
  switch (dif & 0x0f) {
    case 0x0:
      return "NoData";
    case 0x1:
      return "Int8";
    case 0x2:
      return "Int16";
    case 0x3:
      return "Int24";
    case 0x4:
      return "Int32";
    case 0x5:
      return "Real32";
    case 0x6:
      return "Int48";
    case 0x7:
      return "Int64";
    case 0x8:
      return "SelectionForReadout";
    case 0x9:
      return "Bcd2";
    case 0xa:
      return "Bcd4";
    case 0xb:
      return "Bcd6";
    case 0xc:
      return "Bcd8";
    case 0xd:
      return "Variable";
    case 0xe:
      return "Bcd12";
    case 0xf:
      return "Special";
    default:
      return "Special";
  }
}

/** DIF function-type bits 4-5 → measurement type. */
export function difMeasurementType(dif: number): MeasurementType {
  switch (dif & 0x30) {
    case 0x00:
      return "Instantaneous";
    case 0x10:
      return "Maximum";
    case 0x20:
      return "Minimum";
    case 0x30:
      return "AtError";
    default:
      return "Any";
  }
}

/** Is this a data field that uses BCD encoding? */
export function isBcdDataField(dif: number): boolean {
  const t = dif & 0x0f;
  return t === 0x9 || t === 0xa || t === 0xb || t === 0xc || t === 0xe;
}

/** Is this a 32-bit real (IEEE 754) field? */
export function isReal32DataField(dif: number): boolean {
  return (dif & 0x0f) === 0x5;
}

/**
 * Parsed DIF + DIFE chain.
 *
 * `subunit`, `tariff`, `storageNr` are accumulated by shifting DIFE bits into
 * the right places (see parseDifChain for the exact layout).
 */
export interface DifChain {
  /** The initial DIF byte. */
  dif: number;
  /** All DIFE bytes after it (if any). */
  difes: Uint8Array;
  /** MeasurementType from the DIF function-type bits. */
  measurementType: MeasurementType;
  /** Storage number (LSB from DIF bit 6, plus 4 bits per DIFE). */
  storageNr: number;
  /** Tariff number (2 bits per DIFE). */
  tariff: number;
  /** Subunit (1 bit per DIFE). */
  subunit: number;
  /** Number of data bytes to consume. -1 = variable, -2 = stop/special. */
  datalen: number;
  /** Position after the DIF+DIFE chain (absolute index into the source buffer). */
  endOffset: number;
}

/**
 * Parse the DIF + optional DIFE chain starting at `offset` in `data`.
 *
 * Throws on truncation if the chain is incomplete (MSB set on a DIFE but no
 * following byte). Upstream is more permissive — we match upstream by
 * capping the chain length at 10 DIFEs (`num_dife > 10` check in dvparser.cc:347).
 */
export function parseDifChain(data: Uint8Array, offset: number): DifChain {
  if (offset >= data.length) {
    throw new Error(`DIF chain: offset ${offset} past end of buffer (len=${data.length})`);
  }
  const dif = data[offset] as number;
  const datalen = difLengthBytes(dif);
  const measurementType = difMeasurementType(dif);

  // Storage LSB sits at DIF bit 6.
  let storageNr = (dif & 0x40) >>> 6;
  let tariff = 0;
  let subunit = 0;

  const difes: number[] = [];
  let i = offset + 1;
  let hasMore = (dif & 0x80) === 0x80;
  let difenr = 0;

  while (hasMore) {
    if (difenr >= 10) {
      // Upstream bails out after 10 — match that cap.
      break;
    }
    if (i >= data.length) {
      // Unexpected truncation — match upstream's tolerance by stopping here.
      hasMore = false;
      break;
    }
    const dife = data[i] as number;
    difes.push(dife);

    const subunitBit = (dife & 0x40) >>> 6;
    subunit |= subunitBit << difenr;
    const tariffBits = (dife & 0x30) >>> 4;
    tariff |= tariffBits << (difenr * 2);
    const storageBits = dife & 0x0f;
    storageNr |= storageBits << (1 + difenr * 4);

    i++;
    difenr++;
    hasMore = (dife & 0x80) === 0x80;
  }

  return {
    dif,
    difes: new Uint8Array(difes),
    measurementType,
    storageNr,
    tariff,
    subunit,
    datalen,
    endOffset: i,
  };
}
