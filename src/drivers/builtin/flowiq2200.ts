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
// Kamstrup FlowIQ 2200 water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_flowiq2200.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const KAM = flagToManufacturer("KAM");

export const flowiq2200 = defineDriver({
  name: "flowiq2200",
  meterType: "WaterMeter",
  linkModes: ["C1"],
  mvt: [
    { manufacturer: KAM, version: 0x16, type: 0x16 },
    { manufacturer: KAM, version: 0x06, type: 0x18 },
    { manufacturer: KAM, version: 0x16, type: 0x18 },
    { manufacturer: KAM, version: 0x16, type: 0x1f },
  ],
  defaultFields:
    "name,id,status,total_m3,target_m3,target_date,flow_m3h," +
    "min_flow_temperature_c,max_flow_temperature_c,min_external_temperature_c," +
    "max_flow_m3h,min_flow_m3h,max_external_temperature_c,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status.",
      properties: ["STATUS"],
      match: { difVifKey: "04FF23" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffffffff,
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
      description: "Total water consumption.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
    {
      kind: "numeric",
      name: "target",
      description: "Water consumption at the beginning of this month.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 1 },
    },
    {
      kind: "string",
      name: "target_date",
      description: "Date at the beginning of this month.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "flow",
      description: "Current flow.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "VolumeFlow" },
    },
    {
      kind: "numeric",
      name: "min_flow_temperature",
      description: "Minimum water temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Minimum",
        vifRange: "FlowTemperature",
        storageNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "max_flow_temperature",
      description: "Maximum water temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Maximum",
        vifRange: "FlowTemperature",
        storageNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "min_external_temperature",
      description: "External temperature (storage 2).",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Minimum",
        vifRange: "ExternalTemperature",
        storageNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "max_flow",
      description: "Maximum flow (storage 2).",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Maximum",
        vifRange: "VolumeFlow",
        storageNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "min_flow",
      description: "Minimum flow (storage 2).",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Minimum",
        vifRange: "VolumeFlow",
        storageNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "max_external_temperature",
      description: "Maximum external temperature (storage 1).",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Maximum",
        vifRange: "ExternalTemperature",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "min_external_temperature",
      description: "Minimum external temperature (storage 1).",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Minimum",
        vifRange: "ExternalTemperature",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "max_flow",
      description: "Maximum flow (storage 1).",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Maximum",
        vifRange: "VolumeFlow",
        storageNr: 1,
      },
    },
  ],
});
