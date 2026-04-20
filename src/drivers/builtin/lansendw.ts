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
// Lansen door/window sensor driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_lansendw.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const LAS = flagToManufacturer("LAS");

export const lansendw = defineDriver({
  name: "lansendw",
  meterType: "DoorWindowSensor",
  linkModes: ["T1"],
  mvt: [{ manufacturer: LAS, version: 0x07, type: 0x1d }],
  defaultFields: "name,id,status,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Door/window state.",
      properties: ["STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "DigitalInput" },
      lookup: {
        rules: [
          {
            name: "INPUT_BITS",
            mapType: "IndexToString",
            maskBits: 0xffff,
            defaultMessage: "",
            map: [
              { value: 0x11, text: "CLOSED" },
              { value: 0x55, text: "OPEN" },
            ],
          },
        ],
      },
    },
    {
      kind: "string",
      name: "error_flags",
      description: "Error flags.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      // Telegrams carry combinable 0x1d (StandardConformantDataContent).
      match: {
        measurementType: "Instantaneous",
        vifRange: "ErrorFlags",
        vifCombinables: [0x1d],
      },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "a",
      description: "Open/close counter.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: { measurementType: "Instantaneous", vifRange: "Dimensionless" },
    },
    {
      kind: "numeric",
      name: "b",
      description: "Counter B.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Dimensionless",
        subUnitNr: 1,
      },
    },
  ],
});
