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
// BMeters Hydroclima v2 heat cost allocator driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/hydroclimav2.xmq. The mfct
// block (DIF 0x0F) uses an IXML grammar upstream — we extract the same
// three temperature fields from fixed offsets.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const BMP = flagToManufacturer("BMP");

export const hydroclimav2 = defineDriver({
  name: "hydroclimav2",
  meterType: "HeatCostAllocationMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: BMP, version: 0x99, type: 0x99 },
    { manufacturer: BMP, version: 0x53, type: 0x08 },
    { manufacturer: BMP, version: 0x85, type: 0x08 },
  ],
  defaultFields: "name,id,status,current_hca,average_ambient_temperature_c,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "total",
      description: "Current heat cost allocation.",
      quantity: "HCA",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "HeatCostAllocation" },
    },
    {
      kind: "numeric",
      name: "average_ambient_temperature",
      description: "Average ambient temperature since start of month.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ExternalTemperature" },
    },
    {
      kind: "numeric",
      name: "max_ambient_temperature",
      description: "Maximum ambient temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Maximum", vifRange: "ExternalTemperature" },
    },
    {
      kind: "numeric",
      name: "average_heater_temperature",
      description: "Average heater temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "FlowTemperature" },
    },
  ],
  postprocess(ctx) {
    // Only the RKN0 layout (bytes 0x10 first) carries the additional temps
    // that fixtures check: average/max ambient + average ambient last month
    // + average heater last month. Same offsets as hydroclima v1.
    const raw = ctx.plaintext;
    if (!raw) return;
    let start = -1;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === 0x0f) {
        start = i + 1;
        break;
      }
    }
    if (start < 0 || start >= raw.length) return;

    // Frame identifier must be 0x10 (RKN0 layout) to trust the offsets.
    if (raw[start] !== 0x10) return;

    const b = (off: number): number | null => {
      const p = start + off;
      if (p + 1 >= raw.length) return null;
      return ((raw[p + 1] as number) << 8) | (raw[p] as number);
    };
    const toC = (val: number | null) => (val === null ? null : val / 100);

    const avg = toC(b(7));
    const max = toC(b(9));
    const avgLast = toC(b(15));
    const heaterLast = toC(b(17));
    if (avg !== null) ctx.output.average_ambient_temperature_c = avg;
    if (max !== null) ctx.output.max_ambient_temperature_c = max;
    if (avgLast !== null) ctx.output.average_ambient_temperature_last_month_c = avgLast;
    if (heaterLast !== null) ctx.output.average_heater_temperature_last_month_c = heaterLast;
  },
});
