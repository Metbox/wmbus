// Sontex Supercom 587 water meter driver.
//
// Port of vendor/wmbusmeters@af48083/src/driver_supercom587.cc.
//
// Manufacturer: SON (Sontex), MVTs: 0x06/0x3C, 0x07/0x3C.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

const SON = flagToManufacturer("SON");

export const supercom587 = defineDriver({
  name: "supercom587",
  meterType: "WaterMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: SON, version: 0x3c, type: 0x06 },
    { manufacturer: SON, version: 0x3c, type: 0x07 },
  ],
  defaultFields: "name,id,total_m3,timestamp",
  libraryFields: ["software_version", "total_m3"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status of meter.",
      properties: ["STATUS", "INCLUDE_TPL_STATUS"],
      match: { measurementType: "Instantaneous", vifRange: "ErrorFlags" },
      lookup: {
        rules: [
          {
            name: "ERROR_FLAGS",
            mapType: "BitToString",
            maskBits: 0x000f,
            defaultMessage: "OK",
            map: [],
          },
        ],
      },
    },
  ],
});
