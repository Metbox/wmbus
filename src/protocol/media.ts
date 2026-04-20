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
// Media type resolution for the T-field (device type) of a DLL/TPL/ELL address.
//
// Port of `mediaTypeJSON()` in wmbus.cc:546. Strings mirror upstream exactly
// so fixture parity holds. Manufacturer-specific overrides are handled after
// the generic table.

import { MANUFACTURER } from "./manufacturers.js";

const GENERIC: Readonly<Record<number, string>> = Object.freeze({
  0: "other",
  1: "oil",
  2: "electricity",
  3: "gas",
  4: "heat",
  5: "steam",
  6: "warm water",
  7: "water",
  8: "heat cost allocation",
  9: "compressed air",
  10: "cooling load volume at outlet",
  11: "cooling load volume at inlet",
  12: "heat volume at inlet",
  13: "heat/cooling load",
  14: "bus/system component",
  15: "unknown",
  21: "hot water",
  22: "cold water",
  23: "hot/cold water",
  24: "pressure",
  25: "a/d converter",
  26: "smoke detector",
  27: "room sensor",
  28: "gas detector",
  29: "reserved",
  31: "reserved",
  32: "breaker",
  33: "valve",
  34: "reserved",
  35: "reserved",
  36: "reserved",
  37: "customer unit (display device)",
  38: "reserved",
  39: "reserved",
  40: "waste water",
  41: "garbage",
  42: "reserved",
  43: "reserved",
  44: "reserved",
  45: "reserved",
  46: "reserved",
  47: "reserved",
  48: "reserved",
  49: "reserved",
  50: "reserved",
  51: "reserved",
  52: "reserved",
  53: "reserved",
  54: "radio converter (system side)",
  55: "radio converter (meter side)",
  56: "reserved",
  57: "reserved",
  58: "reserved",
  59: "reserved",
  60: "reserved",
  61: "reserved",
  62: "reserved",
  63: "reserved",
});

// Techem-specific overrides that fall outside the standard 0x00..0x3F range
// (port of wmbus.cc:609-623).
const TECHEM: Readonly<Record<number, string>> = Object.freeze({
  98: "warm water", // MKRadio3/MKRadio4
  114: "cold water", // MKRadio3/MKRadio4
  128: "heat cost allocator", // FHKV data ii/iii
  195: "heat", // Vario 4 Typ 4.5.1
  67: "heat", // Techem V
  240: "smoke detector",
});

/**
 * Resolve the T-field device type to its JSON media string.
 *
 * @returns lowercase media string matching upstream `mediaTypeJSON()`, or
 *   `"Unknown"` (capital-U, upstream's fallback) when the combination is not
 *   recognised.
 */
export function mediaType(deviceType: number, manufacturer: number): string {
  const generic = GENERIC[deviceType & 0xff];
  if (generic !== undefined) return generic;

  if ((manufacturer & 0x7fff) === MANUFACTURER.TCH) {
    const tch = TECHEM[deviceType & 0xff];
    if (tch !== undefined) return tch;
  }

  return "Unknown";
}
