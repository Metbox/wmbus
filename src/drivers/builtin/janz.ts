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
// Janz water meter — Metbox custom driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/janz.xmq (Metbox copyright).

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const janz = defineDriver({
  name: "janz",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("JGF"), version: 0x20, type: 0x07 }],
  defaultFields: "name,id,total_m3,target_m3,flow_temperature_c,timestamp",
  libraryFields: [
    "total_m3",
    "total_backward_m3",
    "volume_flow_m3h",
    "meter_datetime",
    "flow_temperature_c",
  ],
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
            maskBits: 0xffffff,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "target",
      description: "Total water consumption at end of previous billing period.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 1 },
    },
    {
      kind: "string",
      name: "target_date",
      description: "Date when previous billing period ended.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "battery",
      description: "Estimated battery lifetime remaining.",
      quantity: "Time",
      // Upstream XMQ specifies `force_scale = 0.0027397260273972603` (1/365).
      // Fixture expects 2 decimals for janz specifically.
      scaling: "None",
      signedness: "Unsigned",
      forceScale: 1 / 365,
      forceUnit: "Year",
      decimals: 2,
      match: { measurementType: "Instantaneous", difVifKey: "02FD74" },
    },
  ],
});
