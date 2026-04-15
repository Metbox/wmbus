// Data Link Layer (DLL) parsing for wM-Bus telegrams.
//
// Port of `Telegram::parseDLL` (wmbus.cc:951). The DLL occupies the first 11
// bytes of a CRC-stripped frame:
//
//   offset  bytes  field
//   ------  -----  ------------------------------------------------
//   0       1      L-field   — length of everything after the L-byte (L = total-1)
//   1       1      C-field   — dll_c, control byte (0x44 = SND-NR most common)
//   2       2      M-field   — dll_mfct, LE manufacturer code
//   4       4      A-field   — device id (LE on wire; BCD-decoded for display)
//   8       1      version   — dll_version
//   9       1      type      — dll_type (device/media type)
//  10       1      CI-field  — dispatches to ELL / NWL / AFL / TPL / …
//  11+     …       payload   — everything that follows
//
// CRC handling (the per-block 2-byte CRC16 chunks interleaved at offsets 10,
// 28, 46, …) is done earlier in the pipeline by the Format-A/B trimmer. The
// telegrams in `test/fixtures/upstream.json` are already trimmed — this
// parser is the first stage they hit.

import { DecodeError } from "../util/errors.js";
import { bytesToHex, hexToBytes } from "../util/hex.js";
import { decodeId } from "./address.js";
import { mediaType } from "./media.js";

export interface DllFields {
  /** Length byte (L-field). `length` = L + 1 — total bytes of the frame. */
  dllLen: number;
  /** Control byte (C-field). */
  dllC: number;
  /** Manufacturer code, 16-bit little-endian on the wire. */
  dllMfct: number;
  /** BCD-decoded id (display form — reversed bytes). */
  dllId: string;
  /** The raw 4-byte wire id (LE, so last byte displayed is first on the wire). */
  dllIdBytes: Uint8Array;
  /** Version byte. */
  dllVersion: number;
  /** Device type byte (T-field). */
  dllType: number;
}

export interface Telegram {
  /** The full decoded frame — exactly what went in, minus non-hex chars. */
  frame: Uint8Array;
  /** DLL-level header fields. */
  dll: DllFields;
  /** CI-field byte at offset 10. Tells the next layer whether to dispatch to ELL/NWL/AFL/TPL. */
  ci: number;
  /** Human-readable media string resolved via `mediaTypeJSON`. */
  media: string;
  /** Payload starting immediately after the CI-field. */
  payload: Uint8Array;
}

const DLL_HEADER_SIZE = 11;

/**
 * Parse the DLL header out of a hex telegram. Non-hex characters (spaces,
 * underscores, pipes) are tolerated so we accept both wire-format hex and
 * the `|AA_BB|` notation upstream uses in its source fixtures.
 */
export function parseTelegram(hex: string): Telegram {
  const frame = hexToBytes(hex);
  return parseTelegramBytes(frame);
}

/** Variant that takes already-decoded bytes. */
export function parseTelegramBytes(frame: Uint8Array): Telegram {
  if (frame.length < DLL_HEADER_SIZE) {
    throw new DecodeError(
      "link-layer",
      `frame too short — need at least ${DLL_HEADER_SIZE} bytes, got ${frame.length}`,
      { frame },
    );
  }

  const dllLen = frame[0] as number;
  // The L-field counts everything after the L-byte itself. Upstream is
  // forgiving when the frame is longer than L+1 bytes (trimmer trailing
  // garbage); match that by warning only, not throwing.
  const expected = dllLen + 1;
  if (frame.length < expected) {
    throw new DecodeError(
      "link-layer",
      `frame truncated — L says ${expected} bytes but got ${frame.length}`,
      { frame, offset: 0 },
    );
  }

  const dllC = frame[1] as number;
  const dllMfct = ((frame[3] as number) << 8) | (frame[2] as number);
  const dllIdBytes = frame.slice(4, 8);
  const dllVersion = frame[8] as number;
  const dllType = frame[9] as number;
  const ci = frame[10] as number;
  const payload = frame.slice(11, expected);

  return {
    frame,
    dll: {
      dllLen,
      dllC,
      dllMfct,
      dllId: decodeId(dllIdBytes),
      dllIdBytes,
      dllVersion,
      dllType,
    },
    ci,
    media: mediaType(dllType, dllMfct),
    payload,
  };
}

/** Debug helper: render a Telegram as a one-line summary. */
export function summarise(tg: Telegram): string {
  const { dll, ci, payload } = tg;
  return [
    `L=${dll.dllLen}`,
    `C=0x${dll.dllC.toString(16).padStart(2, "0")}`,
    `mfct=0x${dll.dllMfct.toString(16).padStart(4, "0")}`,
    `id=${dll.dllId}`,
    `ver=0x${dll.dllVersion.toString(16).padStart(2, "0")}`,
    `type=0x${dll.dllType.toString(16).padStart(2, "0")}`,
    `ci=0x${ci.toString(16).padStart(2, "0")}`,
    `payload=${payload.length}b`,
  ].join(" ");
}

/** Re-emit the DLL header + payload as a hex string (useful for tests). */
export function telegramHex(tg: Telegram): string {
  return bytesToHex(tg.frame);
}
