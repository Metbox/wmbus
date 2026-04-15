// Maddalena water meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/maddalena.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const MAD = flagToManufacturer("MAD");

export const maddalena = defineDriver({
  name: "maddalena",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: MAD, version: 0x01, type: 0x07 },
    { manufacturer: MAD, version: 0x01, type: 0x06 },
  ],
  defaultFields: "name,id,status,total_m3,timestamp",
  libraryFields: ["target_m3", "target_date", "total_m3", "fabrication_no", "meter_datetime"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["INCLUDE_TPL_STATUS"],
      match: {
        measurementType: "Instantaneous",
        vifRange: "ErrorFlags",
      },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0xffff,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },
  ],
});
