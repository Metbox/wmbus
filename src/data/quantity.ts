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
// Physical quantity and unit types.
//
// Port of the relevant pieces of units.h / units.cc from wmbusmeters. We
// only need the units that appear in the VIF range table plus a handful of
// derived units used by drivers.

export type Quantity =
  | "Energy"
  | "Volume"
  | "Mass"
  | "Power"
  | "Flow"
  | "FlowMass"
  | "Time"
  | "Temperature"
  | "Pressure"
  | "Voltage"
  | "Amperage"
  | "Frequency"
  | "HCA"
  | "RH"
  | "PointInTime"
  | "Counter"
  | "Text";

export type Unit =
  // Energy
  | "Wh"
  | "KWH"
  | "MWH"
  | "GJ"
  | "MJ"
  | "J"
  // Power
  | "KW"
  | "MW"
  | "MJH"
  | "GJH"
  // Volume
  | "M3"
  | "L"
  // Mass
  | "KG"
  // Flow
  | "M3H"
  | "M3S"
  | "LH"
  | "KGH"
  // Time
  | "Hour"
  | "Minute"
  | "Second"
  | "Day"
  | "Year"
  | "Month"
  | "Week"
  // Temperature
  | "C"
  | "K"
  | "F"
  // Pressure
  | "BAR"
  // Electricity
  | "Volt"
  | "Ampere"
  | "VA"
  | "VAR"
  | "VAH"
  | "HZ"
  // Kamstrup-specific composite unit (m³·°C — temperature-weighted volume)
  | "M3C"
  // Percentage
  | "PERCENTAGE"
  // PPM (parts per million)
  | "PPM"
  // Generic
  | "COUNTER"
  | "TXT"
  | "HCA"
  | "RH"
  | "DateLT" // local-time date
  | "DateTimeLT" // local-time datetime
  | "Unknown";

/** Canonical quantity for a unit — used by VifScaling::Auto to pick target unit. */
export function quantityOfUnit(u: Unit): Quantity {
  switch (u) {
    case "Wh":
    case "KWH":
    case "MWH":
    case "GJ":
    case "MJ":
    case "J":
      return "Energy";
    case "KW":
    case "MW":
    case "MJH":
    case "GJH":
      return "Power";
    case "M3":
    case "L":
      return "Volume";
    case "KG":
      return "Mass";
    case "M3H":
    case "M3S":
    case "LH":
      return "Flow";
    case "KGH":
      return "FlowMass";
    case "Hour":
    case "Minute":
    case "Second":
    case "Day":
    case "Year":
    case "Month":
    case "Week":
      return "Time";
    case "C":
    case "K":
    case "F":
      return "Temperature";
    case "BAR":
      return "Pressure";
    case "Volt":
      return "Voltage";
    case "Ampere":
      return "Amperage";
    case "HZ":
      return "Frequency";
    case "HCA":
      return "HCA";
    case "RH":
      return "RH";
    case "M3C":
      return "Energy";
    case "PERCENTAGE":
      return "Counter";
    case "PPM":
      return "Counter";
    case "DateLT":
    case "DateTimeLT":
      return "PointInTime";
    case "COUNTER":
      return "Counter";
    case "TXT":
      return "Text";
    default:
      return "Counter";
  }
}

/** Short suffix appended to field names — e.g. "total" + "_m3" for Volume. */
export function unitSuffix(u: Unit): string {
  switch (u) {
    case "Wh":
      return "wh";
    case "KWH":
      return "kwh";
    case "MWH":
      return "mwh";
    case "GJ":
      return "gj";
    case "MJ":
      return "mj";
    case "J":
      return "j";
    case "KW":
      return "kw";
    case "MW":
      return "mw";
    case "MJH":
      return "mjh";
    case "GJH":
      return "gjh";
    case "M3":
      return "m3";
    case "L":
      return "l";
    case "KG":
      return "kg";
    case "M3H":
      return "m3h";
    case "M3S":
      return "m3s";
    case "LH":
      return "lh";
    case "KGH":
      return "kgh";
    case "Hour":
      return "h";
    case "Minute":
      return "min";
    case "Second":
      return "s";
    case "Day":
      return "d";
    case "Year":
      return "y";
    case "Month":
      return "month";
    case "Week":
      return "wk";
    case "C":
      return "c";
    case "K":
      return "k";
    case "F":
      return "f";
    case "BAR":
      return "bar";
    case "Volt":
      return "v";
    case "Ampere":
      return "a";
    case "VA":
      return "va";
    case "VAR":
      return "var";
    case "VAH":
      return "vah";
    case "HZ":
      return "hz";
    case "HCA":
      return "hca";
    case "RH":
      return "rh";
    case "M3C":
      return "m3c";
    case "PERCENTAGE":
      return "pct";
    case "PPM":
      return "ppm";
    case "DateLT":
      return "date";
    case "DateTimeLT":
      return "datetime";
    case "COUNTER":
      return "counter";
    case "TXT":
      return "txt";
    default:
      return "";
  }
}
