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
// Maddalena water meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/maddalena.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const MAD = flagToManufacturer("MAD");

export const maddalena = defineDriver({
  name: "maddalena",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: MAD, version: 0x01, type: 0x07 },
    { manufacturer: MAD, version: 0x01, type: 0x06 },
  ],
  defaultFields: "name,id,status,total_m3,timestamp",
  libraryFields: ["target_m3", "target_date", "total_m3", "fabrication_no", "meter_datetime"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["INCLUDE_TPL_STATUS"],
      match: {
        measurementType: "Instantaneous",
        vifRange: "ErrorFlags",
      },
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
  ],
});
