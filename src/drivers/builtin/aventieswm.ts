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
// Aventies water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_aventieswm.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const AAA = flagToManufacturer("AAA");

const STATUS_MAP = [
  { value: 0x01, text: "MEASUREMENT" },
  { value: 0x02, text: "SABOTAGE" },
  { value: 0x04, text: "BATTERY" },
  { value: 0x08, text: "CS" },
  { value: 0x10, text: "HF" },
  { value: 0x20, text: "RESET" },
];

export const aventieswm = defineDriver({
  name: "aventieswm",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: AAA, version: 0x25, type: 0x07 }],
  defaultFields: "name,id,total_m3,error_flags,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from error flags and TPL status field.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: STATUS_MAP,
          },
        ],
      },
    },
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
      name: "consumption_at_set_date_{storage_counter}",
      description: "Water consumption at the N-th billing period date.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        storageNr: { from: 1, to: 14 },
      },
    },
    {
      kind: "string",
      name: "error_flags",
      description: "Deprecated — use `status` instead.",
      properties: ["DEPRECATED"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "",
            map: STATUS_MAP,
          },
        ],
      },
    },
  ],
});
