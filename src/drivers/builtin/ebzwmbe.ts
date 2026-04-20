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
// eBZ wMB-E electricity meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_ebzwmbe.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const EBZ = flagToManufacturer("EBZ");

export const ebzwmbe = defineDriver({
  name: "ebzwmbe",
  meterType: "ElectricityMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: EBZ, version: 0x01, type: 0x02 }],
  defaultFields:
    "name,id,total_energy_consumption_kwh,current_power_consumption_kw," +
    "current_power_consumption_phase1_kw,current_power_consumption_phase2_kw," +
    "current_power_consumption_phase3_kw,timestamp",
  fields: [
    {
      kind: "numeric",
      name: "total_energy_consumption",
      description: "Total energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
    {
      kind: "numeric",
      name: "current_power_consumption_phase1",
      description: "Current power consumption at phase 1.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { difVifKey: "04A9FF01" },
    },
    {
      kind: "numeric",
      name: "current_power_consumption_phase2",
      description: "Current power consumption at phase 2.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { difVifKey: "04A9FF02" },
    },
    {
      kind: "numeric",
      name: "current_power_consumption_phase3",
      description: "Current power consumption at phase 3.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { difVifKey: "04A9FF03" },
    },
    {
      kind: "string",
      name: "customer",
      description: "Customer name.",
      match: { measurementType: "Instantaneous", vifRange: "Customer" },
    },
  ],
  postprocess(ctx) {
    // Upstream computes current_power_consumption_kw as sum of 3 phases,
    // or null when any phase is missing.
    const p1 = ctx.output.current_power_consumption_phase1_kw;
    const p2 = ctx.output.current_power_consumption_phase2_kw;
    const p3 = ctx.output.current_power_consumption_phase3_kw;
    if (typeof p1 === "number" && typeof p2 === "number" && typeof p3 === "number") {
      ctx.output.current_power_consumption_kw = Math.round((p1 + p2 + p3) * 100000) / 100000;
    } else {
      ctx.output.current_power_consumption_kw = null;
    }
  },
});
