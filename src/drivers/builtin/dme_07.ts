// Diehl DME_07 water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_dme_07.cc.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const DME = flagToManufacturer("DME");

export const dme_07 = defineDriver({
  name: "dme_07",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: DME, version: 0x07, type: 0x7b }],
  defaultFields: "name,id,total_m3,status,timestamp",
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status of meter.",
      properties: ["STATUS"],
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
