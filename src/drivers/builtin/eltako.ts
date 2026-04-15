// Eltako electricity meter driver — registry-only stub.
//
// Port from vendor/wmbusmeters@af48083/drivers/src/eltako.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const eltako = defineDriver({
  name: "eltako",
  meterType: "ElectricityMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("ELT"), version: 0x02, type: 0x37 }],
  defaultFields: "name,id,total_energy_consumption_kwh,timestamp",
  libraryFields: [],
  fields: [
    {
      kind: "numeric",
      name: "total_energy_consumption",
      description: "Total electricity consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
  ],
});
