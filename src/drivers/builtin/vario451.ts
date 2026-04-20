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
// Techem Vario 4 Typ 4.5.1 heat meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_vario451.cc. Similar to
// compact5: mfct-specific (CI=0xA2) block with previous + current energy
// counters in GJ × 10^-3. We output kWh (1 GJ = 277.778 kWh).

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const TCH = flagToManufacturer("TCH");

export const vario451 = defineDriver({
  name: "vario451",
  meterType: "HeatMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: TCH, version: 0x27, type: 0x04 },
    { manufacturer: TCH, version: 0x27, type: 0xc3 },
  ],
  defaultFields: "name,id,total_kwh,current_kwh,previous_kwh,timestamp",
  fields: [],
  postprocess(ctx) {
    const raw = ctx.plaintext;
    if (!raw || raw.length < 9) return;

    const prevGj = (256 * (raw[4] as number) + (raw[3] as number)) / 1000;
    const currGj = (256 * (raw[8] as number) + (raw[7] as number)) / 1000;

    const gjToKwh = 1_000_000 / 3600; // = 277.777…
    const round6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

    ctx.output.total_kwh = round6((prevGj + currGj) * gjToKwh);
    ctx.output.current_kwh = round6(currGj * gjToKwh);
    ctx.output.previous_kwh = round6(prevGj * gjToKwh);
  },
});
