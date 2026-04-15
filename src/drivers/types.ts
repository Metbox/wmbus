// Driver definition types. The full shape is pinned down in plan Phase 5;
// this file only declares the opaque `DriverDefinition` so api.ts can compile
// before the interpreter is written.

export type LinkMode = "C1" | "T1" | "S1" | "N1" | "MBUS";

export type MeasurementType = "Instantaneous" | "Minimum" | "Maximum" | "AtError" | "Any";

export type Signedness = "Signed" | "Unsigned";

export type MeterType =
  | "WaterMeter"
  | "HeatMeter"
  | "ElectricityMeter"
  | "GasMeter"
  | "HeatCostAllocationMeter"
  | "TempHygroMeter"
  | "SmokeDetector"
  | "DoorWindowSensor"
  | "PulseCounter"
  | "LeakageDetector"
  | "Unknown";

export interface MVT {
  /** 16-bit manufacturer code (from MANUFACTURER_* constants). */
  manufacturer: number;
  /** Meter version byte. */
  version: number;
  /** Meter type byte (0x04 = heat, 0x07 = water, etc.). */
  type: number;
}

/**
 * Placeholder — the full declarative driver schema lands in plan Phase 5.
 * Exposed here only so `api.registerCustomDriver` has a stable type handle.
 */
export interface DriverDefinition {
  name: string;
  aliases?: string[];
  meterType: MeterType;
  linkModes: LinkMode[];
  mvt: MVT[];
  // fields, preprocess, postprocess, libraryFields etc. arrive in Phase 5.
}
