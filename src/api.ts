// Public API surface — drop-in replacement for the WASM wrapper at
// api/src/shared/wmbusmeters/index.ts.
//
// Signatures are frozen here so the Metbox API can swap `@/shared/wmbusmeters`
// for `@metbox/wmbus` with a single-line re-export once the underlying
// implementation is complete. Promises are preserved for source compatibility
// even though the TS implementation is synchronous.

import type { DriverDefinition } from "./drivers/types.js";

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

/**
 * Decode a wireless M-Bus hex telegram.
 *
 * @param hexString - Raw hex-encoded wM-Bus telegram (whitespace-tolerant).
 * @param driver - Driver name (e.g. "multical21"), or "auto" for MVT-based lookup.
 * @param key - Optional 32-hex-char AES-128 key for encrypted telegrams.
 */
export async function decodeWmbusHex(
  _hexString: string,
  _driver: string = "auto",
  _key: string = "",
): Promise<WMBusDecodeResult> {
  throw new Error("decodeWmbusHex not yet implemented — see plan phases 1–6");
}

/**
 * Return every registered driver name (including "auto") sorted alphabetically.
 */
export async function listWmbusDrivers(): Promise<string[]> {
  throw new Error("listWmbusDrivers not yet implemented — see plan phase 5");
}

/**
 * Decode a telegram and return both parsed JSON and a plain-text analysis
 * trace. Used by the partner admin UI's debug endpoint.
 */
export async function analyzeWmbusHex(
  _hexString: string,
  _driver: string = "auto",
  _key: string = "",
): Promise<{ json: WMBusDecodeResult | null; raw: string; stderr: string }> {
  throw new Error("analyzeWmbusHex not yet implemented — see plan phase 7");
}

/**
 * Register a custom driver definition at runtime. Replaces the current
 * `custom-drivers/` → rebuild-WASM loop.
 */
export function registerCustomDriver(_def: DriverDefinition): void {
  throw new Error("registerCustomDriver not yet implemented — see plan phase 5");
}
