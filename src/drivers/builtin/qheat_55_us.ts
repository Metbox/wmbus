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
// qheat_55_us — auto-generated registry stub.
// Source: upstream wmbusmeters driver definition.
//
// Registers the driver with correct MVTs and library fields so the registry
// resolves its name. Specialised field extraction + mfct-specific quirks are
// not yet ported; production traffic will populate the standard library
// fields and fall back to auto-driver behaviour for anything non-standard.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const qheat_55_us = defineDriver({
  name: "qheat_55_us",
  meterType: "HeatMeter",
  linkModes: ["C1", "T1"],
  mvt: [
    { manufacturer: flagToManufacturer("LUG"), version: 0x07, type: 0x04 },
    { manufacturer: flagToManufacturer("LUG"), version: 0x0a, type: 0x04 },
  ],
  defaultFields: "name,id,total_kwh,total_volume_m3,status,timestamp",
  libraryFields: [
    "total_energy_consumption_kwh",
    "total_volume_m3",
    "meter_datetime",
    "flow_temperature_c",
    "return_temperature_c",
    "volume_flow_m3h",
  ],
  fields: [],
});
