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
// Elvaco Sense 100W/200W/300W room sensor driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/elvsense.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const ELV = flagToManufacturer("ELV");

export const elvsense = defineDriver({
  name: "elvsense",
  meterType: "TempHygroMeter",
  linkModes: ["C1", "T1"],
  mvt: [
    { manufacturer: ELV, version: 0x50, type: 0x1b },
    { manufacturer: ELV, version: 0x51, type: 0x1b },
    { manufacturer: ELV, version: 0x52, type: 0x1b },
    { manufacturer: ELV, version: 0x53, type: 0x1b },
    { manufacturer: ELV, version: 0x54, type: 0x1b },
  ],
  defaultFields: "name,id,temperature_c,humidity_rh,co2_ppm,battery_v,status,timestamp",
  fields: [
    {
      kind: "numeric",
      name: "temperature",
      description: "Instantaneous room temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "ExternalTemperature" },
    },
    {
      kind: "numeric",
      name: "battery",
      description: "Battery voltage.",
      quantity: "Voltage",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Voltage" },
    },
    {
      kind: "numeric",
      name: "humidity",
      description: "Relative humidity (200W/300W).",
      quantity: "RH",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "RelativeHumidity" },
    },
    {
      kind: "numeric",
      name: "co2",
      description: "CO₂ concentration (300W).",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "PPM",
      match: { difVifKey: "027C03324F43" },
    },
    {
      kind: "string",
      name: "status",
      description: "Sensor status and error flags.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
    },
  ],
});
