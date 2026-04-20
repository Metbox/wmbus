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
// Sensus iPerl water meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/iperl.xmq.
//
// Manufacturer: Sensus (SEN, 0x4CAE)
// MVTs: 0x68/0x06, 0x68/0x07, 0x7C/0x07.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const SEN = flagToManufacturer("SEN");

export const iperl = defineDriver({
  name: "iperl",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: SEN, version: 0x68, type: 0x06 },
    { manufacturer: SEN, version: 0x68, type: 0x07 },
    { manufacturer: SEN, version: 0x7c, type: 0x07 },
  ],
  defaultFields: "name,id,total_m3,max_flow_m3h,timestamp",
  fields: [
    {
      kind: "numeric",
      name: "total",
      description: "The total water consumption.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
      },
    },
    {
      kind: "numeric",
      name: "max_flow",
      description: "The maximum water flow recorded during previous period.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "VolumeFlow",
      },
    },
  ],
});
