// Fio water meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/fiowater.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const FIO = flagToManufacturer("FIO");

export const fiowater = defineDriver({
  name: "fiowater",
  meterType: "WaterMeter",
  linkModes: ["C1"],
  mvt: [{ manufacturer: FIO, version: 0x01, type: 0x07 }],
  defaultFields: "name,id,status,total_m3,timestamp",
  libraryFields: ["total_m3", "meter_datetime"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Meter status from TPL status byte.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
    },
  ],
});
