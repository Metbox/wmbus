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
// End-to-end decode pipeline: hex → plaintext DV bytes.
//
// Chains the layers in the order upstream does:
//
//   hex → link-layer.parseTelegram        (DLL)
//       → ell.parseEll (if CI is ELL)     (AES-CTR if SN says AES_CTR)
//       → afl passthrough (if CI is AFL)  (Phase 3 deferral: MAC not verified)
//       → tpl.parseTpl                    (Mode 0 / Mode 5, Mode 7 deferred)
//
// Output is an `AssembledTelegram` with the flattened address fields (taking
// TPL long-header and ELL III/IV target fields into account) plus the
// plaintext DV byte block to hand to the Phase 4 DIF/VIF parser.
//
// When decryption is required but fails (or no key provided), `plaintext` is
// null and `decryption.status` reports why. Downstream drivers convert that
// into the `timestamp = "1970-01-01T00:00:00Z"` sentinel that Metbox's retry-
// with-key flow depends on ([process-wmbus.ts:156 `isDecryptionBetter`]).

import { ciType, isAfl, isEll, isTpl } from "./ci.js";
import { DIEHL_OMS_DEFAULT_AES_KEY, shouldUseDiehlDefaultKey } from "./default-keys.js";
import { type EllResult, parseEll } from "./ell.js";
import { parseTelegram, parseTelegramBytes, type Telegram } from "./link-layer.js";
import { mediaType } from "./media.js";
import { parseTpl, type TplResult } from "./tpl.js";

export type DecryptionStatus =
  | "not-required" // No encryption on this telegram.
  | "ok" // Encryption recognised and decrypted successfully.
  | "missing-key" // Encryption declared but no key provided.
  | "wrong-key" // Key provided but post-decrypt marker or CRC failed.
  | "unsupported-mode"; // Security mode declared but not implemented (e.g. Mode 7).

export interface AssembledTelegram {
  /** The full DLL parse. */
  telegram: Telegram;
  /** ELL layer result, if present. */
  ell: EllResult | null;
  /** TPL layer result, if present. */
  tpl: TplResult | null;
  /** TPL status byte — 0 when no TPL header present. */
  tplStatus: number;
  /** Final decryption outcome. */
  decryption: {
    status: DecryptionStatus;
    /** True when decryption failed for any reason. */
    failed: boolean;
  };
  /**
   * Effective meter id — picks the deepest-layer address present. Priority:
   * TPL long header > ELL III/IV target > DLL.
   */
  effectiveId: string;
  /**
   * Effective manufacturer code, chosen the same way as `effectiveId`.
   */
  effectiveMfct: number;
  /** Effective device type byte. */
  effectiveType: number;
  /** Effective version byte. */
  effectiveVersion: number;
  /**
   * Effective JSON media string. Also follows TPL > ELL > DLL priority, so
   * drivers that put their "real" type in the inner layer get reported
   * correctly.
   */
  effectiveMedia: string;
  /**
   * Flattened plaintext byte stream (DVs) ready for the Phase-4 DIF/VIF
   * parser. Null when decryption was needed but couldn't complete.
   */
  plaintext: Uint8Array | null;
}

/** Decode a hex telegram. Convenience wrapper around `decodeBytes`. */
export function decodeTelegram(hex: string, aesKey: Uint8Array | null = null): AssembledTelegram {
  return decodeFromTelegram(parseTelegram(hex), aesKey);
}

/** Decode already-extracted bytes. */
export function decodeBytes(
  frame: Uint8Array,
  aesKey: Uint8Array | null = null,
): AssembledTelegram {
  return decodeFromTelegram(parseTelegramBytes(frame), aesKey);
}

function decodeFromTelegram(telegram: Telegram, aesKey: Uint8Array | null): AssembledTelegram {
  const { dll, ci, payload } = telegram;

  // Build the 6-byte DLL address (id 4 + ver 1 + type 1) that callers down
  // the pipeline need for IV construction. `dll.dllIdBytes` is already LE.
  const dllAddress = new Uint8Array(6);
  dllAddress.set(dll.dllIdBytes, 0);
  dllAddress[4] = dll.dllVersion;
  dllAddress[5] = dll.dllType;
  const dllMfctBytes = new Uint8Array([dll.dllMfct & 0xff, (dll.dllMfct >> 8) & 0xff]);

  let ell: EllResult | null = null;
  let currentCi = ci;
  let afterEllPayload = payload;

  // --- ELL layer (if applicable) -----------------------------------------
  if (isEll(ci)) {
    ell = parseEll(ci, payload, dllMfctBytes, dllAddress, aesKey);

    // If decryption failed or no key was supplied, propagate and stop.
    if (ell.decryptionFailed || ell.missingKey) {
      return assemble({
        telegram,
        ell,
        tpl: null,
        plaintext: null,
        decryptionStatus: ell.missingKey ? "missing-key" : "wrong-key",
      });
    }

    afterEllPayload = ell.plaintext;
    // After ELL the stream begins with a *fresh* CI byte for the next layer.
    if (afterEllPayload.length === 0) {
      return assemble({
        telegram,
        ell,
        tpl: null,
        plaintext: new Uint8Array(0),
        decryptionStatus: "not-required",
      });
    }
    currentCi = afterEllPayload[0] as number;
    afterEllPayload = afterEllPayload.slice(1);
  }

  // --- AFL layer (CI 0x90) — skip over the MAC/counter header ------------
  if (isAfl(currentCi)) {
    // First byte is AFL length (bytes after the length byte within AFL);
    // upstream's parseAFL walks AFL.FC and AFL.MC for sub-fields. Total
    // AFL header = 1 (CI = 0x90) + 1 (len) + <len> bytes. We skip past
    // the whole thing to reach the next layer's CI.
    if (afterEllPayload.length < 2) {
      return assemble({
        telegram,
        ell,
        tpl: null,
        plaintext: null,
        decryptionStatus: "unsupported-mode",
      });
    }
    const aflHeaderBytes = afterEllPayload[0] as number; // len field value
    const aflTotalSkip = 1 + aflHeaderBytes;
    if (afterEllPayload.length < aflTotalSkip + 1) {
      return assemble({
        telegram,
        ell,
        tpl: null,
        plaintext: null,
        decryptionStatus: "unsupported-mode",
      });
    }
    afterEllPayload = afterEllPayload.slice(aflTotalSkip);
    if (afterEllPayload.length === 0) {
      return assemble({
        telegram,
        ell,
        tpl: null,
        plaintext: new Uint8Array(0),
        decryptionStatus: "not-required",
      });
    }
    currentCi = afterEllPayload[0] as number;
    afterEllPayload = afterEllPayload.slice(1);
  }

  // --- TPL layer ---------------------------------------------------------
  if (!isTpl(currentCi)) {
    // Unknown next-layer CI — pass through as plaintext and let the driver
    // make sense of it. Some manufacturer-specific (0xA0..0xB7) blocks land
    // here today and are dealt with by a preprocessor (Phase 6).
    return assemble({
      telegram,
      ell,
      tpl: null,
      plaintext: afterEllPayload,
      decryptionStatus: "not-required",
      outerCi: currentCi,
    });
  }

  // Diehl OMS mode-5 telegrams can be decrypted with a hardcoded PRIOS key
  // when the caller didn't supply one — this is upstream's
  // `addDefaultManufacturerKeyIfAny()` hook. Only inject for short-TPL (CI
  // 0x7A) frames with enough header bytes; parseTpl will error on shorter.
  let effectiveAesKey = aesKey;
  if (effectiveAesKey === null && currentCi === 0x7a && afterEllPayload.length >= 4) {
    const cfgWord = (afterEllPayload[2] as number) | ((afterEllPayload[3] as number) << 8);
    if (
      shouldUseDiehlDefaultKey({
        manufacturer: telegram.dll.dllMfct,
        cField: telegram.dll.dllC,
        ci: currentCi,
        cfgWord,
      })
    ) {
      effectiveAesKey = DIEHL_OMS_DEFAULT_AES_KEY;
    }
  }

  const tpl = parseTpl(
    currentCi,
    afterEllPayload,
    { mfctBytes: dllMfctBytes, address: dllAddress },
    effectiveAesKey,
  );

  let decryptionStatus: DecryptionStatus;
  if (tpl.missingKey) {
    decryptionStatus = "missing-key";
  } else if (tpl.decryptionFailed) {
    decryptionStatus = tpl.securityMode === 7 ? "unsupported-mode" : "wrong-key";
  } else if (tpl.securityMode === 0) {
    // No security declared — plaintext as-is.
    decryptionStatus = "not-required";
  } else {
    // Encryption declared and cleared successfully (or the fixture carried
    // a pre-decrypted `2F 2F` payload).
    decryptionStatus = "ok";
  }

  return assemble({ telegram, ell, tpl, plaintext: tpl.plaintext, decryptionStatus });
}

interface AssembleArgs {
  telegram: Telegram;
  ell: EllResult | null;
  tpl: TplResult | null;
  plaintext: Uint8Array | null;
  decryptionStatus: DecryptionStatus;
  outerCi?: number;
}

function assemble(a: AssembleArgs): AssembledTelegram {
  const { telegram, ell, tpl, plaintext, decryptionStatus } = a;

  // Effective address: TPL long header wins, else ELL III/IV target, else DLL.
  let effectiveId = telegram.dll.dllId;
  let effectiveMfct = telegram.dll.dllMfct;
  let effectiveType = telegram.dll.dllType;
  let effectiveVersion = telegram.dll.dllVersion;

  if (
    ell?.targetId &&
    ell.targetMfct != null &&
    ell.targetType != null &&
    ell.targetVersion != null
  ) {
    effectiveId = ell.targetId;
    effectiveMfct = ell.targetMfct;
    effectiveType = ell.targetType;
    effectiveVersion = ell.targetVersion;
  }
  if (
    tpl?.headerKind === "long" &&
    tpl.tplId &&
    tpl.tplMfct != null &&
    tpl.tplType != null &&
    tpl.tplVersion != null
  ) {
    effectiveId = tpl.tplId;
    effectiveMfct = tpl.tplMfct;
    effectiveType = tpl.tplType;
    effectiveVersion = tpl.tplVersion;
  }

  const effectiveMedia = mediaType(effectiveType, effectiveMfct);

  return {
    telegram,
    ell,
    tpl,
    tplStatus: tpl?.tplStatus ?? 0,
    decryption: {
      status: decryptionStatus,
      failed: decryptionStatus !== "ok" && decryptionStatus !== "not-required",
    },
    effectiveId,
    effectiveMfct,
    effectiveType,
    effectiveVersion,
    effectiveMedia,
    plaintext,
  };
}

// Quieten "unused" warnings on the imported util until Phase 6 wires them in.
void ciType;
