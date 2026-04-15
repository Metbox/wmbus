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
}

/**
 * Tokenize a plaintext payload into DVEntry records.
 *
 * @param data    The plaintext DV byte stream (post-decryption).
 * @param startOffset  Absolute offset of `data[0]` within the original
 *                     frame, used so DVEntry.offset is frame-absolute.
 */
export function parseDv(data: Uint8Array, startOffset = 0): DvParseResult {
  const entries: DVEntry[] = [];
  let i = 0;
  let trailingStart = data.length;

  while (i < data.length) {
    const difStart = i;
    const dif = data[i] as number;

    // 0x2F — padding. Consume and continue.
    if (dif === 0x2f) {
      i += 1;
      continue;
    }

    const dataKind = difDataKind(dif);

    // Stop markers / unknowns: 0x0F manufacturer-specific block, 0x1F "more
    // records in next telegram", or any unclassified DIF.
    if (dataKind === "Special") {
      trailingStart = i;
      break;
    }

    let difChain: DifChain;
    try {
      difChain = parseDifChain(data, i);
    } catch {
      trailingStart = i;
      break;
    }
    i = difChain.endOffset;

    let vifChain: VifChain;
    try {
      vifChain = parseVifChain(data, i);
    } catch {
      // Broken VIF chain — stop cleanly.
      trailingStart = difStart;
      break;
    }
    i = vifChain.endOffset;

    // Determine data length. Variable-length records use the next byte as
    // their length. Anything with datalen < 0 that wasn't caught above is
    // an unknown special function; bail.
    let dataLen = difChain.datalen;
    if (dataLen === -1) {
      if (i >= data.length) {
        trailingStart = difStart;
        break;
      }
      dataLen = data[i] as number;
      i++;
    }
    if (dataLen < 0) {
      trailingStart = difStart;
      break;
    }
    if (i + dataLen > data.length) {
      trailingStart = difStart;
      break;
    }

    const rawValue = data.slice(i, i + dataLen);
    i += dataLen;

    // Build the canonical key from all chain bytes.
    const keyBytes = new Uint8Array(1 + difChain.difes.length + 1 + vifChain.vifes.length);
    let p = 0;
    keyBytes[p++] = dif;
    for (const d of difChain.difes) keyBytes[p++] = d;
    keyBytes[p++] = data[difChain.endOffset] as number;
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
      asNumber: decodeAsNumber(dif, vifChain.vif, rawValue),
      asString: decodeAsString(dif, vifChain.vif, rawValue),
      asHex: readHexString(rawValue),
    };
    entries.push(entry);
  }

  return {
    entries,
    trailing: data.slice(trailingStart),
    consumed: trailingStart,
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

  // Date type G (0x6C) — 2 bytes.
  if (low === 0x6c && rawValue.length >= 2) {
    return readDateTypeG(rawValue);
  }
  // DateTime type F (0x6D) — 4 bytes.
  if (low === 0x6d && rawValue.length >= 4) {
    return readDateTimeTypeF(rawValue);
  }
  // Fabrication number (0x78) — BCD stored as ASCII.
  if (low === 0x78) {
    // BCD rendered as digits (reversed because BCD is LE-nibble).
    if (isBcdDataField(dif)) {
      return bcdDigitString(rawValue);
    }
    return readReadableString(rawValue, true);
  }
  // Enhanced identification (0x79) — same treatment.
  if (low === 0x79) {
    return isBcdDataField(dif) ? bcdDigitString(rawValue) : readReadableString(rawValue, true);
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
