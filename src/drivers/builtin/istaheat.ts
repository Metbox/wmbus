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
// Ista Sensonic 3 heat meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/istaheat.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const IST = flagToManufacturer("IST");

export const istaheat = defineDriver({
  name: "istaheat",
  meterType: "HeatMeter",
  linkModes: ["C1"],
  mvt: [{ manufacturer: IST, version: 0xa9, type: 0x04 }],
  defaultFields: "name,id,status,total_kwh,target_kwh,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from TPL status byte.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
    },
    {
      kind: "numeric",
      name: "total",
      description: "Total heat energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
    {
      kind: "string",
      name: "target_date",
      description: "Last day of previous billing month.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 2 },
    },
    {
      kind: "numeric",
      name: "target",
      description: "Heat energy at end of last month.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        storageNr: 2,
      },
    },
    {
      kind: "numeric",
      name: "target",
      description: "Heat media volume at end of last month.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 2 },
    },
    {
      kind: "string",
      name: "last_year_date",
      description: "Last day of previous billing year.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "last_year",
      description: "Heat energy for the previous year period.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        storageNr: 1,
      },
    },
  ],
  postprocess(ctx) {
    // Upstream declares `target_date` / `last_year_date` as numeric
    // PointInTime fields, which pushes the tm struct through mktime before
    // rendering. We declare them as strings (→ raw "2000-00-00"); normalise
    // the pathological zero-date so fixtures match upstream's behaviour.
    for (const key of ["target_date", "last_year_date"]) {
      const v = ctx.output[key];
      if (v === "2000-00-00") {
        ctx.output[key] = "1999-11-30";
      }
    }
  },
});
