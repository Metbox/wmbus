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
// eQ-3 CMA12W room sensor driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_cma12w.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const ELV = flagToManufacturer("ELV");

export const cma12w = defineDriver({
  name: "cma12w",
  meterType: "TempHygroMeter",
  linkModes: ["C1", "T1"],
  mvt: [{ manufacturer: ELV, version: 0x20, type: 0x1b }],
  defaultFields: "name,id,current_temperature_c,timestamp",
  libraryFields: ["software_version"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from TPL status byte.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
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
      kind: "string",
      name: "battery",
      description: "Battery status.",
      match: { measurementType: "Instantaneous", vifRange: "DigitalInput" },
      lookup: {
        rules: [
          {
            name: "BATTERY",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "",
            map: [],
          },
        ],
      },
    },
  ],
});
