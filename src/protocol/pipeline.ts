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
    // AFL is variable-length (per AFL.MCL bits). Phase 3 passes it through:
    // we assume a plain 10-byte AFL header (MCL + MCR + payload-CI + SN + MAC)
    // which matches the common case. Upstream's parseAFL handles more shapes
    // — full port lands when Mode 7 support arrives.
    if (afterEllPayload.length < 11) {
      return assemble({
        telegram,
        ell,
        tpl: null,
        plaintext: null,
        decryptionStatus: "unsupported-mode",
      });
    }
    // Treat the byte at offset 10 as the next-layer CI; shift past the
    // 10-byte AFL header.
    afterEllPayload = afterEllPayload.slice(10);
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

  const tpl = parseTpl(
    currentCi,
    afterEllPayload,
    { mfctBytes: dllMfctBytes, address: dllAddress },
    aesKey,
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
