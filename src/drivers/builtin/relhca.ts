// relhca — auto-generated registry stub.
// Source: upstream wmbusmeters driver.
//
// Registers the driver with correct MVTs and library fields so the registry
// resolves its name. Specialised field extraction + mfct-specific quirks are
// not yet ported; production traffic will populate the standard library
// fields and fall back to auto-driver behaviour for anything non-standard.

import { flagToManufacturer } from "../../protocol/manufacturers.js";
import { defineDriver } from "../registry.js";

export const relhca = defineDriver({
  name: "relhca",
  meterType: "HeatCostAllocationMeter",
  linkModes: ["T1"],
  mvt: [{ manufacturer: flagToManufacturer("REL"), version: 0x41, type: 0x00 }],
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
