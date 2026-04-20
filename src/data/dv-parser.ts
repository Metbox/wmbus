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
// DV (Data-Variable) tokenizer — ports the core loop of `parseDV` in
// dvparser.cc:168-700.
//
// Input:  the plaintext byte stream produced by the Phase-3 pipeline (after
//         all security layers have been stripped).
// Output: an ordered list of DVEntry records, plus a compound "difvif key"
//         per entry (uppercase hex of the entire DIF+DIFE+VIF+VIFE chain)
//         that drivers use for exact-match field selection.
//
// The tokenizer stops on:
//   - end of buffer
//   - DIF = 0x0F  (manufacturer-specific trailer)
//   - DIF = 0x1F  (more records in the next telegram)
//   - any DIF with unknown data-length classification (-2 return)
//
// DIF = 0x2F is "padding/skip" and is silently consumed.

import type { MeasurementType } from "../drivers/types.js";
import {
  readBcd,
  readDateTimeTypeF,
  readDateTimeTypeI,
  readDateTypeG,
  readHexString,
  readLeInt,
  readReadableString,
  readReal32,
} from "./decode-values.js";
import {
  type DifChain,
  type DifDataFieldKind,
  difDataKind,
  isBcdDataField,
  isReal32DataField,
  parseDifChain,
} from "./dif.js";
import { parseVifChain, type VifChain } from "./vif.js";

export interface DVEntry {
  /** Offset within the plaintext buffer where this entry's DIF started. */
  offset: number;
  /**
   * Canonical DIF/VIF hex key (uppercase, no separators) — the concatenation
   * of every byte in the DIF, DIFE chain, VIF, and VIFE chain. Used as an
   * exact-match driver key like `"02FF20"`.
   */
  difVifKey: string;
  /** Measurement type from DIF bits 4-5. */
  measurementType: MeasurementType;
  /** Primary VIF (possibly 16-bit for extension tables). */
  vif: number;
  /** Combinable VIFs attached to this record (raw integer values). */
  combinables: number[];
  /** Storage number accumulated across DIFE bytes. */
  storageNr: number;
  /** Tariff accumulated across DIFE bytes. */
  tariff: number;
  /** Subunit accumulated across DIFE bytes. */
  subunit: number;
  /**
   * Raw data bytes following the DIF/VIF chain. Length matches the DIF
   * format, or the variable-length header for variable records.
   */
  rawValue: Uint8Array;
  /** Convenience: what kind of data field the DIF specifies. */
  kind: DifDataFieldKind;

  // High-level decoded value helpers — nullable because callers may want to
  // handle specific fields themselves.

  /** Decoded numeric value (BCD / LE int / float32) — NaN for invalid BCDs. */
  asNumber: number | null;
  /** Decoded string — for BCD-as-number fields we return the integer-rendered form. */
  asString: string | null;
  /** Raw hex — for FabricationNo, ErrorFlags, manufacturer data. */
  asHex: string;
}

export interface DvParseResult {
  entries: DVEntry[];
  /** Remaining bytes we didn't consume (trailing manufacturer block, etc.). */
  trailing: Uint8Array;
  /** Number of bytes consumed from the input. */
  consumed: number;
  /**
   * Concatenated DIF+DIFE+VIF+VIFE bytes from every entry — the "format
   * bytes" that Kamstrup compact frames reference by hash. Empty for
   * compact-frame parses (`formatBytes` overrides) since upstream only
   * caches hashes derived from long-frame parses.
   */
  formatBytes: Uint8Array;
}

export interface ParseDvOptions {
  /** Absolute offset of `data[0]` within the original frame. Defaults to 0. */
  startOffset?: number;
  /**
   * Override the DIF/VIF chain source buffer. When present, the parser reads
   * DIF/VIF bytes from this buffer (at its own cursor) and data bytes from
   * `data`. Used by CI=0x79 compact frames where the format bytes come from
   * a previously-cached long-frame transmission.
   */
  formatBytes?: Uint8Array;
}

/**
 * Tokenize a plaintext payload into DVEntry records.
 *
 * @param data    The plaintext DV byte stream (post-decryption).
 * @param optsOrStart  Either a numeric `startOffset` (legacy positional arg)
 *                     or a `ParseDvOptions` object.
 */
export function parseDv(data: Uint8Array, optsOrStart: number | ParseDvOptions = 0): DvParseResult {
  const opts: ParseDvOptions =
    typeof optsOrStart === "number" ? { startOffset: optsOrStart } : optsOrStart;
  const startOffset = opts.startOffset ?? 0;
  const format: Uint8Array = opts.formatBytes ?? data;
  const compact = opts.formatBytes !== undefined;

  const entries: DVEntry[] = [];
  let fp = 0; // cursor into `format`
  let dp = 0; // cursor into `data` (same as fp when not compact)
  let trailingStart = data.length;
  const formatAccum: number[] = [];

  const end = compact ? format.length : data.length;

  while (compact ? fp < end : dp < end) {
    const difStart = compact ? dp : fp;
    if (fp >= format.length) break;
    const dif = format[fp] as number;

    // 0x2F — padding. Consume and continue.
    if (dif === 0x2f) {
      fp++;
      if (!compact) dp = fp;
      continue;
    }

    const dataKind = difDataKind(dif);

    // Stop markers / unknowns: 0x0F manufacturer-specific block, 0x1F "more
    // records in next telegram", or any unclassified DIF.
    if (dataKind === "Special") {
      trailingStart = compact ? dp : fp;
      break;
    }

    let difChain: DifChain;
    try {
      difChain = parseDifChain(format, fp);
    } catch {
      trailingStart = compact ? dp : fp;
      break;
    }
    const difFirstByte = format[fp] as number;
    for (let k = fp; k < difChain.endOffset; k++) formatAccum.push(format[k] as number);
    fp = difChain.endOffset;
    if (!compact) dp = fp;

    let vifChain: VifChain;
    try {
      vifChain = parseVifChain(format, fp);
    } catch {
      // Broken VIF chain — stop cleanly.
      trailingStart = difStart;
      break;
    }
    const vifFirstByte = format[fp] as number;
    for (let k = fp; k < vifChain.endOffset; k++) formatAccum.push(format[k] as number);
    fp = vifChain.endOffset;
    if (!compact) dp = fp;

    // Determine data length. Variable-length records use the next byte as
    // their length.
    let dataLen = difChain.datalen;
    if (dataLen === -1) {
      if (dp >= data.length) {
        trailingStart = difStart;
        break;
      }
      dataLen = data[dp] as number;
      dp++;
      if (!compact) fp = dp;
    }
    if (dataLen < 0) {
      trailingStart = difStart;
      break;
    }
    if (dp + dataLen > data.length) {
      trailingStart = difStart;
      break;
    }

    const rawValue = data.slice(dp, dp + dataLen);
    dp += dataLen;
    if (!compact) fp = dp;

    // Build the canonical key from all chain bytes, including the
    // variable-length VIF string (length byte + chars) so plain-text VIFs
    // (0x7C / 0xFC) produce unique keys like "81027C03495523" rather than
    // just "81027C".
    const varLen = vifChain.varLengthVif;
    const varBytes = varLen === null ? 0 : varLen.length + 1;
    const keyBytes = new Uint8Array(
      1 + difChain.difes.length + 1 + varBytes + vifChain.vifes.length,
    );
    let p = 0;
    keyBytes[p++] = difFirstByte;
    for (const d of difChain.difes) keyBytes[p++] = d;
    keyBytes[p++] = vifFirstByte;
    if (varLen !== null) {
      keyBytes[p++] = varLen.length;
      for (const b of varLen) keyBytes[p++] = b;
    }
    for (const v of vifChain.vifes) keyBytes[p++] = v;

    const difVifKey = upperHex(keyBytes);

    const entry: DVEntry = {
      offset: startOffset + difStart,
      difVifKey,
      measurementType: difChain.measurementType,
      vif: vifChain.vif,
      combinables: vifChain.combinables,
      storageNr: difChain.storageNr,
      tariff: difChain.tariff,
      subunit: difChain.subunit,
      rawValue,
      kind: dataKind,
      asNumber: decodeAsNumber(difFirstByte, vifChain.vif, rawValue),
      asString: decodeAsString(difFirstByte, vifChain.vif, rawValue),
      asHex: readHexString(rawValue),
    };
    entries.push(entry);
  }

  const consumed = compact ? dp : trailingStart;
  // For compact parses, the caller owns the trailing buffer; we report
  // whatever data bytes we didn't touch. For long-frame parses, `trailing`
  // is the block after the last DV entry (often the 0x0F mfct trailer).
  const trailing = compact ? data.slice(dp) : data.slice(trailingStart);
  return {
    entries,
    trailing,
    consumed,
    formatBytes: compact ? new Uint8Array(0) : new Uint8Array(formatAccum),
  };
}

/**
 * Decode a DVEntry's rawValue as a plain number where possible.
 *
 * - BCD → integer value of BCD digits (with sign flag support)
 * - Real32 → IEEE float
 * - Signed integer kinds → two's complement
 * - Unsigned integer kinds → straight LE
 * - Date / DateTime / text / variable → null (caller picks a decoder)
 */
function decodeAsNumber(dif: number, vif: number, rawValue: Uint8Array): number | null {
  if (rawValue.length === 0) return null;
  const kind = difDataKind(dif);

  if (isBcdDataField(dif)) {
    return readBcd(rawValue, rawValue.length);
  }
  if (isReal32DataField(dif)) {
    return readReal32(rawValue);
  }

  // Date / datetime VIFs — not numeric.
  if ((vif & 0x7f) === 0x6c || (vif & 0x7f) === 0x6d) return null;
  // Text VIFs (0x78, 0x79, extension 0x7D Medium/Manufacturer/etc).
  if ((vif & 0x7f) === 0x78 || (vif & 0x7f) === 0x79) return null;

  switch (kind) {
    case "Int8":
    case "Int16":
    case "Int24":
    case "Int32":
    case "Int48":
    case "Int64":
      return readLeInt(rawValue, rawValue.length);
    default:
      return null;
  }
}

/**
 * Decode a DVEntry's rawValue into a string where the kind / VIF points at a
 * string-typed value (dates, datetimes, manufacturer text, fabrication no).
 * Otherwise returns null.
 */
function decodeAsString(dif: number, vif: number, rawValue: Uint8Array): string | null {
  if (rawValue.length === 0) return null;
  const low = vif & 0x7f;
  const fullVif = vif & 0x7f7f;

  // Date type G (0x6C) — 2 bytes.
  if (low === 0x6c && rawValue.length >= 2) {
    return readDateTypeG(rawValue);
  }
  // DateTime type F (0x6D) — 4 bytes; Type I — 6 bytes with seconds.
  if (low === 0x6d) {
    if (rawValue.length >= 6) return readDateTimeTypeI(rawValue);
    if (rawValue.length >= 4) return readDateTimeTypeF(rawValue);
  }
  // Fabrication number (0x78) — BCD stored as ASCII.
  if (low === 0x78) {
    if (isBcdDataField(dif)) return bcdDigitString(rawValue);
    return readReadableString(rawValue, true);
  }
  // Enhanced identification (0x79) — same treatment.
  if (low === 0x79) {
    return isBcdDataField(dif) ? bcdDigitString(rawValue) : readReadableString(rawValue, true);
  }
  // 0x7D-extension text VIFs: software/firmware/hardware/model version,
  // location, customer, manufacturer, parameter set. All BCD-rendered.
  if (
    fullVif === 0x7d09 || // Medium
    fullVif === 0x7d0a || // Manufacturer
    fullVif === 0x7d0b || // ParameterSet
    fullVif === 0x7d0c || // ModelVersion
    fullVif === 0x7d0d || // HardwareVersion
    fullVif === 0x7d0e || // FirmwareVersion
    fullVif === 0x7d0f || // SoftwareVersion
    fullVif === 0x7d10 || // Location
    fullVif === 0x7d11 // Customer
  ) {
    if (isBcdDataField(dif)) return bcdDigitString(rawValue);
    return readReadableString(rawValue, true);
  }
  return null;
}

/** Render BCD bytes as an integer-like digit string, preserving leading zeros. */
function bcdDigitString(rawValue: Uint8Array): string {
  let out = "";
  for (let i = rawValue.length - 1; i >= 0; i--) {
    const byte = rawValue[i] as number;
    out += ((byte >>> 4) & 0x0f).toString(16);
    out += (byte & 0x0f).toString(16);
  }
  return out.toUpperCase();
}

function upperHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    out += b.toString(16).padStart(2, "0").toUpperCase();
  }
  return out;
}
