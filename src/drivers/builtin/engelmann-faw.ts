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
// Engelmann FAW water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_engelmann-faw.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const EFE = flagToManufacturer("EFE");

export const engelmannFaw = defineDriver({
  name: "engelmann-faw",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: EFE, version: 0x00, type: 0x07 }],
  defaultFields: "name,id,status,reporting_date,consumption_at_reporting_date_m3,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xff,
            defaultMessage: "OK",
            map: [
              { value: 0x01, text: "VOLUME_DETECTION_COILS_DEFECT" },
              { value: 0x02, text: "RESET" },
              { value: 0x04, text: "CRC_ERROR" },
              { value: 0x08, text: "REMOVAL_DETECTED" },
              { value: 0x10, text: "MAGNETIC_MANIPULATION" },
              { value: 0x20, text: "LEAKAGE" },
              { value: 0x40, text: "BLOCKED" },
              { value: 0x80, text: "REVERSE_FLOW" },
            ],
          },
        ],
      },
    },
    {
      kind: "string",
      name: "reporting_date",
      description: "Last billing period date.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "consumption_at_reporting_date",
      description: "Water consumption at the billing period date.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 1 },
    },
  ],
  postprocess(ctx) {
    // Storage 2..16 are monthly history entries: storage N → consumption_{N-1}_months_ago.
    for (const entry of ctx.dvEntries) {
      if (
        entry.measurementType === "Instantaneous" &&
        entry.storageNr >= 2 &&
        entry.storageNr <= 16 &&
        typeof entry.asNumber === "number"
      ) {
        const lowVif = entry.vif & 0x7f;
        if (lowVif < 0x10 || lowVif > 0x17) continue;
        const exp = lowVif - 0x10 - 6;
        const m3 = Math.round(entry.asNumber * 10 ** exp * 1000) / 1000;
        ctx.output[`consumption_${entry.storageNr - 1}_months_ago_m3`] = m3;
      }
    }
  },
});
