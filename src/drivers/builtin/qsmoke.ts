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
// Qundis QSmoke smoke detector driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_qsmoke.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const QDS = flagToManufacturer("QDS");

export const qsmoke = defineDriver({
  name: "qsmoke",
  meterType: "SmokeDetector",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: QDS, version: 0x21, type: 0x1a },
    { manufacturer: QDS, version: 0x23, type: 0x1a },
  ],
  defaultFields: "name,id,status,last_alarm_date,alarm_counter,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter error flags.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
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
      kind: "string",
      name: "last_alarm_date",
      description: "Date of last smoke alarm.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 6 },
    },
    {
      kind: "numeric",
      name: "alarm",
      description: "Number of times the smoke alarm triggered.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Unsigned",
      forceUnit: "COUNTER",
      match: { difVifKey: "81037C034C4123" },
    },
    {
      kind: "string",
      name: "message_datetime",
      description: "Device datetime.",
      match: { measurementType: "Instantaneous", vifRange: "DateTime" },
    },
    {
      kind: "string",
      name: "test_button_last_date",
      description: "Date of last test button press.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 4 },
    },
    {
      kind: "numeric",
      name: "test_button",
      description: "Number of test button presses.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "COUNTER",
      match: { difVifKey: "81027C03495523" },
    },
    {
      kind: "numeric",
      name: "transmission",
      description: "Transmission counter.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Unsigned",
      forceUnit: "COUNTER",
      match: { measurementType: "Instantaneous", vifRange: "AccessNumber" },
    },
    {
      kind: "string",
      name: "at_error_date",
      description: "Date of last error.",
      match: { measurementType: "AtError", vifRange: "Date" },
    },
    {
      kind: "numeric",
      name: "some_sort_of_duration",
      description: "Unknown duration counter.",
      quantity: "Time",
      scaling: "Auto",
      signedness: "Signed",
      match: { difVifKey: "02FDAC7E" },
    },
  ],
});
