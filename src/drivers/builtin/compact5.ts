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
// Techem Compact V heat meter — mfct-specific (CI=0xA1/0xA2) payload.
//
// Port of vendor/wmbusmeters@af48083/src/driver_compact5.cc. The Compact V
// ships an entirely proprietary post-CI blob; `processContent` pulls three
// 3-byte LE counters out of fixed offsets and exposes them as library-style
// numeric fields.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const TCH = flagToManufacturer("TCH");

export const compact5 = defineDriver({
  name: "compact5",
  meterType: "HeatMeter",
  linkModes: ["T1", "C1"],
  mvt: [
    { manufacturer: TCH, version: 0x45, type: 0x04 },
    { manufacturer: TCH, version: 0x45, type: 0xc3 },
    { manufacturer: TCH, version: 0x22, type: 0x43 },
    { manufacturer: TCH, version: 0x45, type: 0x43 },
    { manufacturer: TCH, version: 0x39, type: 0x43 },
  ],
  defaultFields: "name,id,total_kwh,current_kwh,previous_kwh,timestamp",
  fields: [],
  postprocess(ctx) {
    // bytes [3..5] = previous-period counter, [7..9] = current-period counter
    // (3-byte LE ints in kWh), per driver_compact5.cc:63 processContent.
    const raw = ctx.plaintext;
    if (!raw || raw.length < 10) return;

    const prev = ((raw[5] as number) << 16) | ((raw[4] as number) << 8) | (raw[3] as number);
    const curr = ((raw[9] as number) << 16) | ((raw[8] as number) << 8) | (raw[7] as number);

    ctx.output.total_kwh = prev + curr;
    ctx.output.current_kwh = curr;
    ctx.output.previous_kwh = prev;
  },
});
