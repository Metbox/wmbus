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
// Lansen pulse counter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_lansenpu.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const LAS = flagToManufacturer("LAS");

export const lansenpu = defineDriver({
  name: "lansenpu",
  meterType: "PulseCounter",
  linkModes: [],
  mvt: [
    { manufacturer: LAS, version: 0x14, type: 0x00 },
    { manufacturer: LAS, version: 0x1b, type: 0x00 },
    { manufacturer: LAS, version: 0x0b, type: 0x02 },
  ],
  defaultFields: "name,id,status,a_counter,b_counter,timestamp",
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
      name: "a",
      description: "Counter A.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: { difVifKey: "0EFD3A" },
    },
    {
      kind: "numeric",
      name: "b",
      description: "Counter B.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: { difVifKey: "8E40FD3A" },
    },
  ],
});
