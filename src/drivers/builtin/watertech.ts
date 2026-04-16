// Watertech water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_watertech.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const WTT = flagToManufacturer("WTT");

export const watertech = defineDriver({
  name: "watertech",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: WTT, version: 0x07, type: 0x59 }],
  defaultFields: "name,id,status,total_m3,timestamp",
  libraryFields: ["software_version", "meter_datetime"],
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
    {
      kind: "numeric",
      name: "total",
      description: "Total water consumption.",
      quantity: "Volume",
      scaling: "Auto",
      signedness: "Signed",
      match: { measurementType: "Instantaneous", vifRange: "Volume" },
    },
  ],
});
