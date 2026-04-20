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
// Diehl DME 173 water meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/dme173.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const dme173 = defineDriver({
  name: "dme173",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("DME"), version: 0x63, type: 0x07 }],
  defaultFields: "name,id,status,total_m3,timestamp",
  libraryFields: ["total_m3", "flow_temperature_c", "total_backward_m3"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffffffff,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "target",
      description: "Total water consumption at end of last billing period.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 8 },
    },
    {
      kind: "string",
      name: "target_datetime",
      description: "End of last billing period.",
      match: { measurementType: "Instantaneous", vifRange: "DateTime", storageNr: 8 },
    },
    {
      kind: "numeric",
      name: "total_at_set_date",
      description: "Earlier total water consumption snapshot.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 1 },
    },
    {
      kind: "string",
      name: "set_date",
      description: "Earlier snapshot date.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
  ],
});
