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
// Sontex Supercom 587 water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_supercom587.cc.
//
// Manufacturer: SON (Sontex), MVTs: 0x06/0x3C, 0x07/0x3C.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const SON = flagToManufacturer("SON");

export const supercom587 = defineDriver({
  name: "supercom587",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: SON, version: 0x3c, type: 0x06 },
    { manufacturer: SON, version: 0x3c, type: 0x07 },
  ],
  defaultFields: "name,id,total_m3,timestamp",
  libraryFields: ["software_version", "total_m3"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status of meter.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0x000f,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },
  ],
});
