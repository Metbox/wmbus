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
// Techem MK Radio 4 water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_mkradio4.cc. Mfct-specific
// (CI=0xA2) payload — stripped down vs MKRadio3: no dates, just total +
// target counters at fixed offsets.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const TCH = flagToManufacturer("TCH");

export const mkradio4 = defineDriver({
  name: "mkradio4",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: TCH, version: 0x95, type: 0x62 },
    { manufacturer: TCH, version: 0x70, type: 0x62 },
    { manufacturer: TCH, version: 0x95, type: 0x72 },
    { manufacturer: TCH, version: 0x70, type: 0x72 },
  ],
  defaultFields: "name,id,total_m3,target_m3,timestamp",
  fields: [],
  postprocess(ctx) {
    const raw = ctx.plaintext;
    if (!raw || raw.length < 9) return;

    const prev = (256 * (raw[4] as number) + (raw[3] as number)) / 10;
    const curr = (256 * (raw[8] as number) + (raw[7] as number)) / 10;

    const round3 = (n: number) => Math.round(n * 1000) / 1000;
    ctx.output.total_m3 = round3(prev + curr);
    ctx.output.target_m3 = round3(prev);
  },
});
