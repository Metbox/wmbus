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
// Multical21 water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_multical21.cc.
//
// Manufacturer: Kamstrup (KAM, 0x2C2D)
// MVTs: 0x06/0x1B and 0x16/0x1B — same driver handles both water and
//       cold-water variants.
//
// Output JSON shape (per upstream fixtures):
//   status, total_m3, target_m3, flow_temperature_c, external_temperature_c,
//   min_external_temperature_c, max_flow_m3h, current_status (deprecated),
//   time_dry, time_reversed, time_leaking, time_bursting.

import { MANUFACTURER } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const multical21 = defineDriver({
  name: "multical21",
  meterType: "WaterMeter",
  linkModes: ["C1"],
  mvt: [
    { manufacturer: MANUFACTURER.KAM, version: 0x1b, type: 0x06 },
    { manufacturer: MANUFACTURER.KAM, version: 0x1b, type: 0x16 },
  ],
  defaultFields:
    "name,id,total_m3,target_m3,max_flow_m3h,flow_temperature_c,external_temperature_c,status,timestamp",

  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status of meter.",
      properties: ["STATUS"],
      match: { difVifKey: "02FF20" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0x000f,
            defaultMessage: "OK",
            map: [
              { value: 0x01, text: "DRY" },
              { value: 0x02, text: "REVERSE" },
              { value: 0x04, text: "LEAK" },
              { value: 0x08, text: "BURST" },
            ],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "total",
      description: "The total water consumption recorded by this meter.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
      },
    },
    {
      kind: "numeric",
      name: "target",
      description: "The total water consumption recorded at the beginning of this month.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "flow_temperature",
      description: "The water temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Minimum",
        vifRange: "FlowTemperature",
        storageNr: "any",
      },
    },
    {
      kind: "numeric",
      name: "external_temperature",
      description: "The external temperature outside of the meter.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Any",
        vifRange: "ExternalTemperature",
        storageNr: "any",
        vifCombinables: [-1], // accept any combinable
      },
    },
    {
      kind: "numeric",
      name: "min_external_temperature",
      description: "The lowest external temperature outside of the meter.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Minimum",
        vifRange: "ExternalTemperature",
      },
    },
    {
      kind: "numeric",
      name: "max_flow",
      description: "The maximum flow recorded during previous period.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Maximum",
        vifRange: "VolumeFlow",
        storageNr: "any",
      },
    },
    {
      kind: "string",
      name: "current_status",
      description: "Status of meter. This field will go away use status instead.",
      properties: ["DEPRECATED"],
      match: { difVifKey: "02FF20" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0x000f,
            defaultMessage: "",
            map: [
              { value: 0x01, text: "DRY" },
              { value: 0x02, text: "REVERSE" },
              { value: 0x04, text: "LEAK" },
              { value: 0x08, text: "BURST" },
            ],
          },
        ],
      },
    },
    {
      kind: "string",
      name: "time_dry",
      description: "Amount of time the meter has been dry.",
      match: { difVifKey: "02FF20" },
      lookup: {
        rules: [
          {
            name: "DRY",
            mapType: "IndexToString",
            maskBits: 0x0070,
            defaultMessage: "",
            map: [
              { value: 0x0000, text: "" },
              { value: 0x0010, text: "1-8 hours" },
              { value: 0x0020, text: "9-24 hours" },
              { value: 0x0030, text: "2-3 days" },
              { value: 0x0040, text: "4-7 days" },
              { value: 0x0050, text: "8-14 days" },
              { value: 0x0060, text: "15-21 days" },
              { value: 0x0070, text: "22-31 days" },
            ],
          },
        ],
      },
    },
    {
      kind: "string",
      name: "time_reversed",
      description: "Amount of time the meter has been reversed.",
      match: { difVifKey: "02FF20" },
      lookup: {
        rules: [
          {
            name: "REVERSED",
            mapType: "IndexToString",
            maskBits: 0x0380,
            defaultMessage: "",
            map: [
              { value: 0x0000, text: "" },
              { value: 0x0080, text: "1-8 hours" },
              { value: 0x0100, text: "9-24 hours" },
              { value: 0x0180, text: "2-3 days" },
              { value: 0x0200, text: "4-7 days" },
              { value: 0x0280, text: "8-14 days" },
              { value: 0x0300, text: "15-21 days" },
              { value: 0x0380, text: "22-31 days" },
            ],
          },
        ],
      },
    },
    {
      kind: "string",
      name: "time_leaking",
      description: "Amount of time the meter has been leaking.",
      match: { difVifKey: "02FF20" },
      lookup: {
        rules: [
          {
            name: "LEAKING",
            mapType: "IndexToString",
            maskBits: 0x1c00,
            defaultMessage: "",
            map: [
              { value: 0x0000, text: "" },
              { value: 0x0400, text: "1-8 hours" },
              { value: 0x0800, text: "9-24 hours" },
              { value: 0x0c00, text: "2-3 days" },
              { value: 0x1000, text: "4-7 days" },
              { value: 0x1400, text: "8-14 days" },
              { value: 0x1800, text: "15-21 days" },
              { value: 0x1c00, text: "22-31 days" },
            ],
          },
        ],
      },
    },
    {
      kind: "string",
      name: "time_bursting",
      description: "Amount of time the meter has been bursting.",
      match: { difVifKey: "02FF20" },
      lookup: {
        rules: [
          {
            name: "BURSTING",
            mapType: "IndexToString",
            maskBits: 0xe000,
            defaultMessage: "",
            map: [
              { value: 0x0000, text: "" },
              { value: 0x2000, text: "1-8 hours" },
              { value: 0x4000, text: "9-24 hours" },
              { value: 0x6000, text: "2-3 days" },
              { value: 0x8000, text: "4-7 days" },
              { value: 0xa000, text: "8-14 days" },
              { value: 0xc000, text: "15-21 days" },
              { value: 0xe000, text: "22-31 days" },
            ],
          },
        ],
      },
    },
  ],
});
