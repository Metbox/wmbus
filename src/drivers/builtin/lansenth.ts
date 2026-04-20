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
// Lansen temperature/humidity sensor driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_lansenth.cc.
// Mfct TPL status bit 0x40 → SABOTAGE_ENCLOSURE.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const LAS = flagToManufacturer("LAS");

export const lansenth = defineDriver({
  name: "lansenth",
  meterType: "TempHygroMeter",
  linkModes: [],
  mvt: [
    { manufacturer: LAS, version: 0x07, type: 0x1b },
    { manufacturer: LAS, version: 0x09, type: 0x1b },
  ],
  defaultFields: "name,id,current_temperature_c,current_relative_humidity_rh,timestamp",
  libraryFields: ["on_time_h"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from TPL status byte.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
      lookup: {
        rules: [
          {
            name: "TPL_STS",
            mapType: "BitToString",
            maskBits: 0xe0,
            defaultMessage: "OK",
            map: [{ value: 0x40, text: "SABOTAGE_ENCLOSURE" }],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "current_temperature",
      description: "Current temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ExternalTemperature" },
    },
    {
      kind: "numeric",
      name: "current_relative_humidity",
      description: "Current relative humidity.",
      quantity: "RH",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "RelativeHumidity" },
    },
    {
      kind: "numeric",
      name: "average_temperature_1h",
      description: "Average temperature (last hour).",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "ExternalTemperature",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "average_relative_humidity_1h",
      description: "Average relative humidity (last hour).",
      quantity: "RH",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "RelativeHumidity",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "average_temperature_24h",
      description: "Average temperature (last 24h).",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "ExternalTemperature",
        storageNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "average_relative_humidity_24h",
      description: "Average relative humidity (last 24h).",
      quantity: "RH",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "RelativeHumidity",
        storageNr: 2,
      },
    },
  ],
});
