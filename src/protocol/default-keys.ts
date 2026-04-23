/*
 * Copyright (C) 2019 Jacek Tomasiak (gpl-3.0-or-later)
 * Copyright (C) 2021 Vincent Privat (gpl-3.0-or-later)
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
// Manufacturer-specific default keys — port of upstream's
// `addDefaultManufacturerKeyIfAny()` (manufacturer_specificities.cc:245) and
// `initializeDiehlDefaultKeySupport()` (manufacturer_specificities.cc:260).
//
// The only hardcoded keys in wmbusmeters are a pair of 8-byte Diehl PRIOS
// seeds. Upstream uses them in two distinct ways:
//   1. For Diehl OMS AES_CBC_IV (mode 5) frames without a user key, the
//      second seed is duplicated to form a 16-byte AES key (KEY2 || KEY2).
//   2. For Diehl PRIOS / REAL_DATA / Izar LFSR-scrambled frames, both seeds
//      are used as uint32 LFSR state initialisers; the code tries them in
//      turn. That path is implemented inside `drivers/mfct/diehl-lfsr.ts`.
//
// Every other manufacturer in upstream requires a user-supplied key. There
// is no KDF that derives a per-meter key from the meter id (besides mode 7's
// session-key derivation, which starts from a user master key).

import { hexToBytes } from "../util/hex.js";
import { flagToManufacturer } from "./manufacturers.js";

export const DIEHL_PRIOS_KEY1_HEX = "39BC8A10E66D83F8";
export const DIEHL_PRIOS_KEY2_HEX = "51728910E66D83F8";

/** 16-byte AES-128 key for Diehl OMS mode-5 fallback: KEY2 repeated. */
export const DIEHL_OMS_DEFAULT_AES_KEY: Uint8Array = (() => {
  const half = hexToBytes(DIEHL_PRIOS_KEY2_HEX);
  const out = new Uint8Array(16);
  out.set(half, 0);
  out.set(half, 8);
  return out;
})();

/** Manufacturer codes upstream treats as Diehl family for key-injection purposes. */
const DIEHL_MFCT_CODES: ReadonlySet<number> = new Set([
  flagToManufacturer("DME"),
  flagToManufacturer("HYD"),
  flagToManufacturer("SAP"),
  flagToManufacturer("EWT"),
  flagToManufacturer("SPL"),
]);

export function isDiehlManufacturer(mfct: number): boolean {
  return DIEHL_MFCT_CODES.has(mfct & 0xffff);
}

/**
 * Decide whether to inject the Diehl OMS default key for a telegram whose
 * caller didn't supply one. Mirrors the upstream trigger in
 * `addDefaultManufacturerKeyIfAny()` + `detectDiehlFrameInterpretation()`:
 *   - manufacturer is in the Diehl family
 *   - C-field is SND_NR (0x44) or SND_IR (0x46)
 *   - CI byte is 0x7A (short TPL header)
 *   - CFG security-mode bits indicate Mode 5 (AES_CBC_IV)
 *
 * Mode 5 and Diehl REAL_DATA/LFSR are mutually exclusive in the CFG
 * encoding — REAL_DATA sets bit 12 of the MMMMM field, which puts the mode
 * nibble outside the range we recognise as Mode 5. So checking mode == 5
 * subsumes the upstream "interpretation == OMS" branch.
 */
export function shouldUseDiehlDefaultKey(params: {
  manufacturer: number;
  cField: number;
  ci: number;
  cfgWord: number;
}): boolean {
  if (!isDiehlManufacturer(params.manufacturer)) return false;
  if (params.cField !== 0x44 && params.cField !== 0x46) return false;
  if (params.ci !== 0x7a) return false;
  const modeBits = (params.cfgWord >> 8) & 0x1f;
  return modeBits === 5;
}
