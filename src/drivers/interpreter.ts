// Driver interpreter — turns a DVEntry list + DriverDefinition into the
// final JSON output object that upstream publishes.
//
// The interpreter is the single place that implements field matching, unit
// appending, numeric scaling, and string translation. It handles every
// declarative driver the same way; per-driver `preprocess` / `postprocess`
// hooks (used by ~10 vendor-quirk drivers) plug in around it.
//
// Output shape matches upstream's JSON:
//
//   { "_": "telegram",
//     "media": "...",          // from effective media string
//     "meter": "<driver name>",
//     "name": "<configured meter name>",
//     "id":   "<effective id>",
//     ... declared fields in order ...
//     "timestamp": "1111-11-11T11:11:11Z"   // upstream's test-mode sentinel }

import { readReal32 } from "../data/decode-values.js";
import type { DVEntry } from "../data/dv-parser.js";
import { type Unit, unitSuffix } from "../data/quantity.js";
import { isInsideVifRange, vifEntryByName, vifScaleExponent } from "../data/vif-range.js";
import { applyLookup } from "./translate.js";
import type {
  DriverDefinition,
  FieldDefinition,
  FieldMatcher,
  NumericField,
  StringField,
} from "./types.js";

export interface InterpretContext {
  /** The configured meter name (user-supplied, e.g. "MyTapWater"). */
  meterName?: string;
  /** Effective id after TPL/ELL/Diehl resolution. */
  id: string;
  /** Effective JSON media string. */
  media: string;
  /**
   * Override the `timestamp` field — test harnesses use
   * `"1111-11-11T11:11:11Z"` to match upstream's WMBUSMETERS_INSTALL_MODE=testing
   * fixture behaviour; runtime callers pass the real wall-clock timestamp.
   */
  timestampOverride?: string;
}

/**
 * Run the driver's declarative field list against the parsed DVEntries and
 * produce the JSON output object. Order of keys mirrors upstream:
 *   `_`, `media`, `meter`, `name`, `id`, fields in declaration order, `timestamp`.
 */
export function interpret(
  driver: DriverDefinition,
  dvEntries: DVEntry[],
  ctx: InterpretContext,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    _: "telegram",
    media: ctx.media,
    meter: driver.name,
  };
  if (ctx.meterName !== undefined) out.name = ctx.meterName;
  out.id = ctx.id;

  // Track which entries have been consumed so repeated matches can pick the
  // next one — upstream's IndexNr (1-based) selects n-th occurrence.
  const usageCount = new Map<DVEntry, number>();

  for (const field of driver.fields) {
    const matches = dvEntries.filter((e) => matchesField(e, field.match, usageCount));
    const indexNr = field.match.indexNr ?? 1;
    const picked = matches[indexNr - 1];
    if (!picked) continue;
    usageCount.set(picked, (usageCount.get(picked) ?? 0) + 1);

    if (field.kind === "numeric") {
      const result = extractNumeric(picked, field);
      if (result !== null) {
        out[result.key] = result.value;
      }
    } else {
      const result = extractString(picked, field);
      if (result !== null) {
        out[result.key] = result.value;
      }
    }
  }

  out.timestamp = ctx.timestampOverride ?? isoTimestampNow();

  if (driver.postprocess) {
    driver.postprocess({ driver, dvEntries, output: out });
  }

  return out;
}

// ---------- Field matching ----------

function matchesField(
  entry: DVEntry,
  matcher: FieldMatcher,
  usageCount: Map<DVEntry, number>,
): boolean {
  // Exact DIF/VIF key takes priority — upstream's `match_dif_vif_key`.
  if (matcher.difVifKey !== undefined) {
    if (entry.difVifKey !== matcher.difVifKey.toUpperCase()) return false;
    // Fields like "status" + "current_status" both target the same key; we
    // allow reuse of the same DVEntry for exact-key matchers (upstream does
    // the same — the entries map uses the key as-is).
    return true;
  }

  // Measurement type: default to Instantaneous when omitted.
  const wantMeasurement = matcher.measurementType ?? "Instantaneous";
  if (wantMeasurement !== "Any" && entry.measurementType !== wantMeasurement) {
    return false;
  }

  // VIF range match.
  if (matcher.vifRange !== undefined && matcher.vifRange !== "Any") {
    if (!isInsideVifRange(entry.vif, matcher.vifRange)) return false;
  }

  // Exact raw VIF match.
  if (matcher.vifRaw !== undefined && entry.vif !== matcher.vifRaw) {
    return false;
  }

  // VIFCombinables.
  if (matcher.vifCombinables !== undefined) {
    if (matcher.vifCombinables.includes(-1)) {
      // "Any" marker: accept entries regardless of their combinables.
    } else if (matcher.vifCombinables.length === 0) {
      // Explicit empty list: require no combinables.
      if (entry.combinables.length > 0) return false;
    } else {
      // Require every declared combinable to be present on the entry.
      for (const required of matcher.vifCombinables) {
        if (!entry.combinables.includes(required)) return false;
      }
    }
  } else {
    // Default: require no combinables — this is upstream's behaviour when
    // the matcher doesn't add any VIFCombinable.
    if (entry.combinables.length > 0) return false;
  }

  // Storage/Tariff/Subunit.
  if (!matchesRange(entry.storageNr, matcher.storageNr ?? 0)) return false;
  if (!matchesRange(entry.tariff, matcher.tariffNr ?? 0)) return false;
  if (!matchesRange(entry.subunit, matcher.subUnitNr ?? 0)) return false;

  // Already-used check for non-exact-key matchers — each entry can only be
  // picked by one non-exact-key field to keep upstream's behaviour of
  // returning progressively-later matches for repeated DVEntries.
  // (Exact-key fields bypass this check; see the early return above.)
  const used = usageCount.get(entry) ?? 0;
  return used === 0;
}

function matchesRange(value: number, spec: number | { from: number; to: number } | "any"): boolean {
  if (spec === "any") return true;
  if (typeof spec === "number") return value === spec;
  return value >= spec.from && value <= spec.to;
}

// ---------- Numeric extraction ----------

interface NumericResult {
  key: string;
  value: number;
}

function extractNumeric(entry: DVEntry, field: NumericField): NumericResult | null {
  const rawBytes = entry.rawValue;
  if (rawBytes.length === 0) return null;

  // For Real32, read as float directly.
  let raw: number;
  if (entry.kind === "Real32") {
    raw = readReal32(rawBytes);
  } else if (entry.asNumber !== null && !Number.isNaN(entry.asNumber)) {
    raw = entry.asNumber;
  } else {
    return null;
  }

  // Pick the output unit. Upstream: canonical unit of the VIF range (or the
  // driver's forceUnit override).
  const unit = resolveUnit(entry, field);
  const suffix = unitSuffix(unit);
  const key = suffix.length > 0 ? `${field.name}_${suffix}` : field.name;

  // Apply scaling.
  let scaled = raw;
  if (field.scaling === "Auto") {
    const exp = vifScaleExponent(entry.vif);
    if (exp !== 0) scaled = raw * 10 ** exp;
  } else if (typeof field.scaling === "number") {
    scaled = raw * 10 ** field.scaling;
  }

  // Upstream rounds to a "clean" number of decimals to avoid FP artefacts.
  // For auto-scaled values, the VIF-derived exponent tells us how many
  // decimals are significant; match that.
  const decimals = decimalsFor(unit, entry.vif, field);
  scaled = round(scaled, decimals);

  return { key, value: scaled };
}

function resolveUnit(entry: DVEntry, field: NumericField): Unit {
  if (field.forceUnit) return field.forceUnit;

  // Prefer the matching VIFRange table entry (drivers that match via VIF
  // range get their canonical unit from there).
  const range = vifRangeForEntry(entry);
  if (range) return range;

  // Fall back by quantity — rough but covers most declaratively-matched fields.
  switch (field.quantity) {
    case "Volume":
      return "M3";
    case "Energy":
      return "KWH";
    case "Power":
      return "KW";
    case "Flow":
      return "M3H";
    case "Temperature":
      return "C";
    case "Pressure":
      return "BAR";
    case "Time":
      return "Hour";
    case "Voltage":
      return "Volt";
    case "Amperage":
      return "Ampere";
    case "HCA":
      return "HCA";
    case "RH":
      return "RH";
    case "Mass":
      return "KG";
    case "FlowMass":
      return "KGH";
    case "Counter":
      return "COUNTER";
    case "PointInTime":
      return "DateTimeLT";
    default:
      return "Unknown";
  }
}

function vifRangeForEntry(entry: DVEntry): Unit | null {
  // Walk the VIF table looking for an entry whose range covers the raw VIF.
  // This mirrors the `toDefaultUnit(Vif v)` helper in dvparser.cc.
  // We use the cached table from vif-range.ts via a tiny adapter: look up by
  // symbolic name after resolving the range membership via isInsideVifRange.
  for (const name of [
    "Volume",
    "VolumeFlow",
    "FlowTemperature",
    "ReturnTemperature",
    "TemperatureDifference",
    "ExternalTemperature",
    "Pressure",
    "EnergyWh",
    "EnergyMJ",
    "PowerW",
    "PowerJh",
    "OnTime",
    "OperatingTime",
    "ActualityDuration",
    "HeatCostAllocation",
    "Date",
    "DateTime",
  ] as const) {
    if (isInsideVifRange(entry.vif, name)) {
      const ent = vifEntryByName(name);
      if (ent) return ent.unit;
    }
  }
  return null;
}

// How many decimals to keep for a given unit. Values chosen to match the
// precision upstream reports in its test fixtures.
function decimalsFor(unit: Unit, rawVif: number, _field: NumericField): number {
  const exp = vifScaleExponent(rawVif);
  switch (unit) {
    case "M3":
    case "LH":
    case "M3H":
    case "M3S":
      return Math.max(0, -exp);
    case "KWH":
    case "MWH":
    case "GJ":
    case "MJ":
      return Math.max(0, -exp);
    case "C":
    case "K":
    case "F":
      return Math.max(0, -exp);
    case "BAR":
      return Math.max(0, -exp);
    case "KW":
    case "MW":
      return Math.max(0, -exp);
    case "Hour":
      return 0;
    default:
      return Math.max(0, -exp);
  }
}

function round(value: number, decimals: number): number {
  if (decimals <= 0) return Math.round(value);
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

// ---------- String extraction ----------

interface StringResult {
  key: string;
  value: string;
}

function extractString(entry: DVEntry, field: StringField): StringResult | null {
  // String fields either have a Translate lookup (for status bits) or they
  // emit the raw DVEntry string value (e.g. dates, mfct strings).
  if (field.lookup) {
    const raw = entry.asNumber;
    if (raw === null || Number.isNaN(raw)) {
      return { key: field.name, value: "" };
    }
    return { key: field.name, value: applyLookup(raw, field.lookup) };
  }
  // Fallback: whatever the DVEntry already decoded as a string.
  if (entry.asString !== null) {
    return { key: field.name, value: entry.asString };
  }
  return { key: field.name, value: entry.asHex };
}

// ---------- Misc ----------

function isoTimestampNow(): string {
  // ISO 8601 with trailing Z and second precision, matching upstream's format.
  const d = new Date();
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}-${mo}-${da}T${h}:${mi}:${s}Z`;
}

// Exported for tests that want to run the interpreter in isolation.
export { matchesField, extractNumeric, extractString };

// Resolve field definition (kept for external callers / tests).
export function isNumericField(f: FieldDefinition): f is NumericField {
  return f.kind === "numeric";
}
export function isStringField(f: FieldDefinition): f is StringField {
  return f.kind === "string";
}
