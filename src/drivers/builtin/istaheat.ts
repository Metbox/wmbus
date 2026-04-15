// Ista heat meter — registry stub.
import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const istaheat = defineDriver({
  name: "istaheat",
  meterType: "HeatMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("IST"), version: 0xa0, type: 0x04 }],
  defaultFields: "name,id,total_kwh,timestamp",
  libraryFields: ["meter_datetime", "fabrication_no"],
  fields: [
    {
      kind: "numeric",
      name: "total",
      description: "Total energy.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
  ],
});
