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
// Apator 08 water meter (IXML grammar-driven).
//
// Port of vendor/wmbusmeters@af48083/drivers/src/apator08.xmq. The payload
// after CI=0xA0 doesn't carry DIF/VIF bytes — the grammar says the first
// four bytes are a `quad` annotated as DV 0413 (32-bit int Volume × 10^-3).
// We synthesise the DIF + VIF prefix so the standard DV parser picks it up.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const apator08 = defineDriver({
  name: "apator08",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: flagToManufacturer("APT"), version: 0x03, type: 0x03 },
    { manufacturer: flagToManufacturer("APT"), version: 0x0f, type: 0x0f },
  ],
  defaultFields: "name,id,total_m3,timestamp",
  fields: [
    {
      kind: "numeric",
      name: "total",
      description: "Total water consumption.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      // `force_scale = 1/3` in the upstream grammar — apator08's volume is
      // stored as "litres × 3", so divide by 3 after standard VIF scaling.
      forceScale: 1 / 3,
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
  ],
  preprocess(plaintext) {
    if (plaintext.length < 4) return plaintext;
    // Prepend synthetic DV 0413 (DIF=04 signed int32, VIF=13 Volume × 10^-3).
    const out = new Uint8Array(2 + 4);
    out[0] = 0x04;
    out[1] = 0x13;
    out.set(plaintext.subarray(0, 4), 2);
    return out;
  },
});
