// Itron ITW heat meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/itronheat.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const ITW = flagToManufacturer("ITW");

export const itronheat = defineDriver({
  name: "itronheat",
  meterType: "HeatMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: ITW, version: 0x00, type: 0x04 }],
  defaultFields: "name,id,status,total_kwh,timestamp",
  libraryFields: ["meter_datetime"],
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
    {
      kind: "string",
      name: "last_year_date",
      description: "Last day of previous billing year.",
      match: { measurementType: "Instantaneous", vifRange: "Date", storageNr: 1 },
    },
    {
      kind: "numeric",
      name: "last_year",
      description: "Heat energy at end of previous year.",
      quantity: "Energy",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "AnyEnergyVIF", storageNr: 1 },
    },
  ],
});
