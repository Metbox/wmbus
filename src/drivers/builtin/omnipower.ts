// Kamstrup Omnipower electricity meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_omnipower.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const KAM = flagToManufacturer("KAM");
const BWD = 0x3c; // VIFCombinable::BackwardFlow

export const omnipower = defineDriver({
  name: "omnipower",
  meterType: "ElectricityMeter",
  linkModes: ["C1"],
  mvt: [{ manufacturer: KAM, version: 0x02, type: 0x30 }],
  defaultFields:
    "name,id,total_energy_consumption_kwh,total_energy_production_kwh," +
    "current_power_consumption_kw,current_power_production_kw,timestamp",
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
      name: "total_energy_production",
      description: "Total energy production (backward flow).",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        vifCombinables: [BWD],
      },
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
      name: "current_power_production",
      description: "Current power production (backward flow).",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyPowerVIF",
        vifCombinables: [BWD],
      },
    },
  ],
});
