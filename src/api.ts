// Public API surface — drop-in replacement for the WASM wrapper at
// api/src/shared/wmbusmeters/index.ts.
//
// Signatures are frozen here so the Metbox API can swap `@/shared/wmbusmeters`
// for `@metbox/wmbus` with a single-line re-export once the underlying
// implementation is complete. Promises are preserved for source compatibility
// even though the TS implementation is synchronous.

import { parseDv } from "./data/dv-parser.js";
import { runAutoDriver } from "./drivers/auto.js";
import { interpret } from "./drivers/interpreter.js";
import { listDriverNames, lookupDriverByName, registerDriver } from "./drivers/registry.js";
import type { DriverDefinition } from "./drivers/types.js";
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

  const { entries: dvEntries } = parseDv(assembled.plaintext);

  // Fall back to the driver's meterType-implied media if the wire's media
  // string is "Unknown" — upstream's MeterType-default kicks in here for
  // Diehl variants whose type byte (e.g. 0x8B) isn't in the standard table.
  let media = assembled.effectiveMedia;
  if (driver !== "auto") {
    const def = lookupDriverByName(driver);
    if (def) {
      if (media === "Unknown") {
        media = mediaForMeterType(def.meterType) ?? media;
      }
      // Electricity drivers always override a "radio converter (…)" DLL
      // type (the converter box masquerades as 0x37; upstream resolves the
      // media from the inner TPL for electricity meters).
      if (
        def.meterType === "ElectricityMeter" &&
        (media === "radio converter (meter side)" ||
          media === "radio converter (system side)")
      ) {
        media = "electricity";
      }
    }
  }

  const baseCtx = {
    meterName: options.name,
    id: options.idOverride ?? assembled.effectiveId,
    media,
    tplStatus: assembled.tplStatus,
    timestampOverride: options.timestampOverride,
    plaintext: assembled.plaintext,
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

  const def = lookupDriverByName(driver);
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
