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
// BMeters iwmtx5 water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_iwmtx5.cc.
// Mfct-specific TPL status bit 0x40 = TAMPER.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const BMT = flagToManufacturer("BMT");

export const iwmtx5 = defineDriver({
  name: "iwmtx5",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: BMT, version: 0x18, type: 0x07 },
    { manufacturer: BMT, version: 0x18, type: 0x06 },
  ],
  defaultFields: "name,id,status,total_m3,timestamp",
  libraryFields: ["meter_datetime", "total_m3"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
      lookup: {
        rules: [
          {
            name: "TPL_STS",
            mapType: "BitToString",
            maskBits: 0xe0,
            defaultMessage: "OK",
            map: [{ value: 0x40, text: "TAMPER" }],
          },
        ],
      },
    },
  ],
});
