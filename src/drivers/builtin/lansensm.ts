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
// Lansen smoke detector driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_lansensm.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const LAS = flagToManufacturer("LAS");

export const lansensm = defineDriver({
  name: "lansensm",
  meterType: "SmokeDetector",
  linkModes: ["T1"],
  mvt: [{ manufacturer: LAS, version: 0x03, type: 0x1a }],
  defaultFields: "name,id,status,minutes_since_last_manual_test_counter,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from error flags + TPL status byte.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: {
        measurementType: "Instantaneous",
        vifRange: "ErrorFlags",
        // VIFCombinable::StandardConformantDataContent = 0x1d.
        vifCombinables: [0x1d],
      },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: [
              { value: 0x0002, text: "LOW_BATTERY" },
              { value: 0x0004, text: "SMOKE" },
              { value: 0x0008, text: "MANUAL_TEST" },
              { value: 0x0010, text: "MALFUNCTION" },
              { value: 0x0020, text: "NO_CONNECTION_TO_SMOKE_DETECTOR" },
              { value: 0x0100, text: "SMOKE_SENSOR_END_OF_LIFE" },
            ],
          },
        ],
      },
    },
    {
      kind: "numeric",
      name: "async_msg_id",
      description: "Unique asynchronous message number.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: { measurementType: "Instantaneous", vifRange: "AccessNumber" },
    },
    {
      kind: "numeric",
      name: "minutes_since_last_manual_test",
      description: "Minutes since last manual test.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: { measurementType: "Instantaneous", vifRange: "Dimensionless" },
    },
  ],
});
