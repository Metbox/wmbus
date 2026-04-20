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
// Apator Ultrimis water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_ultrimis.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const APA = flagToManufacturer("APA");

export const ultrimis = defineDriver({
  name: "ultrimis",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: APA, version: 0x01, type: 0x16 }],
  defaultFields: "name,id,total_m3,target_m3,current_status,total_backward_flow_m3,timestamp",
  fields: [
    {
      kind: "numeric",
      name: "total",
      description: "Total water consumption.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
    {
      kind: "numeric",
      name: "target",
      description: "Total water consumption at the beginning of this month.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 1 },
    },
    {
      kind: "string",
      name: "current_status",
      description: "Status and error flags.",
      match: { difVifKey: "03FD17" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffffff,
            defaultMessage: "OK",
            map: [
              { value: 0x01, text: "TAMPER" },
              { value: 0x02, text: "LOW_BATTERY" },
              { value: 0x04, text: "DRY" },
              { value: 0x08, text: "NO_FLOW" },
              { value: 0x10, text: "HIGH_TEMPERATURE" },
              { value: 0x20, text: "BURST" },
              { value: 0x40, text: "REVERSE" },
              { value: 0x80, text: "LEAK" },
            ],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "total_backward_flow",
      description: "Total backward water volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { difVifKey: "04933C" },
    },
  ],
});
