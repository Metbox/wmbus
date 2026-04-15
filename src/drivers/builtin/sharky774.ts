// Diehl Sharky 774 heat meter — registry stub.
import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const sharky774 = defineDriver({
  name: "sharky774",
  meterType: "HeatMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("DME"), version: 0x70, type: 0x04 }],
  defaultFields: "name,id,total_kwh,total_volume_m3,timestamp",
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
    {
      kind: "numeric",
      name: "total_volume",
      description: "Total volume.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
  ],
});
