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
// Transport Payload Layer (TPL) parser + security mode dispatch.
//
// Port of the relevant pieces of wmbus.cc's parseLongTPL / parseShortTPL /
// parseTPLConfig / potentiallyDecrypt routines. Scope for Phase 3:
//   - No header      (CI 0x78, 0x79, 0x51) — plaintext passthrough
//   - Short header   (CI 0x7A) — ACC + STS + CFG(2) = 4 bytes, optional
//                    AES-CBC-IV decryption (security mode 5)
//   - Long header    (CI 0x72) — 8-byte target address + short header = 12 bytes
//
// Mode 7 (AES_CBC_NO_IV + KDF via CMAC + AFL MAC verification) is stubbed:
// we recognise the mode and return `encrypted=true, plaintext=null`, letting
// the pipeline emit the epoch-timestamp sentinel. Full Mode 7 lands in a
// follow-up once the core drivers are in (very few fixtures actually use it).

import { aes128CbcDecrypt, buildMode5Iv, buildMode7Iv } from "../crypto/aes-cbc.js";
import { DecodeError } from "../util/errors.js";
import { decodeId } from "./address.js";

export enum TplSecurityMode {
  NoSecurity = 0,
  AesCbcIv = 5, // Mode 5
  AesCbcNoIv = 7, // Mode 7
}

export type TplHeaderKind = "none" | "short" | "long";

export interface TplResult {
  /** The CI byte that identified this as TPL. */
  ci: number;
  /** Which header shape was present. */
  headerKind: TplHeaderKind;
  /** Long-header id (reversed BCD form), or null for short/no headers. */
  tplId: string | null;
  /** Raw 4-byte long-header address (wire order) — or null. */
  tplAddress: Uint8Array | null;
  /** Long-header manufacturer code — or null. */
  tplMfct: number | null;
  /** Long-header version byte — or null. */
  tplVersion: number | null;
  /** Long-header type byte — or null. */
  tplType: number | null;
  /** Short/long-header ACC byte — or null if no-header variant. */
  tplAcc: number | null;
  /** Short/long-header STS byte — or null. */
  tplStatus: number | null;
  /** CFG word (CFG[1] << 8 | CFG[0]) — or null. */
  tplCfg: number | null;
  /** Detected security mode. NoSecurity when no CFG is present. */
  securityMode: TplSecurityMode;
  /** Number of encrypted 16-byte blocks declared by CFG, or 0. */
  numEncryptedBlocks: number;
  /**
   * Final plaintext — the bytes that follow the TPL header after any
   * decryption. `null` when decryption was needed but failed (no key, wrong
   * key, unsupported mode). Callers should emit the epoch sentinel in that
   * case so downstream behaviour matches upstream.
   */
  plaintext: Uint8Array | null;
  /** True when decryption was attempted and produced a failure. */
  decryptionFailed: boolean;
  /** True when decryption was needed but no key was available. */
  missingKey: boolean;
  /**
   * Effective address used for Mode-5 IV assembly (tpl address if long
   * header, else DLL address). Exposed for debugging / future refactoring.
   */
  effectiveMfctBytes: Uint8Array;
  effectiveAddress: Uint8Array;
}

interface DllContext {
  mfctBytes: Uint8Array; // 2 bytes wire LE
  address: Uint8Array; // 6 bytes (id 4 + ver 1 + type 1)
}

/**
 * Parse a TPL-tagged payload and — if a key is available — decrypt it.
 *
 * @param ci           The CI byte (0x72/0x78/0x79/0x7A/0x51).
 * @param payload      Bytes after the CI byte.
 * @param dll          Manufacturer + address from the DLL (needed for Mode 5 IV).
 * @param aesKey       16-byte AES key, or null for NOKEY mode.
 */
export function parseTpl(
  ci: number,
  payload: Uint8Array,
  dll: DllContext,
  aesKey: Uint8Array | null = null,
): TplResult {
  const base: Pick<TplResult, "ci" | "effectiveMfctBytes" | "effectiveAddress"> = {
    ci,
    effectiveMfctBytes: dll.mfctBytes,
    effectiveAddress: dll.address,
  };

  let offset = 0;
  let headerKind: TplHeaderKind;
  let tplId: string | null = null;
  let tplAddress: Uint8Array | null = null;
  let tplMfct: number | null = null;
  let tplVersion: number | null = null;
  let tplType: number | null = null;

  if (ci === 0x72) {
    // Long header: id(4) + mfct(2) + ver(1) + type(1) + acc(1) + sts(1) + cfg(2)
    headerKind = "long";
    if (payload.length < 12) {
      throw new DecodeError("tpl", `long TPL header requires 12 bytes (got ${payload.length})`);
    }
    tplAddress = payload.slice(0, 4);
    tplId = decodeId(tplAddress);
    tplMfct = ((payload[5] as number) << 8) | (payload[4] as number);
    tplVersion = payload[6] as number;
    tplType = payload[7] as number;
    offset = 8;
    // Long header's M+A override the DLL for Mode-5 IV assembly.
    const fullAddress = new Uint8Array(6);
    fullAddress.set(payload.slice(0, 4), 0);
    fullAddress[4] = tplVersion;
    fullAddress[5] = tplType;
    base.effectiveMfctBytes = payload.slice(4, 6);
    base.effectiveAddress = fullAddress;
  } else if (ci === 0x7a) {
    // Short header: acc(1) + sts(1) + cfg(2) = 4 bytes.
    headerKind = "short";
    if (payload.length < 4) {
      throw new DecodeError("tpl", `short TPL header requires 4 bytes (got ${payload.length})`);
    }
  } else if (
    ci === 0x78 ||
    ci === 0x79 ||
    ci === 0x51 ||
    (ci >= 0xa0 && ci <= 0xb7) // Mfct-specific (Techem Compact V, fhkvdataiii, …)
  ) {
    // No header — payload is plaintext as-is.
    return {
      ...base,
      headerKind: "none",
      tplId: null,
      tplAddress: null,
      tplMfct: null,
      tplVersion: null,
      tplType: null,
      tplAcc: null,
      tplStatus: null,
      tplCfg: null,
      securityMode: TplSecurityMode.NoSecurity,
      numEncryptedBlocks: 0,
      plaintext: payload,
      decryptionFailed: false,
      missingKey: false,
    };
  } else {
    throw new DecodeError("tpl", `unsupported TPL CI byte: 0x${ci.toString(16)}`);
  }

  // Short-header fields (also present at the tail of a long header).
  const tplAcc = payload[offset] as number;
  const tplStatus = payload[offset + 1] as number;
  const tplCfg = ((payload[offset + 3] as number) << 8) | (payload[offset + 2] as number);
  offset += 4;

  // Security mode from CFG bits 8..12 (wmbus.cc:1359).
  const modeBits = (tplCfg >> 8) & 0x1f;
  let securityMode: TplSecurityMode;
  if (modeBits === 5) securityMode = TplSecurityMode.AesCbcIv;
  else if (modeBits === 7) securityMode = TplSecurityMode.AesCbcNoIv;
  else if (modeBits === 0) securityMode = TplSecurityMode.NoSecurity;
  else securityMode = TplSecurityMode.NoSecurity; // Other modes: treat as plaintext for now.

  // Number of encrypted 16-byte blocks from CFG bits 4..7.
  const numEncryptedBlocks =
    securityMode === TplSecurityMode.AesCbcIv || securityMode === TplSecurityMode.AesCbcNoIv
      ? (tplCfg >> 4) & 0x0f
      : 0;

  // Mode 7 adds a 1-byte CFG extension (KDF selector) after the main CFG.
  if (securityMode === TplSecurityMode.AesCbcNoIv && payload.length > offset) {
    offset += 1;
  }

  const remaining = payload.slice(offset);
  const decryptResult = runSecurityMode({
    securityMode,
    remaining,
    numEncryptedBlocks,
    aesKey,
    effectiveMfctBytes: base.effectiveMfctBytes,
    effectiveAddress: base.effectiveAddress,
    acc: tplAcc,
  });

  return {
    ...base,
    headerKind,
    tplId,
    tplAddress,
    tplMfct,
    tplVersion,
    tplType,
    tplAcc,
    tplStatus,
    tplCfg,
    securityMode,
    numEncryptedBlocks,
    ...decryptResult,
  };
}

interface SecurityInput {
  securityMode: TplSecurityMode;
  remaining: Uint8Array;
  numEncryptedBlocks: number;
  aesKey: Uint8Array | null;
  effectiveMfctBytes: Uint8Array;
  effectiveAddress: Uint8Array;
  acc: number;
}

interface SecurityOutput {
  plaintext: Uint8Array | null;
  decryptionFailed: boolean;
  missingKey: boolean;
}

function runSecurityMode(input: SecurityInput): SecurityOutput {
  const { securityMode, remaining, numEncryptedBlocks, aesKey } = input;

  if (securityMode === TplSecurityMode.NoSecurity) {
    return { plaintext: remaining, decryptionFailed: false, missingKey: false };
  }

  if (securityMode === TplSecurityMode.AesCbcIv) {
    return runMode5(input);
  }

  if (securityMode === TplSecurityMode.AesCbcNoIv) {
    // Mode 7 (KDF-derived key + AFL MAC verification) is deferred. Short-
    // circuit with the "couldn't decrypt" path so callers emit the epoch
    // sentinel exactly as upstream does when given no AFL/KDF support.
    // Upstream also returns a usable plaintext in some already-decrypted
    // replay-telegram cases — those start with `2F 2F` and we accept them
    // as pre-decrypted.
    if (isAlreadyDecrypted(remaining)) {
      return { plaintext: remaining.slice(2), decryptionFailed: false, missingKey: false };
    }
    return { plaintext: null, decryptionFailed: true, missingKey: aesKey == null };
  }

  // Any other mode: treat as passthrough plaintext. Upstream warns but
  // continues; we do the same.
  void numEncryptedBlocks;
  return { plaintext: remaining, decryptionFailed: false, missingKey: false };
}

function runMode5(input: SecurityInput): SecurityOutput {
  const { remaining, numEncryptedBlocks, aesKey, effectiveMfctBytes, effectiveAddress, acc } =
    input;

  // The "already decrypted" case (replay telegrams) starts with `2F 2F`.
  if (isAlreadyDecrypted(remaining)) {
    return {
      plaintext: remaining.slice(2),
      decryptionFailed: false,
      missingKey: false,
    };
  }

  if (!aesKey) {
    return { plaintext: null, decryptionFailed: false, missingKey: true };
  }

  // Number of bytes to decrypt: either the CFG-declared block count, or
  // everything we've got. Round down to the nearest 16-byte boundary.
  let bytesToDecrypt =
    numEncryptedBlocks > 0 ? numEncryptedBlocks * 16 : remaining.length - (remaining.length % 16);
  if (bytesToDecrypt > remaining.length)
    bytesToDecrypt = remaining.length - (remaining.length % 16);
  if (bytesToDecrypt < 16) {
    return { plaintext: null, decryptionFailed: true, missingKey: false };
  }

  const iv = buildMode5Iv(effectiveMfctBytes.slice(0, 2), effectiveAddress.slice(0, 6), acc);

  let decrypted: Uint8Array;
  try {
    decrypted = aes128CbcDecrypt(aesKey, iv, remaining.slice(0, bytesToDecrypt));
  } catch {
    return { plaintext: null, decryptionFailed: true, missingKey: false };
  }

  if (!isAlreadyDecrypted(decrypted)) {
    // Decryption succeeded cryptographically but the 2F2F marker is missing —
    // wrong key (or corrupt frame).
    return { plaintext: null, decryptionFailed: true, missingKey: false };
  }

  // Drop the 2F2F marker, append any trailing un-encrypted bytes.
  const cleartext = decrypted.slice(2);
  const trailing = remaining.slice(bytesToDecrypt);
  if (trailing.length === 0) {
    return { plaintext: cleartext, decryptionFailed: false, missingKey: false };
  }
  const merged = new Uint8Array(cleartext.length + trailing.length);
  merged.set(cleartext, 0);
  merged.set(trailing, cleartext.length);
  return { plaintext: merged, decryptionFailed: false, missingKey: false };
}

function isAlreadyDecrypted(buf: Uint8Array): boolean {
  return buf.length >= 2 && buf[0] === 0x2f && buf[1] === 0x2f;
}

// Mode 7 helper exported for future expansion — kept private for now so
// callers don't depend on partial implementation.
export function _unused_buildMode7Iv(): Uint8Array {
  return buildMode7Iv();
}
