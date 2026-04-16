// hydroclimav2 — auto-generated registry stub.
// Source: upstream wmbusmeters driver.
//
// Registers the driver with correct MVTs and library fields so the registry
// resolves its name. Specialised field extraction + mfct-specific quirks are
// not yet ported; production traffic will populate the standard library
// fields and fall back to auto-driver behaviour for anything non-standard.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const hydroclimav2 = defineDriver({
  name: "hydroclimav2",
  meterType: "HeatCostAllocationMeter",
  linkModes: ["T1"],
  mvt: [
    { manufacturer: flagToManufacturer("BMP"), version: 0x99, type: 0x99 },
    { manufacturer: flagToManufacturer("BMP"), version: 0x53, type: 0x08 },
    { manufacturer: flagToManufacturer("BMP"), version: 0x85, type: 0x08 },
  ],
  defaultFields: "name,id,consumption_hca,status,timestamp",
  libraryFields: ["consumption_hca", "target_hca", "target_date", "meter_datetime"],
  fields: [
    {
      kind: "string",
      name: "status",
      description: "Status and error flags.",
      properties: ["INCLUDE_TPL_STATUS"],
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
