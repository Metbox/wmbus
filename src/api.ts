// Public API surface — drop-in replacement for the WASM wrapper at
// api/src/shared/wmbusmeters/index.ts.
//
// Signatures are frozen here so the Metbox API can swap `@/shared/wmbusmeters`
// for `@metbox/wmbus` with a single-line re-export once the underlying
// implementation is complete. Promises are preserved for source compatibility
// even though the TS implementation is synchronous.

import { parseDv } from "./data/dv-parser.js";
import type { MeterState } from "./data/meter-state.js";
import { runAutoDriver } from "./drivers/auto.js";
import { interpret } from "./drivers/interpreter.js";
import { listDriverNames, lookupDriverByName, registerDriver } from "./drivers/registry.js";
import type { DriverDefinition } from "./drivers/types.js";
import { crc16En13757 } from "./protocol/crc.js";
import { decodeTelegram as runPipeline } from "./protocol/pipeline.js";
import { hexToBytes } from "./util/hex.js";

// Side-effect import: registers every bundled driver with the global registry.
import "./drivers/builtin/index.js";

export interface WMBusDecodeResult {
  [key: string]: unknown;
  _?: "telegram";
  media?: string;
  meter?: string;
  name?: string;
  id?: string;
  total_m3?: number;
  timestamp?: string;
  status?: string;
}

export interface DecodeOptions {
  /** Configured meter name (upstream's `// Test: <name> ...` first token). */
  name?: string;
  /**
   * Override the meter id in the output. Mirrors upstream's behaviour where
   * the configured meter id wins over the on-wire id (a few qcaloric/qheat
   * test fixtures rely on this — wire bytes don't match the JSON id).
   * Production callers usually leave this unset.
   */
  idOverride?: string;
  /**
   * Override the timestamp emitted in the JSON. Tests use
   * `"1111-11-11T11:11:11Z"` to match upstream's WMBUSMETERS_INSTALL_MODE=testing.
   * Defaults to the current wall-clock in ISO-8601 UTC with second precision.
   */
  timestampOverride?: string;
  /**
   * Optional per-meter state that survives across multiple `decodeWmbusHex`
   * calls. Required for decoding Kamstrup CI=0x79 compact frames (the format
   * bytes are cached from a prior long-frame transmission).
   */
  meterState?: MeterState;
}

/**
 * Decode a wireless M-Bus hex telegram.
 *
 * @param hexString - Raw hex-encoded wM-Bus telegram (whitespace / separator tolerant).
 * @param driver    - Driver name (e.g. "multical21") or "auto" for MVT dispatch.
 * @param key       - Optional 32-hex-char AES-128 key for encrypted telegrams.
 * @param options   - Optional name / timestamp override (mostly for tests).
 */
export async function decodeWmbusHex(
  hexString: string,
  driver: string = "auto",
  key: string = "",
  options: DecodeOptions = {},
): Promise<WMBusDecodeResult> {
  return decodeWmbusHexSync(hexString, driver, key, options);
}

/** Synchronous variant used by other modules; the async one is the public surface. */
export function decodeWmbusHexSync(
  hexString: string,
  driver: string = "auto",
  key: string = "",
  options: DecodeOptions = {},
): WMBusDecodeResult {
  const aesKey = key.length > 0 ? hexToBytes(key) : null;
  const assembled = runPipeline(hexString, aesKey);

  // Failed decryption: emit the epoch-timestamp sentinel that Metbox's
  // retry-with-key path relies on.
  if (assembled.plaintext === null) {
    const out: WMBusDecodeResult = {
      _: "telegram",
      media: assembled.effectiveMedia,
      meter: driver === "auto" ? "auto" : driver,
      id: options.idOverride ?? assembled.effectiveId,
      timestamp: "1970-01-01T00:00:00Z",
    };
    if (options.name !== undefined) out.name = options.name;
    return out;
  }

  // Fall back to the driver's meterType-implied media if the wire's media
  // string is "Unknown" — upstream's MeterType-default kicks in here for
  // Diehl variants whose type byte (e.g. 0x8B) isn't in the standard table.
  let media = assembled.effectiveMedia;
  let def: DriverDefinition | undefined;
  if (driver !== "auto") {
    def = lookupDriverByName(driver) ?? undefined;
    if (def) {
      if (media === "Unknown") {
        media = mediaForMeterType(def.meterType) ?? media;
      }
      // Electricity drivers always override a "radio converter (…)" DLL
      // type (the converter box masquerades as 0x37; upstream resolves the
      // media from the inner TPL for electricity meters).
      if (
        def.meterType === "ElectricityMeter" &&
        (media === "radio converter (meter side)" || media === "radio converter (system side)")
      ) {
        media = "electricity";
      }
    }
  }

  // Driver-level preprocess runs between TPL-decryption and DV-parsing. Used
  // by Diehl PRIOS drivers (izar, sharky774) to descramble LFSR-protected
  // payloads before the DV parser sees them.
  let plaintext = assembled.plaintext;
  if (def?.preprocess) {
    const dllIdBytes = assembled.telegram.dll.dllIdBytes;
    const dllAddress = new Uint8Array(6);
    dllAddress.set(dllIdBytes, 0);
    dllAddress[4] = assembled.telegram.dll.dllVersion;
    dllAddress[5] = assembled.telegram.dll.dllType;
    const dllMfct = assembled.telegram.dll.dllMfct;
    const dllMfctBytes = new Uint8Array([dllMfct & 0xff, (dllMfct >> 8) & 0xff]);
    plaintext = def.preprocess(plaintext, {
      dllMfctBytes,
      dllAddress,
      dllType: assembled.telegram.dll.dllType,
      dllVersion: assembled.telegram.dll.dllVersion,
      frame: assembled.telegram.frame,
      aesKey,
    });
  }

  // Kamstrup compact frame (CI=0x79): the plaintext starts with
  //   [format_sig_lo, format_sig_hi, data_crc_lo, data_crc_hi, ...data]
  // The `format bytes` (DIF/VIF chain) were cached from a prior long-frame
  // transmission. If no cached entry matches, the compact frame can't be
  // decoded — we fall through with an empty DVEntry list.
  let formatOverride: Uint8Array | undefined;
  if (assembled.tpl?.ci === 0x79 && plaintext.length >= 4) {
    const sigHash = ((plaintext[0] as number) | ((plaintext[1] as number) << 8)) & 0xffff;
    const cached = options.meterState?.formatSignatureCache.get(sigHash);
    if (cached) {
      formatOverride = cached;
      plaintext = plaintext.slice(4);
    } else {
      // No cache hit: emit an empty-result output so the caller can retry
      // once a long-frame telegram populates the cache.
      plaintext = new Uint8Array(0);
    }
  }

  const dvParse = parseDv(plaintext, { formatBytes: formatOverride });
  const dvEntries = dvParse.entries;

  // If this was a long-frame parse (no format override in play), cache the
  // accumulated format bytes under their CRC16-EN13757 hash so a follow-up
  // compact frame can reconstruct the same DV layout.
  if (!formatOverride && dvParse.formatBytes.length > 0 && options.meterState) {
    const sigHash = crc16En13757(dvParse.formatBytes);
    if (!options.meterState.formatSignatureCache.has(sigHash)) {
      options.meterState.formatSignatureCache.set(sigHash, dvParse.formatBytes);
    }
  }

  const baseCtx = {
    meterName: options.name,
    id: options.idOverride ?? assembled.effectiveId,
    media,
    tplStatus: assembled.tplStatus,
    timestampOverride: options.timestampOverride,
    plaintext,
    frame: assembled.telegram.frame,
  };

  if (driver === "auto") {
    return runAutoDriver(dvEntries, {
      ...baseCtx,
      mvt: {
        manufacturer: assembled.effectiveMfct,
        version: assembled.effectiveVersion,
        type: assembled.effectiveType,
      },
    });
  }

  if (!def) {
    // Unknown driver name — fall back to auto resolution.
    return runAutoDriver(dvEntries, {
      ...baseCtx,
      mvt: {
        manufacturer: assembled.effectiveMfct,
        version: assembled.effectiveVersion,
        type: assembled.effectiveType,
      },
    });
  }

  return interpret(def, dvEntries, baseCtx);
}

/**
 * Return every registered driver name (including "auto") sorted alphabetically.
 */
export async function listWmbusDrivers(): Promise<string[]> {
  const names = listDriverNames();
  if (!names.includes("auto")) names.unshift("auto");
  return names.sort();
}

/**
 * Decode a telegram and return both parsed JSON and a plain-text analysis
 * trace. Used by the partner admin UI's debug endpoint.
 */
export async function analyzeWmbusHex(
  hexString: string,
  driver: string = "auto",
  key: string = "",
  options: DecodeOptions = {},
): Promise<{ json: WMBusDecodeResult | null; raw: string; stderr: string }> {
  let json: WMBusDecodeResult | null = null;
  let error = "";
  try {
    json = decodeWmbusHexSync(hexString, driver, key, options);
  } catch (err) {
    error = (err as Error).message;
  }
  // Plain-text output is intentionally lightweight — Metbox's admin UI treats
  // it as opaque text. A byte-for-byte reproduction of upstream's
  // `--analyze=plain` trace is out of scope for the TS port.
  const raw = json ? JSON.stringify(json, null, 2) : "";
  return { json, raw, stderr: error };
}

/**
 * Register a custom driver definition at runtime. Replaces the current
 * `custom-drivers/` → rebuild-WASM loop.
 */
export function registerCustomDriver(def: DriverDefinition): void {
  registerDriver(def);
}

/**
 * Default JSON media string per MeterType. Used when the wire bytes don't
 * yield a recognised media value but a driver is declared — upstream's
 * driver layer overrides the wire media in this case.
 */
function mediaForMeterType(meterType: DriverDefinition["meterType"]): string | undefined {
  switch (meterType) {
    case "WaterMeter":
      return "water";
    case "HeatMeter":
      return "heat";
    case "HeatCoolingMeter":
      return "heat/cooling load";
    case "ElectricityMeter":
      return "electricity";
    case "GasMeter":
      return "gas";
    case "HeatCostAllocationMeter":
      return "heat cost allocation";
    case "TempHygroMeter":
      return "room sensor";
    case "SmokeDetector":
      return "smoke detector";
    case "PressureSensor":
      return "pressure";
    default:
      return undefined;
  }
}

export type { DriverDefinition };
export { createMeterState, type MeterState } from "./data/meter-state.js";
