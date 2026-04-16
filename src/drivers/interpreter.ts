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
import { isInsideVifRange, vifScaleExponent, vifTimeUnitFactor } from "../data/vif-range.js";
import { libraryField } from "./common-fields.js";
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

  // Resolve library field references the driver opted into. Library fields
  // are prepended to the field list so explicit fields can override by name.
  const fields: FieldDefinition[] = [];
  const explicitNames = new Set<string>();
  for (const f of driver.fields) explicitNames.add(f.name);
  for (const libName of driver.libraryFields ?? []) {
    const lib = libraryField(libName);
    if (lib && !explicitNames.has(lib.name)) fields.push(lib);
  }
  fields.push(...driver.fields);

  for (const field of fields) {
    const matches = dvEntries.filter((e) => matchesField(e, field.match));
    const indexNr = field.match.indexNr ?? 1;
    const picked = matches[indexNr - 1];

    if (!picked) {
      // String-with-lookup fields tagged STATUS / INCLUDE_TPL_STATUS get the
      // default rule message when no DVEntry matches — upstream falls back
      // to the TPL status byte in this case; we simplify to "the default
      // rule message" since most drivers' default is "OK" anyway.
      if (field.kind === "string" && field.lookup && hasStatusFallback(field)) {
        const defaults = field.lookup.rules
          .map((r) => r.defaultMessage ?? "")
          .filter((s) => s.length > 0);
        out[field.name] = defaults.join(" ");
      }
      continue;
    }

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

function matchesField(entry: DVEntry, matcher: FieldMatcher): boolean {
  // Exact DIF/VIF key takes priority — upstream's `match_dif_vif_key`.
  if (matcher.difVifKey !== undefined) {
    if (entry.difVifKey !== matcher.difVifKey.toUpperCase()) return false;
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

  return true;
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
    if (isTimeVif(entry.vif)) {
      // Time VIFs encode the time unit (s/min/h/d) in the low bits — first
      // convert raw to hours (canonical Time unit).
      scaled = raw * vifTimeUnitFactor(entry.vif);
      // If the field forces a different time unit (e.g. seconds), convert
      // hours → that unit.
      if (field.forceUnit) {
        const f = hourConvertFactor(field.forceUnit);
        if (f !== 1) scaled *= f;
      }
    } else {
      const exp = vifScaleExponent(entry.vif);
      if (exp !== 0) scaled = raw * 10 ** exp;
    }
  } else if (typeof field.scaling === "number") {
    scaled = raw * 10 ** field.scaling;
  }
  // Optional non-power-of-10 multiplier (e.g. battery days → years).
  if (field.forceScale !== undefined) {
    scaled *= field.forceScale;
  }

  // Upstream rounds to a "clean" number of decimals to avoid FP artefacts.
  // For auto-scaled values, the VIF-derived exponent tells us how many
  // decimals are significant; match that. For forceScale fields and time-
  // unit conversions (raw seconds/minutes → hours) keep 6 decimals.
  let decimals = decimalsFor(unit, entry.vif, field);
  if (field.forceScale !== undefined) decimals = 6;
  if (field.scaling === "Auto" && isTimeVif(entry.vif)) decimals = 6;
  scaled = round(scaled, decimals);

  return { key, value: scaled };
}

function resolveUnit(_entry: DVEntry, field: NumericField): Unit {
  if (field.forceUnit) return field.forceUnit;

  // Always pick the field's quantity-canonical unit. The VIF-range default
  // unit (e.g. MJ for the EnergyMJ block) is the *intermediate* unit that
  // vifScaleExponent already converts to the canonical (kWh, m3, kw…).
  // Upstream's behaviour: every Energy field outputs `_kwh`, every Volume
  // field outputs `_m3`, regardless of which VIF range matched.
  return canonicalUnitForQuantity(field.quantity);
}

function canonicalUnitForQuantity(quantity: NumericField["quantity"]): Unit {
  switch (quantity) {
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

/** Multiplier to convert hours to the given time unit. */
function hourConvertFactor(unit: Unit): number {
  switch (unit) {
    case "Second":
      return 3600;
    case "Minute":
      return 60;
    case "Hour":
      return 1;
    case "Day":
      return 1 / 24;
    case "Week":
      return 1 / (24 * 7);
    case "Month":
      return 1 / (24 * 30);
    case "Year":
      return 1 / (24 * 365);
    default:
      return 1;
  }
}

function isTimeVif(vif: number): boolean {
  const v = vif & 0xff;
  // OnTime 0x20-0x23, OperatingTime 0x24-0x27, ActualityDuration 0x74-0x77.
  if (v >= 0x20 && v <= 0x27) return true;
  if (v >= 0x74 && v <= 0x77) return true;
  // 0x7D extension: DurationSinceReadout 0x2C-0x2F, DurationOfTariff 0x31-0x33.
  if ((vif & 0xff00) === 0x7d00) {
    const low = vif & 0xff;
    if (low >= 0x2c && low <= 0x2f) return true;
    if (low >= 0x31 && low <= 0x33) return true;
  }
  return false;
}

function hasStatusFallback(f: StringField): boolean {
  if (!f.properties) return false;
  // Only INCLUDE_TPL_STATUS triggers default-emission (upstream falls back to
  // the TPL status byte). STATUS alone means the field is *labelled* as
  // status output but only shows up when a matching DVEntry exists.
  return f.properties.includes("INCLUDE_TPL_STATUS");
}
