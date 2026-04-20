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
  // Wired M-Bus long-frame detection: 68 LL LL 68 ... CS 16.
  // Translate into a synthetic wM-Bus-compatible layout so the rest of the
  // pipeline doesn't need to care about the wire type.
  if (frame.length >= 6 && frame[0] === 0x68 && frame[3] === 0x68 && frame[1] === frame[2]) {
    return parseMBusTelegram(frame);
  }

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
  // Use the entire remaining frame as payload — upstream doesn't truncate at
  // L+1 either, and several test fixtures rely on trailing bytes (qcaloric
  // HCA's DateTime field, a few qheat variants). When the wire really has L+1
  // bytes, slice() to the end is identical anyway.
  const payload = frame.slice(11);
  void expected;

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

/**
 * Parse a wired M-Bus long frame:
 *
 *   68 LL LL 68 C A CI <TPL+data> CS 16
 *
 * The DLL header layout differs from wireless wM-Bus, so we normalise the
 * fields we can (the mfct/id/version/type come from the short TPL header
 * that follows CI=0x72, if present) and synthesise a Telegram that the
 * downstream TPL parser can drive.
 */
function parseMBusTelegram(frame: Uint8Array): Telegram {
  const dllLen = frame[1] as number;
  const expectedTotal = dllLen + 6; // 68 LL LL 68 ... CS 16
  if (frame.length < expectedTotal) {
    throw new DecodeError(
      "link-layer",
      `mbus frame truncated — L says ${dllLen} bytes of data but frame length is ${frame.length}`,
      { frame, offset: 0 },
    );
  }
  if (frame[frame.length - 1] !== 0x16) {
    throw new DecodeError(
      "link-layer",
      `mbus frame missing 0x16 stop byte (got 0x${(frame[frame.length - 1] as number).toString(16)})`,
      { frame },
    );
  }

  // Strip 68 LL LL 68 prefix and CS 16 suffix.
  const body = frame.subarray(4, frame.length - 2);
  if (body.length < 3) {
    throw new DecodeError("link-layer", "mbus body too short to hold C/A/CI", { frame });
  }

  const dllC = body[0] as number;
  const _mbusAddr = body[1] as number; // primary address, not used downstream
  void _mbusAddr;
  const ci = body[2] as number;

  // Long TPL header (CI 0x72): 4-byte id + 2-byte mfct + version + type then
  // ACC/STS/CFG. Extract the address block so downstream media resolution
  // uses the TPL-level identity rather than a synthetic MBUS primary.
  let dllMfct = 0;
  let dllIdBytes: Uint8Array = new Uint8Array(4);
  let dllVersion = 0;
  let dllType = 0;
  if (ci === 0x72 && body.length >= 3 + 8) {
    dllIdBytes = body.slice(3, 7);
    dllMfct = ((body[8] as number) << 8) | (body[7] as number);
    dllVersion = body[9] as number;
    dllType = body[10] as number;
  }

  const payload = body.slice(3);

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
