// Driver definition schema — full Phase-5 replacement for the Phase-0 stub.
//
// Drivers are declarative TS object literals. Each declares:
//   - a name + meter-type (what shows up as `media` / `meter` in JSON)
//   - a list of MVT address triples the registry uses for "auto" lookup
//   - a list of fields, each with a matcher over DVEntry metadata and a
//     value transform (auto-scaling numeric or translate-table string)
//
// ~10 drivers will need additional preprocess / postprocess escape hatches
// for vendor quirks — declared here but implemented per-driver.

import type { DVEntry } from "../data/dv-parser.js";
import type { Quantity, Unit } from "../data/quantity.js";
import type { VIFRange } from "../data/vif-range.js";

export type LinkMode = "C1" | "T1" | "S1" | "N1" | "MBUS";

export type MeasurementType = "Instantaneous" | "Minimum" | "Maximum" | "AtError" | "Any";

export type Signedness = "Signed" | "Unsigned";

export type MeterType =
  | "WaterMeter"
  | "HeatMeter"
  | "HeatCoolingMeter"
  | "ElectricityMeter"
  | "GasMeter"
  | "HeatCostAllocationMeter"
  | "TempHygroMeter"
  | "SmokeDetector"
  | "DoorWindowSensor"
  | "PulseCounter"
  | "LeakageDetector"
  | "PressureSensor"
  | "Unknown";

export type FieldProperty = "STATUS" | "DEPRECATED" | "HIDDEN" | "INCLUDE_TPL_STATUS";

export interface MVT {
  /** 16-bit manufacturer code (e.g. flagToManufacturer("KAM")). */
  manufacturer: number;
  /** Meter version byte. */
  version: number;
  /** Meter type byte (0x04 = heat, 0x07 = water, etc.). */
  type: number;
}

// ---------- Field matchers ----------

export interface FieldMatcher {
  /** Exact match on the canonical DIF/VIF hex key (e.g. "02FF20"). */
  difVifKey?: string;
  /** Match the measurement type (defaults to Instantaneous if omitted). */
  measurementType?: MeasurementType;
  /**
   * Match a VIF range. If `"Any"` (string literal), the matcher accepts any
   * VIF — useful for mfct-specific / extension fields that come through with
   * a vendor-specific VIFCombinable but still match a standard VIF.
   */
  vifRange?: VIFRange;
  /** Match the raw VIF value exactly — for manufacturer-specific VIFs. */
  vifRaw?: number;
  /**
   * Storage number. Default: match only 0 (records without a DIFE storage
   * contribution). Use `"any"` for drivers like flow_temperature where any
   * storage accepts.
   */
  storageNr?: number | { from: number; to: number } | "any";
  /** Tariff — default 0; omit or `"any"` to accept any. */
  tariffNr?: number | { from: number; to: number } | "any";
  /** Subunit — default 0. */
  subUnitNr?: number;
  /**
   * VIFCombinable raw integer IDs required on the entry. Use a single
   * sentinel value `-1` to match "any combinable" (upstream's
   * `add(VIFCombinable::Any)`).
   */
  vifCombinables?: number[];
  /**
   * Which occurrence of a repeated match to return (1-based). Default 1.
   * Used by drivers that declare two fields with identical matchers.
   */
  indexNr?: number;
}

// ---------- Translate (string-field lookup) ----------

export type TranslateMapType = "BitToString" | "IndexToString" | "DecimalsToString";

export interface TranslateEntry {
  /** Raw integer value (for IndexToString) or bit mask (for BitToString). */
  value: number;
  /** Display string to include / emit. */
  text: string;
}

export interface TranslateRule {
  /** Short identifier for the rule — mostly for debug output. */
  name: string;
  mapType: TranslateMapType;
  /** Optional bitmask applied to the raw value before lookup. */
  maskBits?: number;
  /** Text emitted when no other entry matches (BitToString "OK" default etc.). */
  defaultMessage?: string;
  /** Lookup table entries. */
  map: TranslateEntry[];
}

export interface TranslateLookup {
  rules: TranslateRule[];
}

// ---------- Fields ----------

export interface NumericField {
  kind: "numeric";
  /** Logical field name — the unit suffix is appended by the interpreter. */
  name: string;
  /** Description used only by diagnostic output (kept for parity with upstream). */
  description: string;
  /** Canonical quantity — also drives the unit suffix on the JSON key. */
  quantity: Quantity;
  /** Scaling strategy: "Auto" = use VIF exponent, "None" = raw integer, or a forced integer exponent. */
  scaling: "Auto" | "None" | number;
  /** Interpret raw bytes as signed or unsigned integer. */
  signedness: Signedness;
  /** Filter that selects the matching DVEntry. */
  match: FieldMatcher;
  /**
   * Optional unit override — forces the output key's suffix regardless of
   * the VIF's default unit. Used for time-rescaling (RemainingBattery in
   * years via a Unit::Year field).
   */
  forceUnit?: Unit;
  /**
   * Optional fixed multiplier applied AFTER the scaling step. Used by drivers
   * like aquastream's battery field where days→years needs a 1/365 factor.
   */
  forceScale?: number;
  /**
   * Optional override for how many decimals to keep when rounding. Defaults
   * vary by unit and VIF scale exponent.
   */
  decimals?: number;
  /** Field flags (STATUS / DEPRECATED / HIDDEN). */
  properties?: FieldProperty[];
}

export interface StringField {
  kind: "string";
  name: string;
  description: string;
  match: FieldMatcher;
  /** Lookup table that converts the matched entry's raw value into text. */
  lookup?: TranslateLookup;
  properties?: FieldProperty[];
}

export type FieldDefinition = NumericField | StringField;

// ---------- Driver definition ----------

export interface PreprocessContext {
  dllMfctBytes: Uint8Array;
  dllAddress: Uint8Array;
  dllType: number;
  dllVersion: number;
}

export interface PostprocessContext {
  driver: DriverDefinition;
  dvEntries: DVEntry[];
  output: Record<string, unknown>;
}

export interface DriverDefinition {
  /** Canonical driver name — matches upstream's setName(). */
  name: string;
  /** Additional names the registry should resolve to this driver. */
  aliases?: string[];
  /** Meter type. Used by the "auto" driver's media fallback. */
  meterType: MeterType;
  /** Link modes the meter uses. Informational. */
  linkModes: LinkMode[];
  /** (manufacturer, version, type) triples that identify this meter. */
  mvt: MVT[];
  /**
   * Space-separated list of canonical fields, preserved from upstream for
   * plain-text analyze output compatibility. Kept for reference.
   */
  defaultFields?: string;
  /** Library fields (e.g. "meter_datetime", "operating_time_h"). Added by the interpreter. */
  libraryFields?: string[];
  /** Declarative field list. */
  fields: FieldDefinition[];

  /**
   * Optional: mutate the plaintext before the interpreter runs its field
   * matchers. Used by manufacturer preprocessors (Diehl LFSR etc.) to reshape
   * the byte stream.
   */
  preprocess?(plaintext: Uint8Array, ctx: PreprocessContext): Uint8Array;

  /**
   * Optional: mutate the final output object after all declarative fields
   * have been extracted. Used by drivers that compute derived fields (e.g.
   * heat/cooling classification from a temperature delta).
   */
  postprocess?(ctx: PostprocessContext): void;
}
