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
// Diehl Aerius gas meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_aerius.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const DME = flagToManufacturer("DME");

// VIFCombinable::ValueAtBaseCondC = 0x3e.
const AT_BASE_COND = 0x3e;

export const aerius = defineDriver({
  name: "aerius",
  meterType: "GasMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: DME, version: 0x30, type: 0x03 }],
  defaultFields: "name,id,total_m3,timestamp",
  fields: [
    {
      kind: "numeric",
      name: "total",
      description: "Total gas consumption (base condition).",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        vifCombinables: [AT_BASE_COND],
      },
    },
    {
      kind: "numeric",
      name: "flow",
      description: "Current gas flow.",
      quantity: "Flow",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "VolumeFlow" },
    },
    {
      kind: "numeric",
      name: "temperature",
      description: "Current temperature.",
      quantity: "Temperature",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "FlowTemperature" },
    },
    {
      kind: "string",
      name: "target_datetime",
      description: "Previous billing period end (date + time).",
      match: {
        measurementType: "Instantaneous",
        vifRange: "DateTime",
        storageNr: 3,
      },
    },
    {
      kind: "numeric",
      name: "target",
      description: "Total gas at previous billing period end.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "Volume",
        storageNr: 3,
        vifCombinables: [AT_BASE_COND],
      },
    },
  ],
});
