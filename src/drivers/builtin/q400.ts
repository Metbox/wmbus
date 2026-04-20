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
// Axioma Q400 water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_q400.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const AXI = flagToManufacturer("AXI");
const FWD = 0x3b; // VIFCombinable::ForwardFlow
const BWD = 0x3c; // VIFCombinable::BackwardFlow

export const q400 = defineDriver({
  name: "q400",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: AXI, version: 0x01, type: 0x07 },
    { manufacturer: AXI, version: 0x10, type: 0x07 },
  ],
  defaultFields: "name,id,total_m3,timestamp",
  libraryFields: [
    "meter_datetime",
    "on_time_h",
    "total_m3",
    "total_forward_m3",
    "total_backward_m3",
    "flow_temperature_c",
    "volume_flow_m3h",
  ],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
    },
    {
      kind: "string",
      name: "set_datetime",
      description: "End of previous billing period (date + time).",
      match: {
        measurementType: "Instantaneous",
        vifRange: "DateTime",
        storageNr: 1,
      },
    },
    {
      kind: "numeric",
      name: "consumption_at_set_date",
      description: "Volume at the end of the previous billing period.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "forward_at_set_date",
      description: "Forward volume at the end of the previous billing period.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        storageNr: 1,
        vifCombinables: [FWD],
      },
    },
    {
      kind: "numeric",
      name: "backward_at_set_date",
      description: "Backward volume at the end of the previous billing period.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        storageNr: 1,
        vifCombinables: [BWD],
      },
    },
    {
      kind: "numeric",
      name: "battery",
      description: "Remaining battery percentage.",
      quantity: "Counter",
      scaling: "None",
      signedness: "Signed",
      forceUnit: "PERCENTAGE",
      match: { difVifKey: "01FD74" },
    },
  ],
});
