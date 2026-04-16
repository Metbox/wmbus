// VIF-range table. Port of LIST_OF_VIF_RANGES in dvparser.h.
//
// Each VIF range is a (low, high) numeric interval — the raw VIF byte (or
// 0x7B/0x7D extension-prefixed pair) is matched against these bounds to
// discover the field's canonical Quantity and base Unit. Drivers declare
// fields by VIFRange name (e.g. `Volume`, `FlowTemperature`) and the
// interpreter looks up the (quantity, unit, VIF exponent) tuple here.

import type { Quantity, Unit } from "./quantity.js";

export type VIFRange =
  | "None"
  | "Any"
  | "Volume"
  | "OnTime"
  | "OperatingTime"
  | "VolumeFlow"
  | "FlowTemperature"
  | "ReturnTemperature"
  | "TemperatureDifference"
  | "ExternalTemperature"
  | "Pressure"
  | "HeatCostAllocation"
  | "Date"
  | "DateTime"
  | "EnergyMJ"
  | "EnergyWh"
  | "PowerW"
  | "PowerJh"
  | "ActualityDuration"
  | "FabricationNo"
  | "EnhancedIdentification"
  | "EnergyMWh"
  | "EnergyGJ"
  | "RelativeHumidity"
  | "AccessNumber"
  | "Medium"
  | "Manufacturer"
  | "ParameterSet"
  | "ModelVersion"
  | "HardwareVersion"
  | "FirmwareVersion"
  | "SoftwareVersion"
  | "Location"
  | "Customer"
  | "ErrorFlags"
  | "DigitalOutput"
  | "DigitalInput"
  | "DurationSinceReadout"
  | "DurationOfTariff"
  | "Dimensionless"
  | "Voltage"
  | "Amperage"
  | "ResetCounter"
  | "CumulationCounter"
  | "SpecialSupplierInformation"
  | "RemainingBattery"
  | "AnyVolumeVIF"
  | "AnyEnergyVIF"
  | "AnyPowerVIF";

interface VIFEntry {
  name: VIFRange;
  /** Inclusive low bound — 8-bit VIF or 16-bit (0x7B00/0x7D00) extended VIF. */
  from: number;
  /** Inclusive high bound. */
  to: number;
  /** Canonical quantity for this range. */
  quantity: Quantity;
  /** Default unit assigned by the VIF — the exponent is in the low bits of the VIF. */
  unit: Unit;
}

export const VIF_RANGES: readonly VIFEntry[] = Object.freeze([
  { name: "Volume", from: 0x10, to: 0x17, quantity: "Volume", unit: "M3" },
  { name: "OnTime", from: 0x20, to: 0x23, quantity: "Time", unit: "Hour" },
  { name: "OperatingTime", from: 0x24, to: 0x27, quantity: "Time", unit: "Hour" },
  { name: "VolumeFlow", from: 0x38, to: 0x3f, quantity: "Flow", unit: "M3H" },
  { name: "FlowTemperature", from: 0x58, to: 0x5b, quantity: "Temperature", unit: "C" },
  { name: "ReturnTemperature", from: 0x5c, to: 0x5f, quantity: "Temperature", unit: "C" },
  { name: "TemperatureDifference", from: 0x60, to: 0x63, quantity: "Temperature", unit: "C" },
  { name: "ExternalTemperature", from: 0x64, to: 0x67, quantity: "Temperature", unit: "C" },
  { name: "Pressure", from: 0x68, to: 0x6b, quantity: "Pressure", unit: "BAR" },
  { name: "HeatCostAllocation", from: 0x6e, to: 0x6e, quantity: "HCA", unit: "HCA" },
  { name: "Date", from: 0x6c, to: 0x6c, quantity: "PointInTime", unit: "DateLT" },
  { name: "DateTime", from: 0x6d, to: 0x6d, quantity: "PointInTime", unit: "DateTimeLT" },
  { name: "EnergyMJ", from: 0x08, to: 0x0f, quantity: "Energy", unit: "MJ" },
  { name: "EnergyWh", from: 0x00, to: 0x07, quantity: "Energy", unit: "KWH" },
  { name: "PowerW", from: 0x28, to: 0x2f, quantity: "Power", unit: "KW" },
  { name: "PowerJh", from: 0x30, to: 0x37, quantity: "Power", unit: "MJH" },
  { name: "ActualityDuration", from: 0x74, to: 0x77, quantity: "Time", unit: "Hour" },
  { name: "FabricationNo", from: 0x78, to: 0x78, quantity: "Text", unit: "TXT" },
  { name: "EnhancedIdentification", from: 0x79, to: 0x79, quantity: "Text", unit: "TXT" },
  // 0x7B extension table.
  { name: "EnergyMWh", from: 0x7b00, to: 0x7b01, quantity: "Energy", unit: "KWH" },
  { name: "EnergyGJ", from: 0x7b08, to: 0x7b09, quantity: "Energy", unit: "MJ" },
  { name: "RelativeHumidity", from: 0x7b1a, to: 0x7b1b, quantity: "RH", unit: "RH" },
  // 0x7D extension table.
  { name: "AccessNumber", from: 0x7d08, to: 0x7d08, quantity: "Counter", unit: "COUNTER" },
  { name: "Medium", from: 0x7d09, to: 0x7d09, quantity: "Text", unit: "TXT" },
  { name: "Manufacturer", from: 0x7d0a, to: 0x7d0a, quantity: "Text", unit: "TXT" },
  { name: "ParameterSet", from: 0x7d0b, to: 0x7d0b, quantity: "Text", unit: "TXT" },
  { name: "ModelVersion", from: 0x7d0c, to: 0x7d0c, quantity: "Text", unit: "TXT" },
  { name: "HardwareVersion", from: 0x7d0d, to: 0x7d0d, quantity: "Text", unit: "TXT" },
  { name: "FirmwareVersion", from: 0x7d0e, to: 0x7d0e, quantity: "Text", unit: "TXT" },
  { name: "SoftwareVersion", from: 0x7d0f, to: 0x7d0f, quantity: "Text", unit: "TXT" },
  { name: "Location", from: 0x7d10, to: 0x7d10, quantity: "Text", unit: "TXT" },
  { name: "Customer", from: 0x7d11, to: 0x7d11, quantity: "Text", unit: "TXT" },
  { name: "ErrorFlags", from: 0x7d17, to: 0x7d17, quantity: "Text", unit: "TXT" },
  { name: "DigitalOutput", from: 0x7d1a, to: 0x7d1a, quantity: "Text", unit: "TXT" },
  { name: "DigitalInput", from: 0x7d1b, to: 0x7d1b, quantity: "Text", unit: "TXT" },
  { name: "DurationSinceReadout", from: 0x7d2c, to: 0x7d2f, quantity: "Time", unit: "Hour" },
  { name: "DurationOfTariff", from: 0x7d31, to: 0x7d33, quantity: "Time", unit: "Hour" },
  { name: "Dimensionless", from: 0x7d3a, to: 0x7d3a, quantity: "Counter", unit: "COUNTER" },
  { name: "Voltage", from: 0x7d40, to: 0x7d4f, quantity: "Voltage", unit: "Volt" },
  { name: "Amperage", from: 0x7d50, to: 0x7d5f, quantity: "Amperage", unit: "Ampere" },
  { name: "ResetCounter", from: 0x7d60, to: 0x7d60, quantity: "Counter", unit: "COUNTER" },
  { name: "CumulationCounter", from: 0x7d61, to: 0x7d61, quantity: "Counter", unit: "COUNTER" },
  {
    name: "SpecialSupplierInformation",
    from: 0x7d67,
    to: 0x7d67,
    quantity: "Text",
    unit: "TXT",
  },
  { name: "RemainingBattery", from: 0x7d74, to: 0x7d74, quantity: "Time", unit: "Day" },
]);

/** Look up a VIF range entry by raw VIF value. */
export function vifRangeOfRawVif(rawVif: number): VIFEntry | null {
  for (const e of VIF_RANGES) {
    if (rawVif >= e.from && rawVif <= e.to) return e;
  }
  return null;
}

/** Look up a VIF range entry by symbolic name — O(N) but used only at config time. */
export function vifEntryByName(name: VIFRange): VIFEntry | null {
  for (const e of VIF_RANGES) {
    if (e.name === name) return e;
  }
  return null;
}

/**
 * Test whether a raw VIF falls inside a given VIF range — mirrors upstream's
 * `isInsideVIFRange()` (dvparser.cc:126). Handles the three "any" aggregates
 * by delegating to their component ranges.
 */
export function isInsideVifRange(rawVif: number, vifRange: VIFRange): boolean {
  if (vifRange === "Any") return true;
  if (vifRange === "None") return false;

  if (vifRange === "AnyVolumeVIF") {
    return isInsideVifRange(rawVif, "Volume");
  }
  if (vifRange === "AnyEnergyVIF") {
    return (
      isInsideVifRange(rawVif, "EnergyWh") ||
      isInsideVifRange(rawVif, "EnergyMJ") ||
      isInsideVifRange(rawVif, "EnergyMWh") ||
      isInsideVifRange(rawVif, "EnergyGJ")
    );
  }
  if (vifRange === "AnyPowerVIF") {
    return isInsideVifRange(rawVif, "PowerW") || isInsideVifRange(rawVif, "PowerJh");
  }

  const e = vifEntryByName(vifRange);
  return e ? rawVif >= e.from && rawVif <= e.to : false;
}

/**
 * VIF-derived scale exponent (10^n). Upstream puts this in the low 3 bits
 * of the VIF byte for most ranges — e.g. 0x14 = Volume with 10^1 m³.
 *
 * Specific ranges override this (date, text, dimensionless) and get scale=1.
 */
export function vifScaleExponent(rawVif: number): number {
  // 0x7B extension table — check FIRST so 0x7B08/0x7B09 don't fall into the
  // base 0x08..0x0F (EnergyMJ) range. Matches upstream's separate pow cases.
  if ((rawVif & 0xff00) === 0x7b00) {
    const low = rawVif & 0xff;
    if (low >= 0x00 && low <= 0x01) return (low & 1) + 2; // MWh → kWh
    if (low >= 0x08 && low <= 0x09) return (low & 1) + 2; // GJ → MJ
    if (low >= 0x1a && low <= 0x1b) return (low & 1) - 1; // Humidity
    return 0;
  }
  // 0x7D extension table — Voltage / Amperage scaling.
  if ((rawVif & 0xff00) === 0x7d00) {
    const low = rawVif & 0xff;
    if (low >= 0x40 && low <= 0x4f) return (low & 0x0f) - 9; // Voltage
    if (low >= 0x50 && low <= 0x5f) return (low & 0x0f) - 12; // Amperage
    return 0;
  }
  const masked8 = rawVif & 0xff;
  // Energy Wh: 0x00..0x07. VIF 0x03 = 1 Wh, position p = 10^(p-3) Wh per raw
  // unit. Canonical unit is kWh, so subtract another 3 → 10^(p-6) kWh.
  if (masked8 >= 0x00 && masked8 <= 0x07) return masked8 - 6;
  // Energy J: 0x08..0x0F. VIF 0x08 = 1 J, position p = 10^(p-0x08) J per raw
  // unit. Canonical unit is MJ → 10^(p-0x08-6) MJ.
  if (masked8 >= 0x08 && masked8 <= 0x0f) return masked8 - 0x08 - 6;
  // Volume: 0x10..0x17, base 10^-6 m³
  if (masked8 >= 0x10 && masked8 <= 0x17) return masked8 - 0x10 - 6;
  // OnTime/OperatingTime: 0x20..0x27 — time unit encoded in low 2 bits, not scale.
  //   0: seconds, 1: minutes, 2: hours, 3: days. Scale stays 1.
  if (masked8 >= 0x20 && masked8 <= 0x27) return 0;
  // Power W: 0x28..0x2F, base 10^-3 W (= mW), canonical kW
  if (masked8 >= 0x28 && masked8 <= 0x2f) return masked8 - 0x28 - 3 - 3;
  // Power J/h: 0x30..0x37, base 10^-1 MJ/h
  if (masked8 >= 0x30 && masked8 <= 0x37) return masked8 - 0x30 - 1;
  // VolumeFlow m³/h: 0x38..0x3F, base 10^-6 m³/h
  if (masked8 >= 0x38 && masked8 <= 0x3f) return masked8 - 0x38 - 6;
  // Temperatures: base 10^-3 °C
  if (
    (masked8 >= 0x58 && masked8 <= 0x5b) ||
    (masked8 >= 0x5c && masked8 <= 0x5f) ||
    (masked8 >= 0x60 && masked8 <= 0x63) ||
    (masked8 >= 0x64 && masked8 <= 0x67)
  ) {
    return (masked8 & 0x03) - 3;
  }
  // Pressure 0x68..0x6B — base 10^-3 bar
  if (masked8 >= 0x68 && masked8 <= 0x6b) return masked8 - 0x68 - 3;
  // ActualityDuration 0x74..0x77 — time unit in low 2 bits (same as OnTime).
  if (masked8 >= 0x74 && masked8 <= 0x77) return 0;
  return 0;
}

/**
 * Non-power-of-10 unit conversion between the VIF range's native unit and the
 * quantity's canonical unit. Energy in MJ (VIF 0x08-0x0F, 0x7B08-0x7B09) and
 * Power in MJ/h (VIF 0x30-0x37) share the 1/3.6 factor; everything else is
 * the identity.
 */
export function vifUnitConversionFactor(rawVif: number): number {
  const low8 = rawVif & 0xff;
  // Energy in J/MJ → kWh: divide by 3.6
  if (low8 >= 0x08 && low8 <= 0x0f) return 1 / 3.6;
  // Power in J/h/MJ/h → kW: same conversion
  if (low8 >= 0x30 && low8 <= 0x37) return 1 / 3.6;
  // 0x7B08/0x7B09 EnergyGJ → kWh: same conversion
  if ((rawVif & 0xff00) === 0x7b00) {
    const low = rawVif & 0xff;
    if (low >= 0x08 && low <= 0x09) return 1 / 3.6;
  }
  return 1;
}

/**
 * For time-based VIF ranges, the low 2 bits pick the time unit on the wire.
 * Returns the multiplier to convert to hours — e.g. seconds → 1/3600.
 *
 * Special cases:
 *   - 0x7D74 RemainingBattery is always Day → factor 24
 *   - 0x7D extension blocks that encode time in the low 2 bits use the same
 *     encoding as OnTime/OperatingTime.
 */
export function vifTimeUnitFactor(rawVif: number): number {
  if (rawVif === 0x7d74) return 24; // RemainingBattery, unit=Day
  const masked = rawVif & 0x03;
  switch (masked) {
    case 0:
      return 1 / 3600; // seconds
    case 1:
      return 1 / 60; // minutes
    case 2:
      return 1; // hours
    case 3:
      return 24; // days
    default:
      return 1;
  }
}
