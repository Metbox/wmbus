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
// Extended Link Layer (ELL) parser.
//
// Port of `Telegram::parseELL` (wmbus.cc:1013). The ELL variants supported:
//
//   CI   variant  layout
//   0x8C ELL I    CC, ACC                               (2 bytes header)
//   0x8D ELL II   CC, ACC, SN(4), PL-CRC(2)             (8 bytes header)
//                 → payload is AES-CTR-encrypted if the SN security bits say so
//   0x8E ELL III  CC, ACC, M2(2), A2(6)                 (10 bytes header — target addr)
//   0x8F ELL IV   CC, ACC, M2(2), A2(6), SN(4), PL-CRC(2) (16 bytes header)
//                 → like III + II
//
// 0x86 ELL V is variable-length and not yet implemented — upstream returns
// false in that case too.
//
// After parsing, if the SN security field says AES_CTR (mode 1), and a key
// is supplied, we decrypt the payload in place using `aes128Ctr` + the ELL
// IV built from M+A+CC+SN.

import { aes128Ctr, buildEllIv } from "../crypto/aes-ctr.js";
import { DecodeError } from "../util/errors.js";
import { decodeId } from "./address.js";
import { crc16En13757 } from "./crc.js";

// Bits 29-31 of the 32-bit SN field select the ELL security mode.
export enum EllSecurityMode {
  NoSecurity = 0,
  AesCtr = 1,
  Reserved = 2,
}

export interface EllResult {
  /** The CI byte that identified this as ELL (0x8C..0x8F). */
  ci: number;
  /** Control byte. */
  cc: number;
  /** Access counter. */
  acc: number;
  /** Target manufacturer — set by ELL III/IV only. */
  targetMfct: number | null;
  /** Target BCD id — set by ELL III/IV only. */
  targetId: string | null;
  /** Raw 4-byte target address (wire order) — ELL III/IV only. */
  targetAddress: Uint8Array | null;
  /** Target version byte — ELL III/IV only. */
  targetVersion: number | null;
  /** Target type byte — ELL III/IV only. */
  targetType: number | null;
  /** Session-number 32-bit field — ELL II/IV only. */
  sn: number | null;
  /** Raw 4-byte SN (wire order) — ELL II/IV only. Needed for CTR IV. */
  snBytes: Uint8Array | null;
  /** Security mode from SN bits 29-31 — ELL II/IV only. */
  securityMode: EllSecurityMode;
  /** Plaintext payload after optional CTR decryption. */
  plaintext: Uint8Array;
  /** True when ELL II/IV payload CRC matched the decrypted content. */
  payloadCrcOk: boolean | null;
  /** True when decryption was attempted but the PL-CRC check failed. */
  decryptionFailed: boolean;
  /** True when encryption was declared but no key was available. */
  missingKey: boolean;
}

/**
 * Parse an ELL-tagged payload. `dllMfctBytes` and `dllAddress` come from the
 * DLL layer and are used to build the AES-CTR IV for ELL II/IV variants.
 *
 * @throws DecodeError if the ELL variant is unknown or the payload is too short.
 */
export function parseEll(
  ci: number,
  payload: Uint8Array,
  dllMfctBytes: Uint8Array,
  dllAddress: Uint8Array,
  aesKey: Uint8Array | null = null,
): EllResult {
  if (payload.length < 2) {
    throw new DecodeError("ell", `payload too short for ELL (need CC+ACC, got ${payload.length})`);
  }

  const cc = payload[0] as number;
  const acc = payload[1] as number;
  let offset = 2;

  let hasTargetAddress = false;
  let hasSnAndCrc = false;
  switch (ci) {
    case 0x8c: // ELL I
      break;
    case 0x8d: // ELL II
      hasSnAndCrc = true;
      break;
    case 0x8e: // ELL III
      hasTargetAddress = true;
      break;
    case 0x8f: // ELL IV
      hasTargetAddress = true;
      hasSnAndCrc = true;
      break;
    case 0x86:
      throw new DecodeError("ell", "ELL V (variable length) not yet implemented");
    default:
      throw new DecodeError("ell", `not an ELL CI byte: 0x${ci.toString(16)}`);
  }

  let targetMfct: number | null = null;
  let targetAddress: Uint8Array | null = null;
  let targetId: string | null = null;
  let targetVersion: number | null = null;
  let targetType: number | null = null;

  if (hasTargetAddress) {
    if (payload.length < offset + 8) {
      throw new DecodeError("ell", `payload too short for ELL III/IV target address`);
    }
    targetMfct = ((payload[offset + 1] as number) << 8) | (payload[offset] as number);
    targetAddress = payload.slice(offset + 2, offset + 6);
    targetId = decodeId(targetAddress);
    targetVersion = payload[offset + 6] as number;
    targetType = payload[offset + 7] as number;
    offset += 8;
  }

  let sn: number | null = null;
  let snBytes: Uint8Array | null = null;
  let securityMode: EllSecurityMode = EllSecurityMode.NoSecurity;
  let plaintext: Uint8Array;
  let payloadCrcOk: boolean | null = null;
  let decryptionFailed = false;
  let missingKey = false;

  if (hasSnAndCrc) {
    if (payload.length < offset + 4) {
      throw new DecodeError("ell", `payload too short for ELL SN`);
    }
    snBytes = payload.slice(offset, offset + 4);
    sn =
      ((snBytes[3] as number) << 24) |
      ((snBytes[2] as number) << 16) |
      ((snBytes[1] as number) << 8) |
      (snBytes[0] as number);
    sn = sn >>> 0;
    const secField = (sn >>> 29) & 0x7;
    securityMode =
      secField === 1
        ? EllSecurityMode.AesCtr
        : secField === 0
          ? EllSecurityMode.NoSecurity
          : EllSecurityMode.Reserved;
    offset += 4;

    // The next 2 bytes are PL-CRC (payload CRC) — after potential decryption.
    // Anything beyond those is the true payload.
    let remaining: Uint8Array = payload.slice(offset);

    if (securityMode === EllSecurityMode.AesCtr && aesKey) {
      const iv = buildEllIv(dllMfctBytes, dllAddress, cc, snBytes);
      remaining = aes128Ctr(aesKey, iv, remaining);
    }
    // If AES_CTR but no key, we still try to read the body — some meters
    // (notably Kamstrup Multical21) set the AES_CTR SN flag but deliver
    // plaintext. The PL-CRC check below is authoritative: if it matches,
    // the body is valid regardless of the flag.

    if (remaining.length < 2) {
      throw new DecodeError("ell", `payload too short for ELL PL-CRC`);
    }
    const plCrcLe = ((remaining[1] as number) << 8) | (remaining[0] as number);
    const body = remaining.slice(2);
    const computed = crc16En13757(body);
    payloadCrcOk = plCrcLe === computed;
    plaintext = body;

    // Upstream marks the frame as decryption_failed when the PL-CRC doesn't
    // match and encryption was declared. If the CRC matches, the body is
    // good regardless of the AES_CTR flag (some meters set the flag but
    // send plaintext).
    if (securityMode === EllSecurityMode.AesCtr && !payloadCrcOk) {
      if (aesKey) {
        decryptionFailed = true;
      } else {
        missingKey = true;
      }
    }
  } else {
    plaintext = payload.slice(offset);
  }

  return {
    ci,
    cc,
    acc,
    targetMfct,
    targetId,
    targetAddress,
    targetVersion,
    targetType,
    sn,
    snBytes,
    securityMode,
    plaintext,
    payloadCrcOk,
    decryptionFailed,
    missingKey,
  };
}
