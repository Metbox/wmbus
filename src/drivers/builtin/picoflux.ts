// Ecomess Picoflux AiR water meter driver.
//
// Port of vendor/wmbusmeters@af48083/drivers/src/picoflux.xmq.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const picoflux = defineDriver({
  name: "picoflux",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("ECM"), version: 0x05, type: 0x07 }],
  defaultFields: "name,id,status,total_m3,timestamp",
  libraryFields: ["total_m3", "total_backward_m3", "meter_datetime", "actuality_duration_s"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
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
