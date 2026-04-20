/*
 * Copyright (C) 2026 Metbox / @metbox/wmbus contributors (gpl-3.0-or-later)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Converts a parsed XMQ driver tree into our declarative DriverDefinition.
 * Mirrors the semantics of wmbusmeters' `driver { … }` DSL for the subset
 * of features used by the downloadable drivers on wmbusmeters.org.
 */

import type { Quantity } from "../data/quantity.js";
import type { VIFRange } from "../data/vif-range.js";
import { flagToManufacturer } from "../protocol/manufacturers.js";
import type {
  DriverDefinition,
  FieldDefinition,
  FieldMatcher,
  FieldProperty,
  LinkMode,
  MeasurementType,
  MeterType,
  MVT,
  NumericField,
  Signedness,
  StringField,
  TranslateLookup,
  TranslateMapType,
  TranslateRule,
} from "./types.js";
import { childBlock, childBlocks, entryValue, entryValues, type XmqBlock } from "./xmq-parser.js";

export interface XmqConvertWarnings {
  /** Keys we didn't know how to map. Purely informational — the driver still loads. */
  ignored: string[];
}

export function convertXmqDriver(
  root: XmqBlock,
  opts: { warnings?: XmqConvertWarnings } = {},
): DriverDefinition {
  if (root.name !== "driver") {
    throw new Error(`convertXmqDriver: expected top-level 'driver' block, got '${root.name}'`);
  }

  const name = requireEntry(root, "name");
  const meterType = toMeterType(requireEntry(root, "meter_type"));
  const defaultFields = entryValue(root, "default_fields");
  const mvt = parseMvtList(root);

  const libraryFields: string[] = [];
  const libBlock = childBlock(root, "library");
  if (libBlock) libraryFields.push(...entryValues(libBlock, "use"));

  const linkModes: LinkMode[] = [];
  for (const lm of entryValues(root, "link_mode")) {
    const parsed = parseLinkMode(lm);
    if (parsed) linkModes.push(parsed);
  }
  if (linkModes.length === 0) linkModes.push("T1");

  const fields: FieldDefinition[] = [];
  const fieldsBlock = childBlock(root, "fields");
  if (fieldsBlock) {
    for (const fb of childBlocks(fieldsBlock, "field")) {
      const f = buildField(fb, opts.warnings);
      if (f) fields.push(f);
    }
  }

  return {
    name,
    meterType,
    linkModes,
    mvt,
    defaultFields,
    libraryFields: libraryFields.length > 0 ? libraryFields : undefined,
    fields,
  };
}

// --- mvt parsing ----------------------------------------------------------

function parseMvtList(root: XmqBlock): MVT[] {
  const detect = childBlock(root, "detect");
  if (!detect) return [];
  const out: MVT[] = [];
  for (const raw of entryValues(detect, "mvt")) {
    const parts = raw.split(",").map((s) => s.trim());
    if (parts.length !== 3) continue;
    const mfct = parseMfct(parts[0] as string);
    const ver = parseHexOrInt(parts[1] as string);
    const typ = parseHexOrInt(parts[2] as string);
    if (mfct === null || ver === null || typ === null) continue;
    out.push({ manufacturer: mfct, version: ver, type: typ });
  }
  return out;
}

function parseMfct(token: string): number | null {
  // Three-letter flag code (SEN, APT, KAM...).
  if (/^[A-Za-z]{3}$/.test(token)) {
    try {
      return flagToManufacturer(token.toUpperCase());
    } catch {
      return null;
    }
  }
  // Literal hex (0xABCD) or decimal.
  return parseHexOrInt(token);
}

function parseHexOrInt(token: string): number | null {
  const t = token.trim();
  if (t.length === 0) return null;
  if (/^0x[0-9A-Fa-f]+$/.test(t)) return Number.parseInt(t.slice(2), 16);
  if (/^[0-9A-Fa-f]+$/.test(t)) {
    // Driver XMQ writes version/type bytes as bare hex (e.g. `68,07`).
    return Number.parseInt(t, 16);
  }
  const n = Number.parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}

// --- field building -------------------------------------------------------

function buildField(fb: XmqBlock, warnings?: XmqConvertWarnings): FieldDefinition | null {
  const name = entryValue(fb, "name");
  if (!name) return null;

  const quantityRaw = entryValue(fb, "quantity");
  const attributesRaw = entryValue(fb, "attributes");
  const properties = parseProperties(attributesRaw);

  // Match block — required for standard fields. Fields without a match
  // block are things like calculator / ixml / text-only library fields
  // we can't yet express in the declarative schema; drop them with a note.
  const matchBlock = childBlock(fb, "match");
  if (!matchBlock) {
    warnings?.ignored.push(`${name}: no match block (calculator/ixml field skipped)`);
    return null;
  }
  const match = buildMatcher(matchBlock);
  if (!match) {
    warnings?.ignored.push(`${name}: unable to build matcher`);
    return null;
  }

  const lookupBlock = childBlock(fb, "lookup");
  const lookup = lookupBlock ? buildLookup(lookupBlock) : undefined;

  if (!quantityRaw || quantityRaw === "Text") {
    const f: StringField = {
      kind: "string",
      name,
      description: entryValue(fb, "info") ?? "",
      match,
      lookup,
      properties,
    };
    return f;
  }

  const q = toQuantity(quantityRaw);
  const scaling = parseScaling(entryValue(fb, "vif_scaling"));
  const signedness = parseSignedness(entryValue(fb, "dif_signedness"));
  const forceScale = parseForceScale(entryValue(fb, "force_scale"));
  const forceUnit = entryValue(fb, "display_unit");
  const decimals = parseNumeric(entryValue(fb, "decimal_places"));

  const f: NumericField = {
    kind: "numeric",
    name,
    description: entryValue(fb, "info") ?? "",
    quantity: q,
    scaling,
    signedness,
    match,
    forceScale,
    // display_unit is an upstream-specific "render as" hint (e.g. `date`).
    // Our output key derives from Quantity alone, so we currently ignore it
    // except for PointInTime date rendering (handled by the interpreter's
    // canonical unit for PointInTime).
    ...(forceUnit && forceUnit !== "date" && forceUnit !== "datetime"
      ? { forceUnit: forceUnit.toUpperCase() as NumericField["forceUnit"] }
      : {}),
    ...(decimals !== null ? { decimals } : {}),
    properties,
  };
  return f;
}

function buildMatcher(mb: XmqBlock): FieldMatcher | null {
  const matcher: FieldMatcher = {};

  const difvif = entryValue(mb, "difvifkey");
  if (difvif) matcher.difVifKey = difvif.toUpperCase();

  const mt = entryValue(mb, "measurement_type");
  if (mt) matcher.measurementType = mt as MeasurementType;

  const vr = entryValue(mb, "vif_range");
  if (vr) matcher.vifRange = vr as VIFRange;

  const vifRaw = entryValue(mb, "vif_raw");
  if (vifRaw) {
    const n = parseHexOrInt(vifRaw);
    if (n !== null) matcher.vifRaw = n;
  }

  const storageRange = parseRange(mb, "storage_nr");
  if (storageRange !== undefined) matcher.storageNr = storageRange;
  const tariffRange = parseRange(mb, "tariff_nr");
  if (tariffRange !== undefined) matcher.tariffNr = tariffRange;
  const subUnitRange = parseRange(mb, "subunit_nr");
  if (subUnitRange !== undefined) matcher.subUnitNr = subUnitRange;

  const combinables = entryValues(mb, "add_combinable");
  if (combinables.length > 0) {
    const nums: number[] = [];
    for (const c of combinables) {
      const n = parseHexOrInt(c);
      if (n !== null) nums.push(n);
    }
    if (nums.length > 0) matcher.vifCombinables = nums;
  }

  return matcher;
}

function parseRange(
  mb: XmqBlock,
  key: string,
): number | { from: number; to: number } | "any" | undefined {
  const values = entryValues(mb, key);
  if (values.length === 0) return undefined;
  if (values.length === 1) {
    const v = values[0] as string;
    if (v === "any") return "any";
    const n = parseHexOrInt(v);
    return n ?? undefined;
  }
  // Two values → (from, to) range.
  const a = parseHexOrInt(values[0] as string);
  const b = parseHexOrInt(values[1] as string);
  if (a === null || b === null) return undefined;
  return { from: Math.min(a, b), to: Math.max(a, b) };
}

function buildLookup(lb: XmqBlock): TranslateLookup {
  const rules: TranslateRule[] = [];
  // Upstream's lookup can be a single rule at the top level, or a list of
  // `rule { … }` blocks. Both shapes appear; we detect by presence of `map`.
  if (childBlocks(lb, "rule").length > 0) {
    for (const rb of childBlocks(lb, "rule")) rules.push(buildRule(rb));
  } else {
    rules.push(buildRule(lb));
  }
  return { rules };
}

function buildRule(rb: XmqBlock): TranslateRule {
  const name = entryValue(rb, "name") ?? "LOOKUP";
  const mapType = (entryValue(rb, "map_type") as TranslateMapType) ?? "BitToString";
  const maskBits = parseHexOrInt(entryValue(rb, "mask_bits") ?? "") ?? undefined;
  const defaultMessage = entryValue(rb, "default_message");
  const entries = childBlocks(rb, "map").map((mb) => ({
    value: parseHexOrInt(entryValue(mb, "value") ?? "") ?? 0,
    text: entryValue(mb, "name") ?? "",
  }));
  return {
    name,
    mapType,
    ...(maskBits !== undefined ? { maskBits } : {}),
    ...(defaultMessage !== undefined ? { defaultMessage } : {}),
    map: entries,
  };
}

// --- small enum/string helpers -------------------------------------------

function requireEntry(block: XmqBlock, key: string): string {
  const v = entryValue(block, key);
  if (v === undefined) {
    throw new Error(`convertXmqDriver: missing '${key}' in block '${block.name}'`);
  }
  return v;
}

function toMeterType(raw: string): MeterType {
  const known: readonly MeterType[] = [
    "WaterMeter",
    "HeatMeter",
    "HeatCoolingMeter",
    "ElectricityMeter",
    "GasMeter",
    "HeatCostAllocationMeter",
    "TempHygroMeter",
    "SmokeDetector",
    "DoorWindowSensor",
    "PulseCounter",
    "LeakageDetector",
    "PressureSensor",
    "Repeater",
    "Unknown",
  ];
  for (const k of known) if (k === raw) return k;
  return "Unknown";
}

function toQuantity(raw: string): Quantity {
  // Trust the caller — upstream's Quantity values are a superset of ours.
  // Unknowns fall back to Volume which at least renders sensibly.
  const whitelist: readonly string[] = [
    "Energy",
    "Power",
    "Volume",
    "Flow",
    "FlowMass",
    "Temperature",
    "Pressure",
    "Time",
    "PointInTime",
    "Counter",
    "Text",
    "HCA",
    "RH",
    "Voltage",
    "Amperage",
    "Mass",
    "Frequency",
    "Dimensionless",
    "Percentage",
  ];
  return whitelist.includes(raw) ? (raw as Quantity) : "Volume";
}

function parseScaling(raw: string | undefined): NumericField["scaling"] {
  if (raw === "None") return "None";
  if (raw && /^-?\d+$/.test(raw)) return Number.parseInt(raw, 10);
  return "Auto";
}

function parseSignedness(raw: string | undefined): Signedness {
  return raw === "Unsigned" ? "Unsigned" : "Signed";
}

function parseForceScale(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const m = /^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/.exec(raw);
  if (m) {
    const num = Number.parseFloat(m[1] as string);
    const den = Number.parseFloat(m[2] as string);
    if (den === 0) return undefined;
    return num / den;
  }
  const n = Number.parseFloat(raw);
  return Number.isNaN(n) ? undefined : n;
}

function parseNumeric(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}

function parseProperties(raw: string | undefined): FieldProperty[] | undefined {
  if (!raw) return undefined;
  const out: FieldProperty[] = [];
  for (const tok of raw.split(",")) {
    const t = tok.trim().toUpperCase();
    if (t === "STATUS" || t === "DEPRECATED" || t === "HIDDEN" || t === "HIDE") {
      out.push(t === "HIDE" ? "HIDDEN" : (t as FieldProperty));
    } else if (t === "INCLUDE_TPL_STATUS") {
      out.push("INCLUDE_TPL_STATUS");
    }
  }
  return out.length > 0 ? out : undefined;
}

function parseLinkMode(raw: string): LinkMode | null {
  const allowed: LinkMode[] = ["C1", "T1", "S1", "N1", "MBUS"];
  for (const lm of allowed) if (lm === raw) return lm;
  return null;
}
