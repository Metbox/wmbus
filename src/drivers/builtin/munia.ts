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
// Weptech Munia temperature / humidity sensor driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_munia.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const WEP = flagToManufacturer("WEP");

export const munia = defineDriver({
  name: "munia",
  meterType: "TempHygroMeter",
  linkModes: [],
  mvt: [
    { manufacturer: WEP, version: 0x02, type: 0x1b },
    { manufacturer: WEP, version: 0x04, type: 0x1b },
  ],
  defaultFields: "name,id,current_temperature_c,current_relative_humidity_rh,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from error flags + TPL status byte.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { difVifKey: "02FD971D" },
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
  ],
});
