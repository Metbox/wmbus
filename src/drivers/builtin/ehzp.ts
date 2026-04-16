// EMH ehzp electricity meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_ehzp.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const EMH = flagToManufacturer("EMH");

export const ehzp = defineDriver({
  name: "ehzp",
  meterType: "ElectricityMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: EMH, version: 0x02, type: 0x02 }],
  defaultFields:
    "name,id,total_energy_consumption_kwh,current_power_consumption_kw,total_energy_production_kwh,timestamp",
  libraryFields: ["on_time_h"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status; includes TPL status byte.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
    },
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
      name: "current_power_consumption",
      description: "Current power consumption.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyPowerVIF" },
    },
    {
      kind: "numeric",
      name: "total_energy_production",
      description: "Total energy production (backward flow).",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        vifCombinables: [0x3c], // BackwardFlow
      },
    },
  ],
});
