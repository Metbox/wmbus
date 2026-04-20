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
// wM-Bus manufacturer field helpers.
//
// The 16-bit manufacturer field ("M-field") packs three upper-case letters
// into 5 bits each using the formula from EN 13757:
//
//     M = (A - 64) * 1024 + (B - 64) * 32 + (C - 64)
//
// So the flag can be recovered bit-for-bit — no lookup needed. The human-
// readable name lookup is optional and comes from the auto-generated table
// in `manufacturer-names.ts`.

import { MANUFACTURER_NAMES } from "./manufacturer-names.js";

/**
 * Unpack a 16-bit manufacturer code into its 3-letter ASCII flag (e.g.
 * `0x2C2D` → `"KAM"` for Kamstrup).
 *
 * If any of the three 5-bit fields is outside the A-Z range (1..26), the
 * corresponding position is replaced with `?`. Some devices send the first
 * letter lower-cased (top bit set); wmbusmeters masks that off before
 * lookup — we do the same so `?` is rare in practice.
 */
export function manufacturerFlag(mfct: number): string {
  const m = mfct & 0x7fff;
  const a = (m >> 10) & 0x1f;
  const b = (m >> 5) & 0x1f;
  const c = m & 0x1f;
  return letter(a) + letter(b) + letter(c);
}

function letter(v: number): string {
  return v >= 1 && v <= 26 ? String.fromCharCode(64 + v) : "?";
}

/** Pack a 3-letter flag back into its 16-bit manufacturer code. */
export function flagToManufacturer(flag: string): number {
  if (flag.length !== 3) {
    throw new Error(`manufacturer flag must be 3 chars (got "${flag}")`);
  }
  const f = flag.toUpperCase();
  return ((f.charCodeAt(0) - 64) << 10) | ((f.charCodeAt(1) - 64) << 5) | (f.charCodeAt(2) - 64);
}

/**
 * Human-readable manufacturer name from the upstream database. Returns
 * `undefined` for unknown codes (rare — table has ~1540 entries).
 *
 * The upstream string is kept verbatim, including any city/country suffix
 * after the company name (e.g. `"Kamstrup Energi, Denmark"`).
 */
export function manufacturerName(mfct: number): string | undefined {
  return MANUFACTURER_NAMES[mfct & 0x7fff] ?? MANUFACTURER_NAMES[mfct];
}

// A small set of common manufacturer codes used throughout the drivers, hand-
// picked for readability. Use `flagToManufacturer("XXX")` for anything else.
export const MANUFACTURER = Object.freeze({
  KAM: flagToManufacturer("KAM"), // Kamstrup
  DME: flagToManufacturer("DME"), // Diehl Metering
  HYD: flagToManufacturer("HYD"), // Diehl/Hydrometer
  TCH: flagToManufacturer("TCH"), // Techem
  SEN: flagToManufacturer("SEN"), // Sensus
  APA: flagToManufacturer("APA"), // Apator
  ITW: flagToManufacturer("ITW"), // Itron
  EFE: flagToManufacturer("EFE"), // Engelmann
  QDS: flagToManufacturer("QDS"), // Qundis
  ELS: flagToManufacturer("ELS"), // Elster
  BMT: flagToManufacturer("BMT"), // BMeters
  KAW: flagToManufacturer("KAW"), // Kamstrup Water
  AAA: flagToManufacturer("AAA"), // Aventies
  MAD: flagToManufacturer("MAD"), // Maddalena
});
