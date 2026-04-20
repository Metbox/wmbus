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
// Eurisii heat cost allocator driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_eurisii.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const INE = flagToManufacturer("INE");
const RAM = flagToManufacturer("RAM");

const STATUS_MAP = [
  { value: 0x0001, text: "MEASUREMENT" },
  { value: 0x0002, text: "SABOTAGE" },
  { value: 0x0004, text: "BATTERY" },
  { value: 0x0008, text: "CS" },
  { value: 0x0010, text: "HF" },
  { value: 0x0020, text: "RESET" },
];

export const eurisii = defineDriver({
  name: "eurisii",
  meterType: "HeatCostAllocationMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: INE, version: 0x55, type: 0x08 },
    { manufacturer: RAM, version: 0x55, type: 0x08 },
  ],
  defaultFields: "name,id,current_consumption_hca,status,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status.",
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
      kind: "string",
      name: "error_flags",
      description: "Deprecated — use status.",
      properties: ["DEPRECATED", "STATUS", "INCLUDE_TPL_STATUS"],
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
      name: "current_consumption",
      description: "The current heat cost allocation.",
      quantity: "HCA",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "HeatCostAllocation" },
    },
    {
      kind: "numeric",
      name: "consumption_at_set_date_{storage_counter}",
      description: "HCA at the N-th set-date.",
      quantity: "HCA",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "HeatCostAllocation",
        storageNr: { from: 1, to: 17 },
      },
    },
    {
      kind: "numeric",
      name: "consumption_at_set_date",
      description: "Deprecated field — same as consumption_at_set_date_1.",
      quantity: "HCA",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "HeatCostAllocation",
        storageNr: 1,
      },
    },
  ],
});
