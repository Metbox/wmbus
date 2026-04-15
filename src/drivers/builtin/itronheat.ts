// Itron heat meter — registry stub.
import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const itronheat = defineDriver({
  name: "itronheat",
  meterType: "HeatMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("ITW"), version: 0x00, type: 0x04 }],
  defaultFields: "name,id,total_kwh,timestamp",
  libraryFields: ["meter_datetime"],
  fields: [
    {
      kind: "numeric",
      name: "total",
      description: "Total heat energy.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
    {
      kind: "numeric",
      name: "total",
      description: "Total volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
  ],
});
