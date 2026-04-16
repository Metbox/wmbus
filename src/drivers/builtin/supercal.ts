// Sontex Supercal heat meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/supercal.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const supercal = defineDriver({
  name: "supercal",
  meterType: "HeatMeter",
  linkModes: ["C1", "T1"],
  mvt: [{ manufacturer: flagToManufacturer("SON"), version: 0x1b, type: 0x04 }],
  defaultFields: "name,id,total_kwh,timestamp",
  libraryFields: [
    "meter_datetime",
    "flow_temperature_c",
    "return_temperature_c",
    "volume_flow_m3h",
  ],
  fields: [
    {
      kind: "numeric",
      name: "total",
      description: "Total energy consumption.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF" },
    },
    {
      kind: "numeric",
      name: "total",
      description: "Total volume of heating media.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
    {
      kind: "numeric",
      name: "target",
      description: "Energy at end of billing period.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: {
        measurementType: "Instantaneous",
        vifRange: "AnyEnergyVIF",
        storageNr: 20,
      },
    },
    {
      kind: "numeric",
      name: "target",
      description: "Volume at end of billing period.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume", storageNr: 20 },
    },
    {
      kind: "string",
      name: "target_date",
      description: "End of billing period.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 20 },
    },
    {
      kind: "numeric",
      name: "power",
      description: "Current power.",
      quantity: "Power",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyPowerVIF" },
    },
  ],
});
