// BMeters iwmtx5 water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_iwmtx5.cc.
// Mfct-specific TPL status bit 0x40 = TAMPER.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const BMT = flagToManufacturer("BMT");

export const iwmtx5 = defineDriver({
  name: "iwmtx5",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: BMT, version: 0x18, type: 0x07 },
    { manufacturer: BMT, version: 0x18, type: 0x06 },
  ],
  defaultFields: "name,id,status,total_m3,timestamp",
  libraryFields: ["meter_datetime", "total_m3"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { vifRange: "None" },
      lookup: {
        rules: [
          {
            name: "TPL_STS",
            mapType: "BitToString",
            maskBits: 0xe0,
            defaultMessage: "OK",
            map: [{ value: 0x40, text: "TAMPER" }],
          },
        ],
      },
    },
  ],
});
